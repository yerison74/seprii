export type ObraFormInputType = 'text' | 'number' | 'decimal' | 'date' | 'textarea' | 'select';

export interface ObraFormCampoDef {
  key: string;
  label: string;
  source: 'obra' | 'contratista';
  input: ObraFormInputType;
  required?: boolean;
  maxLength?: number;
  colSpan?: 1 | 2;
  placeholder?: string;
}

export interface ObraFormAreaDef {
  id: string;
  label: string;
  campos: ObraFormCampoDef[];
}

export const OBRAS_FORM_AREAS: ObraFormAreaDef[] = [
  {
    id: 'plantel',
    label: 'PLANTEL',
    campos: [
      { key: 'codigo', label: 'Código', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'contrato', label: 'Contrato', source: 'obra', input: 'text', maxLength: 9, placeholder: 'xxxx-xxxx' },
      { key: 'nombre', label: 'Nombre', source: 'obra', input: 'text', required: true, colSpan: 2, maxLength: 200 },
      { key: 'nombre_inaugurado', label: 'Nombre inaugurado', source: 'obra', input: 'text', maxLength: 100, colSpan: 2 },
      { key: 'tipo_obra', label: 'Tipo obra', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'nivel', label: 'Nivel', source: 'obra', input: 'text', maxLength: 200 },
      { key: 'descripcion', label: 'Descripción', source: 'obra', input: 'textarea', colSpan: 2 },
      { key: 'no_aula', label: 'No. aula', source: 'obra', input: 'number' },
    ],
  },
  {
    id: 'construccion',
    label: 'CONSTRUCCIÓN',
    campos: [
      { key: 'sorteo', label: 'Sorteo', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'area_construccion', label: 'Área', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'coordinador', label: 'Coordinador', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'supervisor', label: 'Supervisor', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'estado', label: 'Estado', source: 'obra', input: 'select', required: true },
      { key: 'porcentaje_ejecutado', label: '% ejecutado', source: 'obra', input: 'decimal' },
    ],
  },
  {
    id: 'ubicacion',
    label: 'UBICACIÓN',
    campos: [
      { key: 'provincia', label: 'Provincia', source: 'obra', input: 'text', maxLength: 200 },
      { key: 'municipio', label: 'Municipio', source: 'obra', input: 'text', maxLength: 200 },
      { key: 'latitud', label: 'Latitud', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'longitud', label: 'Longitud', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'distrito_minerd_sigede', label: 'Distrito MINERD/SIGEDE', source: 'obra', input: 'text', maxLength: 200, colSpan: 2 },
    ],
  },
  {
    id: 'contratista',
    label: 'CONTRATISTA',
    campos: [
      { key: 'responsable', label: 'Responsable', source: 'contratista', input: 'text', maxLength: 400, colSpan: 2 },
      { key: 'identificacion', label: 'Identificación', source: 'contratista', input: 'text', maxLength: 100 },
      { key: 'telefono1', label: 'Teléfono 1', source: 'contratista', input: 'text', maxLength: 100 },
      { key: 'telefono2', label: 'Teléfono 2', source: 'contratista', input: 'text', maxLength: 100 },
      { key: 'correo', label: 'Correo', source: 'contratista', input: 'text', maxLength: 100, colSpan: 2 },
    ],
  },
  {
    id: 'presupuesto',
    label: 'PRESUPUESTO',
    campos: [
      { key: 'presupuesto_total', label: 'Presupuesto total', source: 'obra', input: 'decimal' },
      { key: 'avance_inicial', label: 'Avance inicial', source: 'obra', input: 'decimal' },
    ],
  },
  {
    id: 'cubicacion',
    label: 'CUBICACIÓN',
    campos: [
      { key: 'numero_ultima_cubicacion', label: 'Núm. última cubicación', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'tipo_ultima_cubicacion', label: 'Tipo última cubicación', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'estatus_ultima_cubicacion', label: 'Estatus última cubicación', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'grupo_ultimo_estatus_cubicacion', label: 'Grupo último estatus', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'total_ultima_cubicacion', label: 'Total última cubicación', source: 'obra', input: 'decimal' },
      { key: 'ultima_total_cubicado', label: 'Última total cubicado', source: 'obra', input: 'decimal' },
      { key: 'total_cubicado_base', label: 'Total cubicado base', source: 'obra', input: 'decimal' },
      { key: 'total_pagado', label: 'Total pagado', source: 'obra', input: 'decimal' },
    ],
  },
  {
    id: 'tiempos',
    label: 'TIEMPOS',
    campos: [
      { key: 'fecha_detenida', label: 'Fecha detenida', source: 'obra', input: 'date' },
      { key: 'fecha_fin_estimada', label: 'Fecha fin estimada', source: 'obra', input: 'date' },
      { key: 'fecha_inauguracion', label: 'Fecha inauguración', source: 'obra', input: 'date' },
    ],
  },
  {
    id: 'snip',
    label: 'SNIP',
    campos: [
      { key: 'snip', label: 'SNIP', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'envio_snip', label: 'Envío SNIP', source: 'obra', input: 'text', maxLength: 100 },
      { key: 'monto_snip', label: 'Monto SNIP', source: 'obra', input: 'decimal' },
      { key: 'modificacion_snip', label: 'Modificación SNIP', source: 'obra', input: 'text', maxLength: 100 },
    ],
  },
  {
    id: 'observaciones',
    label: 'OBSERVACIONES',
    campos: [
      { key: 'observacion_legal', label: 'Observación legal', source: 'obra', input: 'textarea', colSpan: 2 },
      { key: 'observacion_financiero', label: 'Observación financiero', source: 'obra', input: 'textarea', colSpan: 2 },
    ],
  },
];
