import { supabase } from '../lib/supabase';

/**
 * Convención RRHH: tablas nuevas con prefijo "rrhh_".
 */
export type RrhhFormacionAcademica = {
  id: string;
  colaborador_id: string;
  nivel: string;
  institucion: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RrhhFormacionAcademicaInput = {
  id?: string | null;
  nivel: string;
  institucion: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
};

const TABLA = 'rrhh_formacion_academica';

const SELECT_COLS =
  'id, colaborador_id, nivel, institucion, fecha_inicio, fecha_fin, created_at, updated_at';

/** Normaliza a YYYY-MM (solo mes y año). */
function normalizarMesAnio(value: string | null | undefined): string | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  const match = raw.match(/^(\d{4})-(\d{2})/);
  if (!match) return null;
  return `${match[1]}-${match[2]}`;
}

export const NIVELES_FORMACION = [
  'Primaria',
  'Secundaria',
  'Técnico',
  'Universitario',
  'Especialidad',
  'Maestría',
  'Doctorado',
  'Otro',
] as const;

export const rrhhFormacionAcademicaService = {
  listarPorColaborador: async (colaboradorId: string): Promise<RrhhFormacionAcademica[]> => {
    const cid = (colaboradorId || '').trim();
    if (!cid) return [];

    const { data, error } = await supabase
      .from(TABLA)
      .select(SELECT_COLS)
      .eq('colaborador_id', cid)
      .order('fecha_inicio', { ascending: false, nullsFirst: false });

    if (error) throw error;
    return (data || []) as RrhhFormacionAcademica[];
  },

  /**
   * Sincroniza la lista completa de formaciones de un colaborador:
   * inserta nuevas, actualiza existentes y elimina las que ya no están.
   */
  sincronizarParaColaborador: async (
    colaboradorId: string,
    items: RrhhFormacionAcademicaInput[],
  ): Promise<RrhhFormacionAcademica[]> => {
    const cid = (colaboradorId || '').trim();
    if (!cid) throw new Error('Colaborador inválido.');

    const existentes = await rrhhFormacionAcademicaService.listarPorColaborador(cid);
    const keepIds = new Set(
      items.map((i) => i.id).filter((id): id is string => Boolean(id && String(id).trim())),
    );

    const toDelete = existentes.filter((e) => !keepIds.has(e.id));
    if (toDelete.length > 0) {
      const { error: delErr } = await supabase
        .from(TABLA)
        .delete()
        .in(
          'id',
          toDelete.map((d) => d.id),
        );
      if (delErr) throw delErr;
    }

    const now = new Date().toISOString();
    for (const item of items) {
      const nivel = (item.nivel || '').trim();
      const institucion = (item.institucion || '').trim();
      if (!nivel || !institucion) {
        throw new Error('Cada formación académica requiere nivel e institución.');
      }

      const fechaInicio = normalizarMesAnio(item.fecha_inicio);
      const fechaFin = normalizarMesAnio(item.fecha_fin);
      if (fechaInicio && fechaFin && fechaFin < fechaInicio) {
        throw new Error(
          'En formación académica, el mes/año de fin no puede ser anterior al de inicio.',
        );
      }

      const row = {
        colaborador_id: cid,
        nivel,
        institucion,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        updated_at: now,
      };

      if (item.id?.trim()) {
        const { error } = await supabase.from(TABLA).update(row).eq('id', item.id.trim());
        if (error) throw error;
      } else {
        const { error } = await supabase.from(TABLA).insert(row);
        if (error) throw error;
      }
    }

    return rrhhFormacionAcademicaService.listarPorColaborador(cid);
  },
};
