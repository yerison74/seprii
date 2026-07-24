/**
 * Áreas y campos del Reporte de Obras (fila verde = área, columnas = ítems).
 * source: 'obra' | 'contratista'
 */

export type ReporteCampoSource = 'obra' | 'contratista';

export interface ReporteCampoDef {
  key: string;
  label: string;
  source: ReporteCampoSource;
  /** Formato de presentación */
  format?: 'text' | 'number' | 'percent' | 'currency' | 'date';
}

export interface ReporteAreaDef {
  id: string;
  label: string;
  campos: ReporteCampoDef[];
}

export const REPORTE_OBRAS_AREAS: ReporteAreaDef[] = [
  {
    id: 'plantel',
    label: 'PLANTEL',
    campos: [
      { key: 'codigo', label: 'Código', source: 'obra' },
      { key: 'contrato', label: 'Contrato', source: 'obra' },
      { key: 'nombre', label: 'Nombre', source: 'obra' },
      { key: 'nombre_inaugurado', label: 'Nombre inaugurado', source: 'obra' },
      { key: 'tipo_obra', label: 'Tipo obra', source: 'obra' },
      { key: 'nivel', label: 'Nivel', source: 'obra' },
      { key: 'descripcion', label: 'Descripción', source: 'obra' },
      { key: 'no_aula', label: 'No. aula', source: 'obra', format: 'number' },
    ],
  },
  {
    id: 'construccion',
    label: 'CONSTRUCCIÓN',
    campos: [
      { key: 'sorteo', label: 'Sorteo', source: 'obra' },
      { key: 'area_construccion', label: 'Área', source: 'obra' },
      { key: 'coordinador', label: 'Coordinador', source: 'obra' },
      { key: 'supervisor', label: 'Supervisor', source: 'obra' },
      { key: 'estado', label: 'Estado', source: 'obra' },
      { key: 'porcentaje_ejecutado', label: '% ejecutado', source: 'obra', format: 'percent' },
    ],
  },
  {
    id: 'ubicacion',
    label: 'UBICACIÓN',
    campos: [
      { key: 'provincia', label: 'Provincia', source: 'obra' },
      { key: 'municipio', label: 'Municipio', source: 'obra' },
      { key: 'latitud', label: 'Latitud', source: 'obra' },
      { key: 'longitud', label: 'Longitud', source: 'obra' },
      { key: 'distrito_minerd_sigede', label: 'Distrito MINERD/SIGEDE', source: 'obra' },
    ],
  },
  {
    id: 'contratista',
    label: 'CONTRATISTA',
    campos: [
      { key: 'responsable', label: 'Responsable', source: 'contratista' },
      { key: 'identificacion', label: 'Identificación', source: 'contratista' },
      { key: 'telefono1', label: 'Teléfono 1', source: 'contratista' },
      { key: 'telefono2', label: 'Teléfono 2', source: 'contratista' },
      { key: 'correo', label: 'Correo', source: 'contratista' },
    ],
  },
  {
    id: 'presupuesto',
    label: 'PRESUPUESTO',
    campos: [
      { key: 'presupuesto_total', label: 'Presupuesto total', source: 'obra', format: 'currency' },
      { key: 'avance_inicial', label: 'Avance inicial', source: 'obra', format: 'currency' },
    ],
  },
  {
    id: 'cubicacion',
    label: 'CUBICACIÓN',
    campos: [
      { key: 'numero_ultima_cubicacion', label: 'Núm. última cubicación', source: 'obra' },
      { key: 'tipo_ultima_cubicacion', label: 'Tipo última cubicación', source: 'obra' },
      { key: 'estatus_ultima_cubicacion', label: 'Estatus última cubicación', source: 'obra' },
      { key: 'grupo_ultimo_estatus_cubicacion', label: 'Grupo último estatus', source: 'obra' },
      { key: 'total_ultima_cubicacion', label: 'Total última cubicación', source: 'obra', format: 'currency' },
      { key: 'ultima_total_cubicado', label: 'Última total cubicado', source: 'obra', format: 'currency' },
      { key: 'total_cubicado_base', label: 'Total cubicado base', source: 'obra', format: 'currency' },
      { key: 'total_pagado', label: 'Total pagado', source: 'obra', format: 'currency' },
    ],
  },
  {
    id: 'tiempos',
    label: 'TIEMPOS',
    campos: [
      { key: 'fecha_detenida', label: 'Fecha detenida', source: 'obra', format: 'date' },
      { key: 'fecha_fin_estimada', label: 'Fecha fin estimada', source: 'obra', format: 'date' },
      { key: 'fecha_inauguracion', label: 'Fecha inauguración', source: 'obra', format: 'date' },
    ],
  },
  {
    id: 'snip',
    label: 'SNIP',
    campos: [
      { key: 'snip', label: 'SNIP', source: 'obra' },
      { key: 'envio_snip', label: 'Envío SNIP', source: 'obra' },
      { key: 'monto_snip', label: 'Monto SNIP', source: 'obra', format: 'currency' },
      { key: 'modificacion_snip', label: 'Modificación SNIP', source: 'obra' },
    ],
  },
  {
    id: 'observaciones',
    label: 'OBSERVACIONES',
    campos: [
      { key: 'observacion_legal', label: 'Observación legal', source: 'obra' },
      { key: 'observacion_financiero', label: 'Observación financiero', source: 'obra' },
    ],
  },
];

/** Todas las columnas del reporte en orden (para tabla y exportación). */
export const REPORTE_OBRAS_COLUMNAS = REPORTE_OBRAS_AREAS.flatMap((area) =>
  area.campos.map((campo) => ({ ...campo, areaId: area.id, areaLabel: area.label })),
);

export function obtenerValorReporteCampo(
  obra: Record<string, unknown>,
  contratista: Record<string, unknown> | null | undefined,
  campo: ReporteCampoDef,
): unknown {
  if (campo.source === 'contratista') {
    return contratista?.[campo.key] ?? null;
  }
  return obra[campo.key] ?? null;
}

export function formatearValorReporte(valor: unknown, format?: ReporteCampoDef['format']): string {
  if (valor == null || valor === '') return '—';
  switch (format) {
    case 'number':
      return String(valor);
    case 'percent': {
      const n = Number(valor);
      return Number.isFinite(n) ? `${n.toFixed(2)}%` : String(valor);
    }
    case 'currency': {
      const n = Number(valor);
      return Number.isFinite(n)
        ? n.toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 2 })
        : String(valor);
    }
    case 'date':
      return String(valor).slice(0, 10);
    default:
      return String(valor);
  }
}
