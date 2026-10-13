import { supabase } from '../lib/supabase';

/**
 * Convención RRHH: tablas nuevas con prefijo "rrhh_".
 */
export type RrhhVacacionEstado = 'Pendiente' | 'Aprobada' | 'Rechazada';

export type RrhhVacacion = {
  id: string;
  colaborador_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias: number;
  estado: RrhhVacacionEstado;
  observaciones?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  colaborador?: {
    id: string;
    nombre: string;
    departamento?: string | null;
    cargo?: string | null;
  } | null;
};

export type RrhhVacacionCreate = {
  colaborador_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  dias?: number;
  estado?: RrhhVacacionEstado;
  observaciones?: string | null;
};

const TABLA = 'rrhh_vacaciones';

const SELECT_COLS = `
  id,
  colaborador_id,
  fecha_inicio,
  fecha_fin,
  dias,
  estado,
  observaciones,
  created_at,
  updated_at,
  colaborador:rrhh_colaboradores!colaborador_id (
    id,
    nombre,
    departamento,
    cargo
  )
`;

/** Fecha local de hoy en formato YYYY-MM-DD. */
export function fechaHoyLocal(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** true si la fecha ISO (YYYY-MM-DD) es anterior a hoy (local). */
export function esFechaPasada(fechaIso: string): boolean {
  const f = (fechaIso || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f)) return false;
  return f < fechaHoyLocal();
}

/** Días calendario inclusivos entre dos fechas ISO (YYYY-MM-DD). */
export function calcularDiasVacacion(fechaInicio: string, fechaFin: string): number {
  const [yi, mi, di] = fechaInicio.split('-').map(Number);
  const [yf, mf, df] = fechaFin.split('-').map(Number);
  if (!yi || !mi || !di || !yf || !mf || !df) return 0;
  const ini = Date.UTC(yi, mi - 1, di);
  const fin = Date.UTC(yf, mf - 1, df);
  if (fin < ini) return 0;
  return Math.floor((fin - ini) / 86_400_000) + 1;
}

function assertFechasNoPasadas(fechaInicio: string, fechaFin: string): void {
  if (esFechaPasada(fechaInicio)) {
    throw new Error('La fecha de inicio no puede ser una fecha pasada.');
  }
  if (esFechaPasada(fechaFin)) {
    throw new Error('La fecha de fin no puede ser una fecha pasada.');
  }
}

function normalizarEstado(estado: unknown): RrhhVacacionEstado {
  if (estado === 'Aprobada' || estado === 'Rechazada' || estado === 'Pendiente') return estado;
  return 'Pendiente';
}

function mapRow(row: Record<string, unknown>): RrhhVacacion {
  const colab = row.colaborador as RrhhVacacion['colaborador'] | RrhhVacacion['colaborador'][] | null;
  const colaborador = Array.isArray(colab) ? colab[0] || null : colab || null;
  return {
    id: String(row.id || ''),
    colaborador_id: String(row.colaborador_id || ''),
    fecha_inicio: String(row.fecha_inicio || ''),
    fecha_fin: String(row.fecha_fin || ''),
    dias: Number(row.dias) || 0,
    estado: normalizarEstado(row.estado),
    observaciones: (row.observaciones as string) || null,
    created_at: (row.created_at as string) || null,
    updated_at: (row.updated_at as string) || null,
    colaborador,
  };
}

export const rrhhVacacionesService = {
  listar: async (): Promise<RrhhVacacion[]> => {
    const { data, error } = await supabase
      .from(TABLA)
      .select(SELECT_COLS)
      .order('fecha_inicio', { ascending: false });

    if (error) throw error;
    return ((data || []) as Record<string, unknown>[]).map(mapRow);
  },

  obtenerPorId: async (id: string): Promise<RrhhVacacion | null> => {
    const vid = (id || '').trim();
    if (!vid) return null;
    const { data, error } = await supabase
      .from(TABLA)
      .select(SELECT_COLS)
      .eq('id', vid)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data as Record<string, unknown>) : null;
  },

  crear: async (payload: RrhhVacacionCreate): Promise<RrhhVacacion> => {
    assertFechasNoPasadas(payload.fecha_inicio, payload.fecha_fin);

    const dias =
      payload.dias && payload.dias > 0
        ? payload.dias
        : calcularDiasVacacion(payload.fecha_inicio, payload.fecha_fin);

    if (dias <= 0) {
      throw new Error('El rango de fechas de vacaciones no es válido.');
    }

    const row = {
      colaborador_id: payload.colaborador_id.trim(),
      fecha_inicio: payload.fecha_inicio,
      fecha_fin: payload.fecha_fin,
      dias,
      estado: payload.estado || 'Pendiente',
      observaciones: payload.observaciones?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLA)
      .insert(row)
      .select(SELECT_COLS)
      .single();

    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  actualizar: async (
    id: string,
    payload: Partial<RrhhVacacionCreate>,
  ): Promise<RrhhVacacion> => {
    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (payload.colaborador_id !== undefined) row.colaborador_id = payload.colaborador_id.trim();
    if (payload.fecha_inicio !== undefined) row.fecha_inicio = payload.fecha_inicio;
    if (payload.fecha_fin !== undefined) row.fecha_fin = payload.fecha_fin;
    if (payload.estado !== undefined) row.estado = payload.estado;
    if (payload.observaciones !== undefined) {
      row.observaciones = payload.observaciones?.trim() || null;
    }

    const needsDias =
      payload.dias !== undefined ||
      payload.fecha_inicio !== undefined ||
      payload.fecha_fin !== undefined;

    if (needsDias || payload.fecha_inicio !== undefined || payload.fecha_fin !== undefined) {
      const existing = await rrhhVacacionesService.obtenerPorId(id);
      if (!existing) throw new Error('Vacación no encontrada.');
      const ini = payload.fecha_inicio ?? existing.fecha_inicio;
      const fin = payload.fecha_fin ?? existing.fecha_fin;
      assertFechasNoPasadas(ini, fin);

      if (payload.dias && payload.dias > 0) {
        row.dias = payload.dias;
      } else {
        const dias = calcularDiasVacacion(ini, fin);
        if (dias <= 0) throw new Error('El rango de fechas de vacaciones no es válido.');
        row.dias = dias;
      }
    }

    const { data, error } = await supabase
      .from(TABLA)
      .update(row)
      .eq('id', id)
      .select(SELECT_COLS)
      .single();

    if (error) throw error;
    return mapRow(data as Record<string, unknown>);
  },

  eliminar: async (id: string): Promise<void> => {
    const { error } = await supabase.from(TABLA).delete().eq('id', id);
    if (error) throw error;
  },
};
