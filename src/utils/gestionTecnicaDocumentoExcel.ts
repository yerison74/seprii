import * as XLSX from 'xlsx';
import type { Adenda, DocumentoTecnicoObra, EstadoAdenda, MovimientoDocumentoTecnicoObra } from '../types/database';
import {
  ADENDAS_EXCEL_COL_WIDTHS,
  ADENDAS_EXCEL_EJEMPLO,
  ADENDAS_EXCEL_HEADERS,
  DOCUMENTOS_EXCEL_COL_WIDTHS,
  DOCUMENTOS_EXCEL_EJEMPLO,
  DOCUMENTOS_EXCEL_HEADERS,
  HOJA_ADENDAS,
  HOJA_DOCUMENTOS,
  HOJA_MOVIMIENTOS,
  MOVIMIENTOS_EXCEL_COL_WIDTHS,
  MOVIMIENTOS_EXCEL_EJEMPLO,
  MOVIMIENTOS_EXCEL_HEADERS,
} from '../constants/gestionTecnicaDocumentoExcel';
import { esEstadoAdendaValido, parseMontoDOP } from '../constants/gestionTecnicaDocumento';

export interface FilaDocumentoExcel {
  solicitud: string;
  cuadrantes?: string;
  no_contrato?: string;
  monto_contrato_base?: number | null;
  tipo_adenda_anterior?: string;
  numero_adenda_anterior?: string | null;
  monto_adenda_anterior?: number | null;
  tipo_adenda?: string;
  numero_adenda_actual?: string | null;
  no_adenda_solicituda?: number | null;
  monto_adenda_solicitada?: number | null;
  monto_total?: number | null;
  observacion?: string;
  contratista?: string;
  id_sigede?: string[];
}

export interface FilaAdendaExcel {
  no_contrato: string;
  numero_adenda: string;
  tipo_adenda?: string;
  monto?: number | null;
  estado?: EstadoAdenda | null;
}

export interface FilaMovimientoExcel {
  solicitud: string;
  fecha_solicitud?: string | null;
  fecha_entrada?: string | null;
  no_tramite?: string | null;
  oficio?: string | null;
  estatus?: string | null;
  departamento?: string | null;
  fecha_salida?: string | null;
  observaciones?: string | null;
}

export interface ResultadoParseoExcel {
  documentos: FilaDocumentoExcel[];
  movimientos: FilaMovimientoExcel[];
  adendas: FilaAdendaExcel[];
}

function normalizarClave(clave: string): string {
  return clave
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function valorCelda(row: Record<string, unknown>, ...claves: string[]): unknown {
  const mapa = new Map<string, unknown>();
  for (const [k, v] of Object.entries(row)) {
    mapa.set(normalizarClave(k), v);
  }
  for (const c of claves) {
    const v = mapa.get(normalizarClave(c));
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return '';
}

function parseExcelFecha(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number' && XLSX.SSF.parse_date_code) {
    const d = XLSX.SSF.parse_date_code(valor);
    if (d) {
      return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`;
    }
  }
  const texto = String(valor).trim();
  if (!texto) return null;
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const dmy = texto.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  }
  return texto.slice(0, 10);
}

function parseNumeroEntero(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = typeof valor === 'number' ? Math.trunc(valor) : parseInt(String(valor).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function parseMontoExcel(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (typeof valor === 'number') {
    return Number.isNaN(valor) ? null : Math.round(valor * 100) / 100;
  }
  return parseMontoDOP(String(valor));
}

function parseSigede(valor: unknown): string[] {
  if (!valor) return [];
  return String(valor)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseEstadoAdendaExcel(valor: unknown): EstadoAdenda | null {
  const texto = String(valor ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (!texto) return null;
  if (texto === 'en_curso' || texto === 'encurso') return 'en_curso';
  if (texto === 'anterior') return 'anterior';
  return esEstadoAdendaValido(texto) ? (texto as EstadoAdenda) : null;
}

function filaADocumento(row: Record<string, unknown>, indice: number): FilaDocumentoExcel | null {
  const solicitud = String(
    valorCelda(row, 'Solicitud', 'Solicitud (nombre del solicitante)') || '',
  ).trim();
  if (!solicitud) return null;

  return {
    solicitud: solicitud.slice(0, 75),
    cuadrantes: String(valorCelda(row, 'Cuadrantes') || '').trim() || undefined,
    no_contrato:
      String(
        valorCelda(row, 'Número de contrato', 'Numero de contrato', 'No. contrato', 'Contrato') || '',
      ).trim() || undefined,
    monto_contrato_base: parseMontoExcel(valorCelda(row, 'Monto contrato base')),
    tipo_adenda_anterior:
      String(valorCelda(row, 'Tipo adenda anterior') || '').trim() || undefined,
    numero_adenda_anterior:
      String(
        valorCelda(
          row,
          'Codigo adenda anterior',
          'Código adenda anterior',
          'No. adenda anterior',
          'Numero adenda anterior',
        ) || '',
      ).trim() || undefined,
    monto_adenda_anterior: parseMontoExcel(valorCelda(row, 'Monto adenda anterior')),
    tipo_adenda: String(valorCelda(row, 'Tipo adenda') || '').trim() || undefined,
    numero_adenda_actual:
      String(
        valorCelda(
          row,
          'Codigo adenda actual',
          'Código adenda actual',
          'No. adenda actual',
          'Numero adenda actual',
        ) || '',
      ).trim() || undefined,
    no_adenda_solicituda: parseNumeroEntero(
      valorCelda(
        row,
        'No. adendas (solicituda)',
        'No adendas solicituda',
        'No. adenda solicitud',
        'No adenda solicitud',
      ),
    ),
    monto_adenda_solicitada: parseMontoExcel(valorCelda(row, 'Monto adenda solicitada')),
    monto_total: parseMontoExcel(valorCelda(row, 'Monto total')),
    observacion: String(valorCelda(row, 'Observación', 'Observacion') || '').trim() || undefined,
    contratista: String(valorCelda(row, 'Contratista') || '').trim() || undefined,
    id_sigede: parseSigede(valorCelda(row, 'ID SIGEDE', 'ID SIGEDE (obra)', 'Sigede')),
  };
}

function filaAAdenda(row: Record<string, unknown>): FilaAdendaExcel | null {
  const noContrato = String(
    valorCelda(row, 'Número de contrato', 'Numero de contrato', 'No. contrato', 'Contrato') || '',
  ).trim();
  const numeroAdenda = String(
    valorCelda(row, 'Código adenda', 'Codigo adenda', 'Numero adenda', 'Número adenda') || '',
  ).trim();
  if (!noContrato || !numeroAdenda) return null;

  return {
    no_contrato: noContrato,
    numero_adenda: numeroAdenda,
    tipo_adenda: String(valorCelda(row, 'Tipo adenda') || '').trim() || undefined,
    monto: parseMontoExcel(valorCelda(row, 'Monto')),
    estado: parseEstadoAdendaExcel(valorCelda(row, 'Estado')),
  };
}

function filaAMovimiento(row: Record<string, unknown>): FilaMovimientoExcel | null {
  const solicitud = String(valorCelda(row, 'Solicitud') || '').trim();
  if (!solicitud) return null;

  const fechaSol = parseExcelFecha(valorCelda(row, 'Fecha solicitud'));
  const fechaEnt = parseExcelFecha(valorCelda(row, 'Fecha entrada'));
  const fechaSal = parseExcelFecha(valorCelda(row, 'Fecha salida'));
  const noTramite = String(valorCelda(row, 'No. trámite', 'No. tramite', 'No tramite') || '').trim();
  const oficio = String(valorCelda(row, 'Oficio') || '').trim();
  const estatus = String(valorCelda(row, 'Estatus', 'Estado') || '').trim();
  const depto = String(valorCelda(row, 'Departamento') || '').trim();
  const observaciones = String(valorCelda(row, 'Observaciones', 'Observación', 'Observacion') || '').trim();

  if (!fechaSol && !fechaEnt && !fechaSal && !noTramite && !oficio && !estatus && !depto && !observaciones) {
    return null;
  }

  return {
    solicitud: solicitud.slice(0, 75),
    fecha_solicitud: fechaSol,
    fecha_entrada: fechaEnt,
    no_tramite: noTramite || null,
    oficio: oficio || null,
    estatus: estatus || null,
    departamento: depto || null,
    fecha_salida: fechaSal,
    observaciones: observaciones || null,
  };
}

export function documentoAFilaExport(doc: DocumentoTecnicoObra): string[] {
  return [
    doc.solicitud,
    doc.cuadrantes || '',
    doc.contrato?.no_contrato || '',
    doc.monto_contrato_base != null ? String(doc.monto_contrato_base) : '',
    doc.tipo_adenda_anterior || '',
    doc.numero_adenda_anterior || '',
    doc.monto_adenda_anterior != null ? String(doc.monto_adenda_anterior) : '',
    doc.tipo_adenda || '',
    doc.numero_adenda_actual || '',
    doc.no_adenda_solicituda != null ? String(doc.no_adenda_solicituda) : '',
    doc.monto_adenda_solicitada != null ? String(doc.monto_adenda_solicitada) : '',
    doc.monto_total != null ? String(doc.monto_total) : '',
    doc.observacion || '',
    doc.contratista?.responsable || '',
    (doc.id_sigede || []).join(', '),
  ];
}

export function adendaAFilaExport(adenda: Adenda): string[] {
  return [
    adenda.contrato?.no_contrato || '',
    adenda.numero_adenda || '',
    adenda.tipo_adenda || '',
    adenda.monto != null ? String(adenda.monto) : '',
    adenda.estado,
  ];
}

export function movimientoAFilaExport(mov: MovimientoDocumentoTecnicoObra): string[] {
  return [
    mov.solicitud,
    mov.fecha_solicitud?.slice(0, 10) || '',
    mov.fecha_entrada?.slice(0, 10) || '',
    mov.no_tramite || '',
    mov.oficio || '',
    mov.estatus || '',
    mov.area?.area || mov.departamento || '',
    mov.fecha_salida?.slice(0, 10) || '',
    mov.observaciones || '',
  ];
}

export function construirWorkbookExport(
  documentos: DocumentoTecnicoObra[],
  movimientos: MovimientoDocumentoTecnicoObra[],
  adendas: Adenda[] = [],
): XLSX.WorkBook {
  const wsDoc = XLSX.utils.aoa_to_sheet([
    [...DOCUMENTOS_EXCEL_HEADERS],
    ...documentos.map(documentoAFilaExport),
  ]);
  wsDoc['!cols'] = DOCUMENTOS_EXCEL_COL_WIDTHS;

  const wsMov = XLSX.utils.aoa_to_sheet([
    [...MOVIMIENTOS_EXCEL_HEADERS],
    ...movimientos.map(movimientoAFilaExport),
  ]);
  wsMov['!cols'] = MOVIMIENTOS_EXCEL_COL_WIDTHS;

  const wsAd = XLSX.utils.aoa_to_sheet([
    [...ADENDAS_EXCEL_HEADERS],
    ...adendas.map(adendaAFilaExport),
  ]);
  wsAd['!cols'] = ADENDAS_EXCEL_COL_WIDTHS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDoc, HOJA_DOCUMENTOS);
  XLSX.utils.book_append_sheet(wb, wsMov, HOJA_MOVIMIENTOS);
  XLSX.utils.book_append_sheet(wb, wsAd, HOJA_ADENDAS);
  return wb;
}

export function construirWorkbookPlantilla(): XLSX.WorkBook {
  const wsDoc = XLSX.utils.aoa_to_sheet([[...DOCUMENTOS_EXCEL_HEADERS], DOCUMENTOS_EXCEL_EJEMPLO]);
  wsDoc['!cols'] = DOCUMENTOS_EXCEL_COL_WIDTHS;

  const wsMov = XLSX.utils.aoa_to_sheet([
    [...MOVIMIENTOS_EXCEL_HEADERS],
    MOVIMIENTOS_EXCEL_EJEMPLO,
  ]);
  wsMov['!cols'] = MOVIMIENTOS_EXCEL_COL_WIDTHS;

  const wsAd = XLSX.utils.aoa_to_sheet([[...ADENDAS_EXCEL_HEADERS], ADENDAS_EXCEL_EJEMPLO]);
  wsAd['!cols'] = ADENDAS_EXCEL_COL_WIDTHS;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDoc, HOJA_DOCUMENTOS);
  XLSX.utils.book_append_sheet(wb, wsMov, HOJA_MOVIMIENTOS);
  XLSX.utils.book_append_sheet(wb, wsAd, HOJA_ADENDAS);
  return wb;
}

export function workbookABlob(wb: XLSX.WorkBook): Blob {
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

export function descargarBlob(blob: Blob, nombreArchivo: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

function leerHojaPorNombre(wb: XLSX.WorkBook, nombreHoja: string): Record<string, unknown>[] {
  const nombre = wb.SheetNames.find((n) => normalizarClave(n) === normalizarClave(nombreHoja));
  if (!nombre) return [];
  const ws = wb.Sheets[nombre];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' });
}

export function parsearArchivoExcel(buffer: ArrayBuffer): ResultadoParseoExcel {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });

  const filasDoc = leerHojaPorNombre(wb, HOJA_DOCUMENTOS);
  const filasMov = leerHojaPorNombre(wb, HOJA_MOVIMIENTOS);
  const filasAd = leerHojaPorNombre(wb, HOJA_ADENDAS);

  const documentos: FilaDocumentoExcel[] = [];
  filasDoc.forEach((row, idx) => {
    const doc = filaADocumento(row, idx + 2);
    if (doc) documentos.push(doc);
  });

  const movimientos: FilaMovimientoExcel[] = [];
  filasMov.forEach((row) => {
    const mov = filaAMovimiento(row);
    if (mov) movimientos.push(mov);
  });

  const adendas: FilaAdendaExcel[] = [];
  filasAd.forEach((row) => {
    const ad = filaAAdenda(row);
    if (ad) adendas.push(ad);
  });

  return { documentos, movimientos, adendas };
}
