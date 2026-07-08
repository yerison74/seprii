import type { Obra, ObrasFilters } from '../types/database';

export interface ObraCampoDestacado {
  key: keyof Obra;
  label: string;
  format?: 'percent' | 'currency' | 'number' | 'text';
}

export interface TechadoModuloDef {
  label: string;
  description: string;
  filtroOr: {
    termino: string;
    columnas: string[];
  };
  camposLista: ObraCampoDestacado[];
  camposDetalle: ObraCampoDestacado[];
  /** Áreas del formulario de obra (ids de OBRAS_FORM_AREAS). */
  areasFormulario: string[];
}

export const TECHADO_MODULO: TechadoModuloDef = {
  label: 'Techado',
  description:
    'Programa de techado escolar: seguimiento de área, avance físico, cubicación y presupuesto por plantel.',
  filtroOr: {
    termino: 'techado',
    columnas: ['descripcion', 'nombre', 'nivel', 'sorteo', 'area_construccion'],
  },
  camposLista: [
    { key: 'area_construccion', label: 'Área' },
    { key: 'porcentaje_ejecutado', label: '% ejecutado', format: 'percent' },
    { key: 'no_aula', label: 'Aulas', format: 'number' },
    { key: 'presupuesto_total', label: 'Presupuesto', format: 'currency' },
  ],
  camposDetalle: [
    { key: 'area_construccion', label: 'Área de techado' },
    { key: 'no_aula', label: 'No. de aulas', format: 'number' },
    { key: 'porcentaje_ejecutado', label: '% ejecutado', format: 'percent' },
    { key: 'presupuesto_total', label: 'Presupuesto total', format: 'currency' },
    { key: 'total_ultima_cubicacion', label: 'Última cubicación', format: 'currency' },
    { key: 'coordinador', label: 'Coordinador' },
    { key: 'supervisor', label: 'Supervisor' },
  ],
  areasFormulario: ['plantel', 'construccion', 'ubicacion', 'contratista', 'presupuesto', 'cubicacion', 'tiempos'],
};

export function filtrosTechadoModulo(): Partial<ObrasFilters> {
  return { moduloBusquedaOr: TECHADO_MODULO.filtroOr };
}

export function formatearValorCampoObra(
  obra: Obra,
  campo: ObraCampoDestacado,
): string | null {
  const raw = obra[campo.key];
  if (raw == null || raw === '') return null;

  switch (campo.format) {
    case 'percent':
      return `${Number(raw).toLocaleString('es-DO', { maximumFractionDigits: 1 })}%`;
    case 'currency':
      return Number(raw).toLocaleString('es-DO', { style: 'currency', currency: 'DOP' });
    case 'number':
      return Number(raw).toLocaleString('es-DO');
    default:
      return String(raw);
  }
}
