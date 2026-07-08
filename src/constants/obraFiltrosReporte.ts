import type { ObrasFilters } from '../types/database';
import { TIPO_OBRA_OPCIONES } from './tipoObra';

export { TIPO_OBRA_OPCIONES };

export type ObraFiltroInputTipo = 'text' | 'number' | 'dateRange' | 'select';

export type ReporteObrasFiltrosState = {
  search: string;
  responsable: string;
  estado: string;
  provincia: string;
  municipio: string;
  nivel: string;
  codigo: string;
  contrato: string;
  nombre: string;
  nombre_inaugurado: string;
  tipo_obra: string;
  descripcion: string;
  no_aula: string;
  sorteo: string;
  area_construccion: string;
  coordinador: string;
  supervisor: string;
  porcentaje_ejecutado: string;
  latitud: string;
  longitud: string;
  distrito_minerd_sigede: string;
  presupuesto_total: string;
  avance_inicial: string;
  numero_ultima_cubicacion: string;
  tipo_ultima_cubicacion: string;
  estatus_ultima_cubicacion: string;
  grupo_ultimo_estatus_cubicacion: string;
  total_ultima_cubicacion: string;
  ultima_total_cubicado: string;
  total_cubicado_base: string;
  total_pagado: string;
  envio_snip: string;
  monto_snip: string;
  modificacion_snip: string;
  observacion_legal: string;
  observacion_financiero: string;
  fechaInicioDesde: string;
  fechaInicioHasta: string;
  fechaDetenidaDesde: string;
  fechaDetenidaHasta: string;
  fechaFinEstimadaDesde: string;
  fechaFinEstimadaHasta: string;
  fechaInauguracionDesde: string;
  fechaInauguracionHasta: string;
};

export interface ObraFiltroCampoDef {
  key: keyof ReporteObrasFiltrosState;
  label: string;
  tipo: ObraFiltroInputTipo;
  /** Solo para dateRange */
  hastaKey?: keyof ReporteObrasFiltrosState;
  /** Solo para select */
  selectKey?: 'estado' | 'tipo_obra';
}

export interface ObraFiltroGrupoDef {
  label: string;
  campos: ObraFiltroCampoDef[];
}

export const REPORTE_OBRAS_FILTRO_GRUPOS: ObraFiltroGrupoDef[] = [
  {
    label: 'PLANTEL',
    campos: [
      { key: 'codigo', label: 'Código', tipo: 'text' },
      { key: 'contrato', label: 'Contrato', tipo: 'text' },
      { key: 'nombre', label: 'Nombre', tipo: 'text' },
      { key: 'nombre_inaugurado', label: 'Nombre inaugurado', tipo: 'text' },
      { key: 'tipo_obra', label: 'Tipo obra', tipo: 'select', selectKey: 'tipo_obra' },
      { key: 'nivel', label: 'Nivel', tipo: 'text' },
      { key: 'descripcion', label: 'Descripción', tipo: 'text' },
      { key: 'no_aula', label: 'No. aula', tipo: 'number' },
    ],
  },
  {
    label: 'CONSTRUCCIÓN',
    campos: [
      { key: 'sorteo', label: 'Sorteo', tipo: 'text' },
      { key: 'area_construccion', label: 'Área construcción', tipo: 'text' },
      { key: 'coordinador', label: 'Coordinador', tipo: 'text' },
      { key: 'supervisor', label: 'Supervisor', tipo: 'text' },
      { key: 'estado', label: 'Estado', tipo: 'select', selectKey: 'estado' },
      { key: 'porcentaje_ejecutado', label: '% ejecutado', tipo: 'number' },
    ],
  },
  {
    label: 'UBICACIÓN',
    campos: [
      { key: 'provincia', label: 'Provincia', tipo: 'text' },
      { key: 'municipio', label: 'Municipio', tipo: 'text' },
      { key: 'latitud', label: 'Latitud', tipo: 'text' },
      { key: 'longitud', label: 'Longitud', tipo: 'text' },
      { key: 'distrito_minerd_sigede', label: 'Distrito MINERD/SIGEDE', tipo: 'text' },
    ],
  },
  {
    label: 'PRESUPUESTO',
    campos: [
      { key: 'presupuesto_total', label: 'Presupuesto total', tipo: 'number' },
      { key: 'avance_inicial', label: 'Avance inicial', tipo: 'number' },
    ],
  },
  {
    label: 'CUBICACIÓN',
    campos: [
      { key: 'numero_ultima_cubicacion', label: 'Núm. última cubicación', tipo: 'text' },
      { key: 'tipo_ultima_cubicacion', label: 'Tipo última cubicación', tipo: 'text' },
      { key: 'estatus_ultima_cubicacion', label: 'Estatus última cubicación', tipo: 'text' },
      { key: 'grupo_ultimo_estatus_cubicacion', label: 'Grupo último estatus', tipo: 'text' },
      { key: 'total_ultima_cubicacion', label: 'Total última cubicación', tipo: 'number' },
      { key: 'ultima_total_cubicado', label: 'Última total cubicado', tipo: 'number' },
      { key: 'total_cubicado_base', label: 'Total cubicado base', tipo: 'number' },
      { key: 'total_pagado', label: 'Total pagado', tipo: 'number' },
    ],
  },
  {
    label: 'TIEMPOS',
    campos: [
      {
        key: 'fechaInicioDesde',
        label: 'Fecha inicio',
        tipo: 'dateRange',
        hastaKey: 'fechaInicioHasta',
      },
      {
        key: 'fechaDetenidaDesde',
        label: 'Fecha detenida',
        tipo: 'dateRange',
        hastaKey: 'fechaDetenidaHasta',
      },
      {
        key: 'fechaFinEstimadaDesde',
        label: 'Fecha fin estimada',
        tipo: 'dateRange',
        hastaKey: 'fechaFinEstimadaHasta',
      },
      {
        key: 'fechaInauguracionDesde',
        label: 'Fecha inauguración',
        tipo: 'dateRange',
        hastaKey: 'fechaInauguracionHasta',
      },
    ],
  },
  {
    label: 'SNIP',
    campos: [
      { key: 'envio_snip', label: 'Envío SNIP', tipo: 'text' },
      { key: 'monto_snip', label: 'Monto SNIP', tipo: 'number' },
      { key: 'modificacion_snip', label: 'Modificación SNIP', tipo: 'text' },
    ],
  },
  {
    label: 'OBSERVACIONES',
    campos: [
      { key: 'observacion_legal', label: 'Observación legal', tipo: 'text' },
      { key: 'observacion_financiero', label: 'Observación financiero', tipo: 'text' },
    ],
  },
];

export const EMPTY_REPORTE_OBRAS_FILTERS: ReporteObrasFiltrosState = {
  search: '',
  responsable: '',
  estado: '',
  provincia: '',
  municipio: '',
  nivel: '',
  codigo: '',
  contrato: '',
  nombre: '',
  nombre_inaugurado: '',
  tipo_obra: '',
  descripcion: '',
  no_aula: '',
  sorteo: '',
  area_construccion: '',
  coordinador: '',
  supervisor: '',
  porcentaje_ejecutado: '',
  latitud: '',
  longitud: '',
  distrito_minerd_sigede: '',
  presupuesto_total: '',
  avance_inicial: '',
  numero_ultima_cubicacion: '',
  tipo_ultima_cubicacion: '',
  estatus_ultima_cubicacion: '',
  grupo_ultimo_estatus_cubicacion: '',
  total_ultima_cubicacion: '',
  ultima_total_cubicado: '',
  total_cubicado_base: '',
  total_pagado: '',
  envio_snip: '',
  monto_snip: '',
  modificacion_snip: '',
  observacion_legal: '',
  observacion_financiero: '',
  fechaInicioDesde: '',
  fechaInicioHasta: '',
  fechaDetenidaDesde: '',
  fechaDetenidaHasta: '',
  fechaFinEstimadaDesde: '',
  fechaFinEstimadaHasta: '',
  fechaInauguracionDesde: '',
  fechaInauguracionHasta: '',
};

export function reporteFiltrosToObrasFilters(state: ReporteObrasFiltrosState): ObrasFilters {
  const out: ObrasFilters = {};
  for (const [k, v] of Object.entries(state)) {
    const trimmed = typeof v === 'string' ? v.trim() : '';
    if (trimmed) {
      (out as Record<string, string>)[k] = trimmed;
    }
  }
  return out;
}

export function contarFiltrosActivos(state: ReporteObrasFiltrosState): number {
  return Object.values(state).filter((v) => v && String(v).trim() !== '').length;
}
