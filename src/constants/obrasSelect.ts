/** Proyección de columnas al consultar obras en Supabase. */
export type ObrasProyeccion = 'listado' | 'reporte' | 'completo';

/** Columnas para listados paginados (Gestión de Obras, Techado). Sin textos largos ni GPS. */
export const OBRAS_COLUMNAS_LISTADO = [
  'id',
  'codigo',
  'contrato',
  'contrato_id',
  'nombre',
  'nombre_inaugurado',
  'tipo_obra',
  'tipo',
  'estado',
  'provincia',
  'municipio',
  'nivel',
  'distrito_minerd_sigede',
  'contratista_id',
  'fecha_inicio',
  'fecha_fin_estimada',
  'fecha_inauguracion',
  'fecha_detenida',
  'no_aula',
  'sorteo',
  'area_construccion',
  'coordinador',
  'supervisor',
  'porcentaje_ejecutado',
  'presupuesto_total',
  'total_ultima_cubicacion',
  'created_at',
  'updated_at',
] as const;

/** Listado + coordenadas para reportes y mapas. */
export const OBRAS_COLUMNAS_REPORTE = [...OBRAS_COLUMNAS_LISTADO, 'latitud', 'longitud'] as const;

export const OBRAS_SELECT_COMPLETO = '*, contratistas(*), contrato_ref:contrato_id(id, no_contrato, lote, contratista_nombre)';
export const OBRAS_SELECT_COMPLETO_INNER = '*, contratistas!inner(*), contrato_ref:contrato_id(id, no_contrato, lote, contratista_nombre)';

export const OBRAS_SELECT_DASHBOARD_PROXIMAS =
  'id, codigo, nombre, estado, fecha_inauguracion, contratista_id, contratistas(responsable)';

const JOIN_CONTRATISTA = 'contratistas(responsable)';
const JOIN_CONTRATISTA_INNER = 'contratistas!inner(responsable)';
const JOIN_CONTRATO = 'contrato_ref:contrato_id(id, no_contrato, lote, contratista_nombre)';

export function columnasObrasProyeccion(proyeccion: ObrasProyeccion): string {
  if (proyeccion === 'completo') return '*';
  const cols = proyeccion === 'reporte' ? OBRAS_COLUMNAS_REPORTE : OBRAS_COLUMNAS_LISTADO;
  return cols.join(', ');
}

export function resolverObrasSelect(
  proyeccion: ObrasProyeccion = 'listado',
  filtroResponsableActivo = false,
): string {
  if (proyeccion === 'completo') {
    return filtroResponsableActivo ? OBRAS_SELECT_COMPLETO_INNER : OBRAS_SELECT_COMPLETO;
  }
  const cols = columnasObrasProyeccion(proyeccion);
  const join = filtroResponsableActivo ? JOIN_CONTRATISTA_INNER : JOIN_CONTRATISTA;
  return `${cols}, ${join}, ${JOIN_CONTRATO}`;
}

/** Select sin join contratistas (fallback si la relación no existe). */
export function resolverObrasSelectSinJoin(proyeccion: ObrasProyeccion = 'listado'): string {
  if (proyeccion === 'completo') return '*';
  return columnasObrasProyeccion(proyeccion);
}
