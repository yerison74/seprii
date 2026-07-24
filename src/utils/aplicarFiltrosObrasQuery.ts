import type { ObrasFilters } from '../types/database';

type FiltroQuery = {
  eq: (column: string, value: unknown) => FiltroQuery;
  ilike: (column: string, pattern: string) => FiltroQuery;
  gte: (column: string, value: string) => FiltroQuery;
  lte: (column: string, value: string) => FiltroQuery;
};

const CAMPOS_TEXTO_ILIKE: Array<keyof ObrasFilters> = [
  'codigo',
  'nombre',
  'nombre_inaugurado',
  'tipo_obra',
  'descripcion',
  'sorteo',
  'area_construccion',
  'coordinador',
  'supervisor',
  'provincia',
  'municipio',
  'nivel',
  'latitud',
  'longitud',
  'distrito_minerd_sigede',
  'numero_ultima_cubicacion',
  'tipo_ultima_cubicacion',
  'estatus_ultima_cubicacion',
  'grupo_ultimo_estatus_cubicacion',
  'snip',
  'envio_snip',
  'modificacion_snip',
  'observacion_legal',
  'observacion_financiero',
];

const CAMPOS_NUMERICO: Array<keyof ObrasFilters> = [
  'no_aula',
  'porcentaje_ejecutado',
  'presupuesto_total',
  'avance_inicial',
  'total_ultima_cubicacion',
  'ultima_total_cubicado',
  'total_cubicado_base',
  'total_pagado',
  'monto_snip',
];

const RANGOS_FECHA: Array<{
  desde: keyof ObrasFilters;
  hasta: keyof ObrasFilters;
  columna: string;
}> = [
  { desde: 'fechaInicioDesde', hasta: 'fechaInicioHasta', columna: 'fecha_inicio' },
  { desde: 'fechaFinEstimadaDesde', hasta: 'fechaFinEstimadaHasta', columna: 'fecha_fin_estimada' },
  { desde: 'fechaDetenidaDesde', hasta: 'fechaDetenidaHasta', columna: 'fecha_detenida' },
  { desde: 'fechaInauguracionDesde', hasta: 'fechaInauguracionHasta', columna: 'fecha_inauguracion' },
];

function parseNumeroFiltro(valor: string): number | null {
  const n = Number(valor.replace(/,/g, '').trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Aplica filtros de obras a una consulta Supabase (tabla obras).
 * `estado` usa ILIKE sin comodines (coincidencia sin distinguir mayúsculas).
 */
export function aplicarFiltrosObrasEnQuery<T extends FiltroQuery>(
  query: T,
  filtros: ObrasFilters,
): T {
  let q = query;

  if (filtros.estado?.trim()) {
    q = q.ilike('estado', filtros.estado.trim()) as T;
  }

  for (const key of CAMPOS_TEXTO_ILIKE) {
    const valor = filtros[key];
    if (typeof valor === 'string' && valor.trim()) {
      q = q.ilike(key, `%${valor.trim()}%`) as T;
    }
  }

  for (const key of CAMPOS_NUMERICO) {
    const valor = filtros[key];
    if (typeof valor === 'string' && valor.trim()) {
      const n = parseNumeroFiltro(valor);
      if (n != null) {
        q = q.eq(key, n) as T;
      }
    }
  }

  for (const rango of RANGOS_FECHA) {
    const desde = filtros[rango.desde];
    const hasta = filtros[rango.hasta];
    if (typeof desde === 'string' && desde.trim()) {
      q = q.gte(rango.columna, desde.trim()) as T;
    }
    if (typeof hasta === 'string' && hasta.trim()) {
      q = q.lte(rango.columna, hasta.trim()) as T;
    }
  }

  return q;
}
