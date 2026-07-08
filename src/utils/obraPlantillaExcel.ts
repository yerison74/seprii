import * as XLSX from 'xlsx';
import type { Obra } from '../types/database';
import {
  PLANTILLA_OBRAS_COLUMNAS,
  PLANTILLA_OBRAS_HEADERS,
  PLANTILLA_OBRAS_EJEMPLO,
  PLANTILLA_OBRAS_COL_WIDTHS,
  PLANTILLA_CONTRATISTA_KEYS,
  PLANTILLA_TIPO_OBRA_VALORES,
} from '../constants/obraPlantillaCarga';

export function valorObraParaPlantilla(obra: Obra, key: string): string | number {
  if (PLANTILLA_CONTRATISTA_KEYS.has(key)) {
    const c = obra.contratista;
    const v = c?.[key as keyof typeof c];
    if (v == null || v === '') return '';
    return typeof v === 'number' ? v : String(v);
  }
  const v = obra[key as keyof Obra];
  if (v == null || v === '') return '';
  if (typeof v === 'object') return '';
  return v as string | number;
}

export function obraAFilaPlantilla(obra: Obra): (string | number)[] {
  return PLANTILLA_OBRAS_COLUMNAS.map((col) => valorObraParaPlantilla(obra, col.key));
}

export function construirWorkbookPlantillaObras(): XLSX.WorkBook {
  const wsObras = XLSX.utils.aoa_to_sheet([PLANTILLA_OBRAS_HEADERS, PLANTILLA_OBRAS_EJEMPLO]);
  wsObras['!cols'] = PLANTILLA_OBRAS_COL_WIDTHS;

  const wsRef = XLSX.utils.aoa_to_sheet([
    ['Grupo', 'Etiqueta', 'Clave (columna Excel)', 'Ejemplo', 'Notas'],
    ...PLANTILLA_OBRAS_COLUMNAS.map((c) => [
      c.grupo,
      c.label,
      c.key,
      c.ejemplo,
      c.key === 'codigo'
        ? 'Obligatorio. Si existe, actualiza la obra.'
        : c.key === 'nombre' || c.key === 'estado'
          ? 'Obligatorio al crear'
          : '',
    ]),
    [],
    ['tipo_obra', `Valores: ${PLANTILLA_TIPO_OBRA_VALORES.join(', ')}`],
    ['distrito_minerd_sigede', 'Formato REG-DIST ej. 01-01 (distrito MINERD/SIGEDE)'],
    ['contrato', 'Formato xxxx-xxxx (9 caracteres)'],
    ['responsable', 'Se guarda en tabla contratistas y vincula la obra'],
  ]);
  wsRef['!cols'] = [{ wch: 18 }, { wch: 28 }, { wch: 28 }, { wch: 22 }, { wch: 40 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsObras, 'Obras');
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referencia');
  return wb;
}

export function construirWorkbookExportObras(obras: Obra[]): XLSX.WorkBook {
  const filas = obras.length > 0 ? obras.map(obraAFilaPlantilla) : [PLANTILLA_OBRAS_EJEMPLO];
  const ws = XLSX.utils.aoa_to_sheet([PLANTILLA_OBRAS_HEADERS, ...filas]);
  ws['!cols'] = PLANTILLA_OBRAS_COL_WIDTHS;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Obras');
  return wb;
}

export function workbookObrasABlob(wb: XLSX.WorkBook): Blob {
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
