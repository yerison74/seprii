/**
 * Columnas de la plantilla Excel/XML para carga masiva de obras.
 * Alineado con tabla obras + datos de contratista (responsable en tabla contratistas).
 */
import { TIPO_OBRA_OPCIONES } from './tipoObra';

export const PLANTILLA_TIPO_OBRA_VALORES = [...TIPO_OBRA_OPCIONES];

export interface PlantillaColumnaDef {
  key: string;
  label: string;
  ejemplo: string | number;
  ancho?: number;
  grupo: string;
}

export const PLANTILLA_OBRAS_COLUMNAS: PlantillaColumnaDef[] = [
  // PLANTEL
  { grupo: 'PLANTEL', key: 'codigo', label: 'Código', ejemplo: '0001-0001', ancho: 14 },
  { grupo: 'PLANTEL', key: 'contrato', label: 'Contrato', ejemplo: '1234-5678', ancho: 12 },
  { grupo: 'PLANTEL', key: 'lote', label: 'Lote', ejemplo: 1, ancho: 8 },
  { grupo: 'PLANTEL', key: 'nombre', label: 'Nombre', ejemplo: 'Nombre de la obra', ancho: 32 },
  { grupo: 'PLANTEL', key: 'nombre_inaugurado', label: 'Nombre inaugurado', ejemplo: 'Nombre tras inauguración', ancho: 32 },
  { grupo: 'PLANTEL', key: 'tipo_obra', label: 'Tipo obra', ejemplo: 'Techados', ancho: 14 },
  { grupo: 'PLANTEL', key: 'nivel', label: 'Nivel', ejemplo: 'Primario', ancho: 16 },
  { grupo: 'PLANTEL', key: 'descripcion', label: 'Descripción', ejemplo: 'Descripción detallada de la obra', ancho: 40 },
  { grupo: 'PLANTEL', key: 'no_aula', label: 'No. aula', ejemplo: 1, ancho: 10 },
  // CONSTRUCCIÓN
  { grupo: 'CONSTRUCCIÓN', key: 'sorteo', label: 'Sorteo', ejemplo: 'SORTEO-001', ancho: 14 },
  { grupo: 'CONSTRUCCIÓN', key: 'area_construccion', label: 'Área construcción', ejemplo: 'Zona Norte', ancho: 18 },
  { grupo: 'CONSTRUCCIÓN', key: 'coordinador', label: 'Coordinador', ejemplo: 'Nombre coordinador', ancho: 22 },
  { grupo: 'CONSTRUCCIÓN', key: 'supervisor', label: 'Supervisor', ejemplo: 'Nombre supervisor', ancho: 22 },
  { grupo: 'CONSTRUCCIÓN', key: 'estado', label: 'Estado', ejemplo: 'ACTIVA', ancho: 22 },
  { grupo: 'CONSTRUCCIÓN', key: 'porcentaje_ejecutado', label: '% ejecutado', ejemplo: 45.5, ancho: 14 },
  // UBICACIÓN
  { grupo: 'UBICACIÓN', key: 'provincia', label: 'Provincia', ejemplo: 'Santo Domingo', ancho: 20 },
  { grupo: 'UBICACIÓN', key: 'municipio', label: 'Municipio', ejemplo: 'Distrito Nacional', ancho: 22 },
  { grupo: 'UBICACIÓN', key: 'latitud', label: 'Latitud', ejemplo: '18.4861', ancho: 12 },
  { grupo: 'UBICACIÓN', key: 'longitud', label: 'Longitud', ejemplo: '-69.9312', ancho: 12 },
  { grupo: 'UBICACIÓN', key: 'distrito_minerd_sigede', label: 'Distrito MINERD/SIGEDE (REG-DIST)', ejemplo: '01-01', ancho: 22 },
  // CONTRATISTA (tabla contratistas; responsable enlaza la obra)
  { grupo: 'CONTRATISTA', key: 'responsable', label: 'Responsable', ejemplo: 'Empresa o contratista S.R.L.', ancho: 30 },
  { grupo: 'CONTRATISTA', key: 'identificacion', label: 'Identificación', ejemplo: '001-0000000-0', ancho: 18 },
  { grupo: 'CONTRATISTA', key: 'telefono1', label: 'Teléfono 1', ejemplo: '809-000-0000', ancho: 16 },
  { grupo: 'CONTRATISTA', key: 'telefono2', label: 'Teléfono 2', ejemplo: '829-000-0000', ancho: 16 },
  { grupo: 'CONTRATISTA', key: 'correo', label: 'Correo', ejemplo: 'contacto@empresa.com', ancho: 28 },
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

export function generarXmlPlantillaObras(): string {
  const lineas: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<mantenimientos>',
    '  <obra>',
    '    <!-- El id (OB-xxxx / MT-xxxx) lo genera el sistema según tipo_obra -->',
  ];

  let grupoActual = '';
  for (const col of PLANTILLA_OBRAS_COLUMNAS) {
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
