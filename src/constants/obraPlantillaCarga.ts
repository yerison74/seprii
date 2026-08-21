/**
 * Columnas de la plantilla Excel/XML para carga y descarga masiva.
 * Relaciona obras.contrato_id → contrato.id, obras.contratista_id → contratistas.id
 * y adenda.contrato_id / adenda.obra_id.
 */
import { TIPO_OBRA_OPCIONES } from './tipoObra';
import { TIPOS_ADENDA } from './gestionTecnicaDocumento';

export const PLANTILLA_TIPO_OBRA_VALORES = [...TIPO_OBRA_OPCIONES];
export const PLANTILLA_TIPO_ADENDA_VALORES = [...TIPOS_ADENDA];
export const PLANTILLA_ESTADO_ADENDA_VALORES = ['en_curso', 'anterior'] as const;

export interface PlantillaColumnaDef {
  key: string;
  label: string;
  ejemplo: string | number;
  ancho?: number;
  grupo: string;
  nota?: string;
}

export const PLANTILLA_OBRAS_COLUMNAS: PlantillaColumnaDef[] = [
  // PLANTEL (tabla obras)
  {
    grupo: 'PLANTEL',
    key: 'id',
    label: 'ID obra',
    ejemplo: '',
    ancho: 14,
    nota: 'Si existe (OB-xxxx / MT-xxxx), actualiza esa obra. Si no, se crea.',
  },
  {
    grupo: 'PLANTEL',
    key: 'codigo',
    label: 'Código',
    ejemplo: '0001-0001',
    ancho: 14,
    nota: 'SIGEDE. Si no hay ID obra, se usa para buscar/actualizar.',
  },
  {
    grupo: 'PLANTEL',
    key: 'nombre',
    label: 'Nombre',
    ejemplo: 'Nombre de la obra',
    ancho: 32,
    nota: 'Obligatorio al crear.',
  },
  { grupo: 'PLANTEL', key: 'nombre_inaugurado', label: 'Nombre inaugurado', ejemplo: 'Nombre tras inauguración', ancho: 32 },
  { grupo: 'PLANTEL', key: 'tipo_obra', label: 'Tipo obra', ejemplo: 'Techados', ancho: 14 },
  { grupo: 'PLANTEL', key: 'nivel', label: 'Nivel', ejemplo: 'Primario', ancho: 16 },
  { grupo: 'PLANTEL', key: 'descripcion', label: 'Descripción', ejemplo: 'Descripción detallada de la obra', ancho: 40 },
  { grupo: 'PLANTEL', key: 'no_aula', label: 'No. aula', ejemplo: 1, ancho: 10 },
  // CONTRATO (tabla contrato; obras.contrato_id = contrato.id)
  {
    grupo: 'CONTRATO',
    key: 'contrato',
    label: 'No. contrato',
    ejemplo: '1234-5678',
    ancho: 14,
    nota: 'Número del catálogo contrato (xxxx-xxxx). Se resuelve a contrato.id.',
  },
  {
    grupo: 'CONTRATO',
    key: 'lote',
    label: 'Lote',
    ejemplo: 1,
    ancho: 8,
    nota: 'Lote del contrato. Junto con No. contrato identifica el registro en tabla contrato.',
  },
  {
    grupo: 'CONTRATO',
    key: 'contrato_id',
    label: 'ID contrato',
    ejemplo: '',
    ancho: 38,
    nota: 'Opcional. Si se indica, la obra se vincula directo a ese contrato.id.',
  },
  { grupo: 'CONTRATO', key: 'fecha_contrato', label: 'Fecha contrato', ejemplo: '2024-02-01', ancho: 14 },
  { grupo: 'CONTRATO', key: 'estatus_contrato', label: 'Estatus contrato', ejemplo: 'Vigente', ancho: 16 },
  { grupo: 'CONTRATO', key: 'proceso', label: 'Proceso', ejemplo: 'Licitación', ancho: 16 },
  { grupo: 'CONTRATO', key: 'certificacion', label: 'Certificación', ejemplo: 'CERT-001', ancho: 14 },
  { grupo: 'CONTRATO', key: 'presupuesto_centro', label: 'Presupuesto centro', ejemplo: 8000000, ancho: 16 },
  { grupo: 'CONTRATO', key: 'monto_total_contrato', label: 'Monto total contrato', ejemplo: 15000000, ancho: 18 },
  { grupo: 'CONTRATO', key: 'monto_total_inversion', label: 'Monto total inversión', ejemplo: 16000000, ancho: 18 },
  { grupo: 'CONTRATO', key: 'observaciones_contrato', label: 'Observaciones contrato', ejemplo: '', ancho: 32 },
  // CONTRATISTA (tabla contratistas; obras.contratista_id)
  {
    grupo: 'CONTRATISTA',
    key: 'contratista_id',
    label: 'ID contratista',
    ejemplo: '',
    ancho: 38,
    nota: 'Si existe, actualiza ese contratista. Si no y hay nombre, se crea.',
  },
  {
    grupo: 'CONTRATISTA',
    key: 'responsable',
    label: 'Contratista',
    ejemplo: 'Empresa o contratista S.R.L.',
    ancho: 30,
    nota: 'Nombre en tabla contratistas. Vincula obras.contratista_id y contrato.contratista_id.',
  },
  { grupo: 'CONTRATISTA', key: 'identificacion', label: 'Identificación', ejemplo: '001-0000000-0', ancho: 18 },
  { grupo: 'CONTRATISTA', key: 'telefono1', label: 'Teléfono 1', ejemplo: '809-000-0000', ancho: 16 },
  { grupo: 'CONTRATISTA', key: 'telefono2', label: 'Teléfono 2', ejemplo: '829-000-0000', ancho: 16 },
  { grupo: 'CONTRATISTA', key: 'correo', label: 'Correo', ejemplo: 'contacto@empresa.com', ancho: 28 },
  // ADENDA (tabla adenda → contrato_id y obra_id)
  {
    grupo: 'ADENDA',
    key: 'adenda_id',
    label: 'ID adenda',
    ejemplo: '',
    ancho: 38,
    nota: 'Si existe, actualiza esa adenda. Si no, se crea ligada al contrato y a la obra.',
  },
  {
    grupo: 'ADENDA',
    key: 'numero_adenda',
    label: 'No. adenda',
    ejemplo: '01',
    ancho: 12,
    nota: 'Se guarda en tabla adenda ligada al contrato (y a la obra).',
  },
  { grupo: 'ADENDA', key: 'tipo_adenda', label: 'Tipo adenda', ejemplo: 'Equilibrio economico', ancho: 28 },
  { grupo: 'ADENDA', key: 'monto_adenda', label: 'Monto adenda', ejemplo: 500000, ancho: 14 },
  {
    grupo: 'ADENDA',
    key: 'estado_adenda',
    label: 'Estado adenda',
    ejemplo: 'en_curso',
    ancho: 14,
    nota: 'en_curso o anterior. Por defecto en_curso.',
  },
  // CONSTRUCCIÓN
  { grupo: 'CONSTRUCCIÓN', key: 'sorteo', label: 'Sorteo', ejemplo: 'SORTEO-001', ancho: 14 },
  { grupo: 'CONSTRUCCIÓN', key: 'area_construccion', label: 'Área construcción', ejemplo: 'Zona Norte', ancho: 18 },
  { grupo: 'CONSTRUCCIÓN', key: 'coordinador', label: 'Coordinador', ejemplo: 'Nombre coordinador', ancho: 22 },
  { grupo: 'CONSTRUCCIÓN', key: 'supervisor', label: 'Supervisor', ejemplo: 'Nombre supervisor', ancho: 22 },
  { grupo: 'CONSTRUCCIÓN', key: 'estado', label: 'Estado', ejemplo: 'ACTIVA', ancho: 22, nota: 'Obligatorio al crear.' },
  { grupo: 'CONSTRUCCIÓN', key: 'porcentaje_ejecutado', label: '% ejecutado', ejemplo: 45.5, ancho: 14 },
  // UBICACIÓN
  { grupo: 'UBICACIÓN', key: 'provincia', label: 'Provincia', ejemplo: 'Santo Domingo', ancho: 20 },
  { grupo: 'UBICACIÓN', key: 'municipio', label: 'Municipio', ejemplo: 'Distrito Nacional', ancho: 22 },
  { grupo: 'UBICACIÓN', key: 'latitud', label: 'Latitud', ejemplo: '18.4861', ancho: 12 },
  { grupo: 'UBICACIÓN', key: 'longitud', label: 'Longitud', ejemplo: '-69.9312', ancho: 12 },
  {
    grupo: 'UBICACIÓN',
    key: 'distrito_minerd_sigede',
    label: 'Distrito MINERD/SIGEDE (REG-DIST)',
    ejemplo: '01-01',
    ancho: 22,
    nota: 'Formato REG-DIST ej. 01-01.',
  },
  // PRESUPUESTO
  { grupo: 'PRESUPUESTO', key: 'presupuesto_total', label: 'Presupuesto total', ejemplo: 15000000, ancho: 16 },
  { grupo: 'PRESUPUESTO', key: 'avance_inicial', label: 'Avance inicial', ejemplo: 2500000, ancho: 16 },
  // CUBICACIÓN
  { grupo: 'CUBICACIÓN', key: 'numero_ultima_cubicacion', label: 'Núm. última cubicación', ejemplo: 'CUB-001', ancho: 18 },
  { grupo: 'CUBICACIÓN', key: 'tipo_ultima_cubicacion', label: 'Tipo última cubicación', ejemplo: 'Parcial', ancho: 18 },
  { grupo: 'CUBICACIÓN', key: 'estatus_ultima_cubicacion', label: 'Estatus última cubicación', ejemplo: 'Aprobada', ancho: 20 },
  { grupo: 'CUBICACIÓN', key: 'grupo_ultimo_estatus_cubicacion', label: 'Grupo último estatus', ejemplo: 'Grupo A', ancho: 18 },
  { grupo: 'CUBICACIÓN', key: 'total_ultima_cubicacion', label: 'Total última cubicación', ejemplo: 500000, ancho: 18 },
  { grupo: 'CUBICACIÓN', key: 'ultima_total_cubicado', label: 'Última total cubicado', ejemplo: 480000, ancho: 18 },
  { grupo: 'CUBICACIÓN', key: 'total_cubicado_base', label: 'Total cubicado base', ejemplo: 450000, ancho: 18 },
  { grupo: 'CUBICACIÓN', key: 'total_pagado', label: 'Total pagado', ejemplo: 400000, ancho: 14 },
  // TIEMPOS
  { grupo: 'TIEMPOS', key: 'fecha_inicio', label: 'Fecha inicio', ejemplo: '2024-01-01', ancho: 14 },
  { grupo: 'TIEMPOS', key: 'fecha_detenida', label: 'Fecha detenida', ejemplo: '', ancho: 14 },
  { grupo: 'TIEMPOS', key: 'fecha_fin_estimada', label: 'Fecha fin estimada', ejemplo: '2024-12-31', ancho: 16 },
  { grupo: 'TIEMPOS', key: 'fecha_inauguracion', label: 'Fecha inauguración', ejemplo: '2025-06-01', ancho: 16 },
  // SNIP
  { grupo: 'SNIP', key: 'snip', label: 'SNIP', ejemplo: 'SNIP-12345', ancho: 14 },
  { grupo: 'SNIP', key: 'envio_snip', label: 'Envío SNIP', ejemplo: 'ENV-2024-01', ancho: 16 },
  { grupo: 'SNIP', key: 'monto_snip', label: 'Monto SNIP', ejemplo: 12000000, ancho: 14 },
  { grupo: 'SNIP', key: 'modificacion_snip', label: 'Modificación SNIP', ejemplo: 'MOD-001', ancho: 16 },
  // OBSERVACIONES
  { grupo: 'OBSERVACIONES', key: 'observacion_legal', label: 'Observación legal', ejemplo: 'Sin observaciones legales', ancho: 35 },
  { grupo: 'OBSERVACIONES', key: 'observacion_financiero', label: 'Observación financiero', ejemplo: 'Sin observaciones financieras', ancho: 35 },
];

export const PLANTILLA_OBRAS_HEADERS = PLANTILLA_OBRAS_COLUMNAS.map((c) => c.key);

export const PLANTILLA_OBRAS_EJEMPLO: (string | number)[] = PLANTILLA_OBRAS_COLUMNAS.map((c) => c.ejemplo);

export const PLANTILLA_OBRAS_COL_WIDTHS = PLANTILLA_OBRAS_COLUMNAS.map((c) => ({
  wch: c.ancho ?? 18,
}));

/** Claves que se guardan en la tabla contratistas (no en obras). */
export const PLANTILLA_CONTRATISTA_KEYS = new Set([
  'responsable',
  'identificacion',
  'telefono1',
  'telefono2',
  'correo',
]);

/** Claves del catálogo contrato (no se persisten en obras, salvo contrato_id). */
export const PLANTILLA_CONTRATO_KEYS = new Set([
  'lote',
  'fecha_contrato',
  'estatus_contrato',
  'proceso',
  'certificacion',
  'presupuesto_centro',
  'monto_total_contrato',
  'monto_total_inversion',
  'observaciones_contrato',
]);

/** Claves de adenda (tabla adenda). */
export const PLANTILLA_ADENDA_KEYS = new Set([
  'adenda_id',
  'numero_adenda',
  'tipo_adenda',
  'monto_adenda',
  'estado_adenda',
]);

export const PLANTILLA_KEYS_NO_OBRA = new Set<string>([
  'responsable',
  'identificacion',
  'telefono1',
  'telefono2',
  'correo',
  'lote',
  'fecha_contrato',
  'estatus_contrato',
  'proceso',
  'certificacion',
  'presupuesto_centro',
  'monto_total_contrato',
  'monto_total_inversion',
  'observaciones_contrato',
  'adenda_id',
  'numero_adenda',
  'tipo_adenda',
  'monto_adenda',
  'estado_adenda',
]);

export type TablaCarga = 'todo' | 'obras' | 'contratistas' | 'contratos' | 'adendas';

export const TABLAS_CARGA: Array<{ id: TablaCarga; label: string; descripcion: string }> = [
  {
    id: 'todo',
    label: 'Todas las tablas',
    descripcion: 'Sube obra, contratista, contrato y adenda a la vez (una fila = un conjunto relacionado).',
  },
  {
    id: 'obras',
    label: 'Obras',
    descripcion: 'Crea o actualiza obras por ID. También actualiza su contrato, contratista y adenda.',
  },
  {
    id: 'contratistas',
    label: 'Contratistas',
    descripcion: 'Plantilla independiente: no. contrato + datos del contratista. Si el contrato existe se actualiza; si no, se crea.',
  },
  {
    id: 'contratos',
    label: 'Contratos',
    descripcion: 'Crea o actualiza contratos por ID. Si hay obras, las apunta a ese contrato.id.',
  },
  {
    id: 'adendas',
    label: 'Adendas',
    descripcion: 'Crea o actualiza adendas por ID, ligadas al contrato y a la obra.',
  },
];

/** Plantilla independiente de contratistas (carga, descarga y plantilla vacía). */
export const PLANTILLA_CONTRATISTAS_COLUMNAS: PlantillaColumnaDef[] = [
  {
    grupo: 'CONTRATO',
    key: 'no_contrato',
    label: 'No. contrato',
    ejemplo: '1234-5678',
    ancho: 16,
    nota: 'contrato.no_contrato. Identifica el contrato; si existe se actualiza, si no se crea.',
  },
  {
    grupo: 'CONTRATISTA',
    key: 'responsable',
    label: 'Contratista',
    ejemplo: 'Empresa o contratista S.R.L.',
    ancho: 32,
    nota: 'contratistas.responsable. Si existe se actualiza; si no, se crea y se vincula al contrato.',
  },
  {
    grupo: 'CONTRATISTA',
    key: 'identificacion',
    label: 'Identificación',
    ejemplo: '001-0000000-0',
    ancho: 18,
    nota: 'contratistas.identificacion',
  },
  {
    grupo: 'CONTRATISTA',
    key: 'telefono1',
    label: 'Teléfono 1',
    ejemplo: '809-000-0000',
    ancho: 16,
    nota: 'contratistas.telefono1',
  },
  {
    grupo: 'CONTRATISTA',
    key: 'telefono2',
    label: 'Teléfono 2',
    ejemplo: '829-000-0000',
    ancho: 16,
    nota: 'contratistas.telefono2',
  },
  {
    grupo: 'CONTRATISTA',
    key: 'correo',
    label: 'Correo',
    ejemplo: 'contacto@empresa.com',
    ancho: 28,
    nota: 'contratistas.correo',
  },
];

const CLAVES_RELACION = new Set([
  'id',
  'codigo',
  'contrato',
  'lote',
  'contrato_id',
  'contratista_id',
  'responsable',
]);

export function nombreHojaPlantilla(tabla: TablaCarga = 'todo'): string {
  if (tabla === 'contratistas') return 'Contratistas';
  if (tabla === 'contratos') return 'Contratos';
  if (tabla === 'adendas') return 'Adendas';
  return 'Obras';
}

export function columnasPlantillaPorTabla(tabla: TablaCarga = 'todo'): PlantillaColumnaDef[] {
  if (tabla === 'contratistas') return PLANTILLA_CONTRATISTAS_COLUMNAS;
  if (tabla === 'todo' || tabla === 'obras') return PLANTILLA_OBRAS_COLUMNAS;
  if (tabla === 'contratos') {
    return PLANTILLA_OBRAS_COLUMNAS.filter(
      (c) => c.grupo === 'CONTRATO' || CLAVES_RELACION.has(c.key),
    );
  }
  return PLANTILLA_OBRAS_COLUMNAS.filter(
    (c) => c.grupo === 'ADENDA' || CLAVES_RELACION.has(c.key),
  );
}

export function generarXmlPlantillaObras(tabla: TablaCarga = 'todo'): string {
  const columnas = columnasPlantillaPorTabla(tabla);
  if (tabla === 'contratistas') {
    const lineas: string[] = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<contratistas>',
      '  <contratista>',
      '    <!-- contrato.no_contrato identifica el contrato -->',
      '    <!-- Si el contrato o el contratista existen se actualizan; si no, se crean -->',
    ];
    for (const col of columnas) {
      const valor =
        col.ejemplo === '' ? '' : String(col.ejemplo).replace(/&/g, '&amp;').replace(/</g, '&lt;');
      lineas.push(`    <${col.key}>${valor}</${col.key}>`);
    }
    lineas.push('  </contratista>', '</contratistas>');
    return lineas.join('\n');
  }

  const lineas: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mantenimientos>',
    '  <obra>',
    '    <!-- Upsert por ID: si existe actualiza, si no crea -->',
    '    <!-- obras.contrato_id → contrato.id; obras.contratista_id → contratistas.id -->',
  ];

  let grupoActual = '';
  for (const col of columnas) {
    if (col.grupo !== grupoActual) {
      grupoActual = col.grupo;
      lineas.push(`    <!-- ${grupoActual} -->`);
    }
    const valor =
      col.ejemplo === '' ? '' : String(col.ejemplo).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    lineas.push(`    <${col.key}>${valor}</${col.key}>`);
  }

  lineas.push('  </obra>', '</mantenimientos>');
  return lineas.join('\n');
}
