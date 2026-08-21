import type { Adenda, Contratista, Obra } from '../types/database';
import {
  PLANTILLA_ADENDA_KEYS,
  PLANTILLA_CONTRATISTA_KEYS,
  PLANTILLA_CONTRATO_KEYS,
  PLANTILLA_OBRAS_COLUMNAS,
} from '../constants/obraPlantillaCarga';

const PLANTILLA_LABEL_TO_KEY = new Map<string, string>(
  PLANTILLA_OBRAS_COLUMNAS.flatMap((c) => [
    [c.label.toLowerCase().trim(), c.key],
    [c.key.toLowerCase(), c.key],
  ]),
);

PLANTILLA_LABEL_TO_KEY.set('id obra', 'id');
PLANTILLA_LABEL_TO_KEY.set('id_obra', 'id');
PLANTILLA_LABEL_TO_KEY.set('id contratista', 'contratista_id');
PLANTILLA_LABEL_TO_KEY.set('id adenda', 'adenda_id');
PLANTILLA_LABEL_TO_KEY.set('no. contrato', 'contrato');
PLANTILLA_LABEL_TO_KEY.set('no_contrato', 'contrato');
PLANTILLA_LABEL_TO_KEY.set('no contrato', 'contrato');
PLANTILLA_LABEL_TO_KEY.set('id contrato', 'contrato_id');

export type ObraCargaArchivo = Omit<Obra, 'id' | 'created_at' | 'updated_at'> & {
  id?: string | null;
  id_obra?: string | null;
  /** Solo carga masiva: lote del catálogo contrato (no se persiste en obras). */
  lote?: number | null;
};

export type ContratistaCargaArchivo = Pick<
  Contratista,
  'responsable' | 'identificacion' | 'telefono1' | 'telefono2' | 'correo'
> & { id?: string | null };

export type ContratoCargaArchivo = {
  no_contrato?: string | null;
  lote?: number | null;
  contrato_id?: string | null;
  fecha_contrato?: string | null;
  estatus_contrato?: string | null;
  proceso?: string | null;
  certificacion?: string | null;
  presupuesto_centro?: number | null;
  monto_total_contrato?: number | null;
  monto_total_inversion?: number | null;
  observaciones?: string | null;
  contratista_nombre?: string | null;
};

export type AdendaCargaArchivo = {
  id?: string | null;
  numero_adenda?: string | null;
  tipo_adenda?: string | null;
  monto?: number | null;
  estado?: Adenda['estado'] | string | null;
};

export interface ResultadoMapeoObraCarga {
  obra: ObraCargaArchivo;
  contratista: Partial<ContratistaCargaArchivo>;
  contrato: ContratoCargaArchivo;
  adenda: AdendaCargaArchivo;
}

function pickRaw(src: Record<string, unknown>, key: string): unknown {
  if (src[key] !== undefined && src[key] !== null && src[key] !== '') return src[key];
  for (const k of Object.keys(src)) {
    const norm = k.toLowerCase().trim();
    if (norm === key.toLowerCase()) return src[k];
    if (norm.replace(/\s+/g, '_') === key.toLowerCase()) return src[k];
    const mapped = PLANTILLA_LABEL_TO_KEY.get(norm);
    if (mapped === key) return src[k];
  }
  return undefined;
}

function getValue(src: Record<string, unknown>, key: string): string | null {
  const field = pickRaw(src, key);
  if (field === null || field === undefined || field === '') return null;
  return String(field).trim() || null;
}

function getNumber(src: Record<string, unknown>, key: string): number | null {
  const value = getValue(src, key);
  if (!value) return null;
  const num = parseInt(value, 10);
  return Number.isNaN(num) ? null : num;
}

function getDecimal(src: Record<string, unknown>, key: string): number | null {
  const field = pickRaw(src, key);
  if (field === null || field === undefined || field === '') return null;
  if (typeof field === 'number' && Number.isFinite(field)) return field;
  const num = parseFloat(String(field).replace(/,/g, '').trim());
  return Number.isFinite(num) ? num : null;
}

function getDate(src: Record<string, unknown>, key: string): string | null {
  const field = pickRaw(src, key);
  if (field === null || field === undefined || field === '') return null;

  if (typeof field === 'number') {
    try {
      if (field < 1 || field > 100000) return null;
      const excelEpoch = new Date(1899, 11, 30);
      const jsDate = new Date(excelEpoch.getTime() + field * 24 * 60 * 60 * 1000);
      if (Number.isNaN(jsDate.getTime())) return null;
      const year = jsDate.getFullYear();
      if (year < 1900 || year > 2100) return null;
      return jsDate.toISOString().split('T')[0];
    } catch {
      return null;
    }
  }

  const value = String(field).trim();
  if (!value) return null;

  try {
    let date: Date | null = null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      date = new Date(`${value}T00:00:00`);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value)) {
      const parts = value.split('/');
      date = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
    } else {
      date = new Date(value);
    }
    if (!date || Number.isNaN(date.getTime())) return null;
    const year = date.getFullYear();
    if (year < 1900 || year > 2100) return null;
    return date.toISOString().split('T')[0];
  } catch {
    return null;
  }
}

const DATE_KEYS = new Set([
  'fecha_inicio',
  'fecha_detenida',
  'fecha_fin_estimada',
  'fecha_inauguracion',
  'fecha_contrato',
]);

const NUMBER_KEYS = new Set(['no_aula', 'lote']);

const DECIMAL_KEYS = new Set([
  'porcentaje_ejecutado',
  'presupuesto_total',
  'avance_inicial',
  'total_ultima_cubicacion',
  'ultima_total_cubicado',
  'total_cubicado_base',
  'total_pagado',
  'monto_snip',
  'presupuesto_centro',
  'monto_total_contrato',
  'monto_total_inversion',
  'monto_adenda',
]);

export function mapearRegistroPlantillaObra(src: Record<string, unknown>): ResultadoMapeoObraCarga {
  const codigo =
    getValue(src, 'codigo') ||
    getValue(src, 'codigo_contrato') ||
    getValue(src, 'Código') ||
    getValue(src, 'NO. CONTRATO') ||
    '';

  const noContrato = getValue(src, 'contrato') || getValue(src, 'no_contrato');
  const contratoId = getValue(src, 'contrato_id');
  const obraId = getValue(src, 'id');
  const contratistaId = getValue(src, 'contratista_id');
  const adendaId = getValue(src, 'adenda_id');

  const obra: ObraCargaArchivo = {
    id: obraId,
    id_obra: obraId,
    codigo: codigo || null,
    contrato: noContrato,
    contrato_id: contratoId,
    contratista_id: contratistaId,
    nombre: getValue(src, 'nombre') || '',
    estado: getValue(src, 'estado') || '',
    tipo_obra: getValue(src, 'tipo_obra'),
    descripcion: null,
    responsable: null,
  };

  const contratista: Partial<ContratistaCargaArchivo> = {
    id: contratistaId,
  };
  const contrato: ContratoCargaArchivo = {
    no_contrato: noContrato,
    contrato_id: contratoId,
  };
  const adenda: AdendaCargaArchivo = {
    id: adendaId,
  };

  for (const col of PLANTILLA_OBRAS_COLUMNAS) {
    const { key } = col;
    if (
      key === 'codigo' ||
      key === 'contrato' ||
      key === 'nombre' ||
      key === 'estado' ||
      key === 'contrato_id' ||
      key === 'id' ||
      key === 'contratista_id' ||
      key === 'adenda_id'
    ) {
      continue;
    }

    let valor: string | number | null = null;
    if (DATE_KEYS.has(key)) {
      valor = getDate(src, key);
    } else if (NUMBER_KEYS.has(key)) {
      valor = getNumber(src, key);
    } else if (DECIMAL_KEYS.has(key)) {
      valor = getDecimal(src, key);
    } else {
      valor = getValue(src, key);
    }

    if (valor === null || valor === undefined || valor === '') continue;

    if (PLANTILLA_CONTRATISTA_KEYS.has(key)) {
      (contratista as Record<string, unknown>)[key] = valor;
      if (key === 'responsable') {
        obra.responsable = String(valor);
        contrato.contratista_nombre = String(valor);
      }
    } else if (key === 'lote') {
      const lote = typeof valor === 'number' ? valor : parseInt(String(valor), 10);
      if (!Number.isNaN(lote)) {
        obra.lote = lote;
        contrato.lote = lote;
      }
    } else if (PLANTILLA_CONTRATO_KEYS.has(key)) {
      if (key === 'observaciones_contrato') {
        contrato.observaciones = String(valor);
      } else {
        (contrato as Record<string, unknown>)[key] = valor;
      }
    } else if (PLANTILLA_ADENDA_KEYS.has(key)) {
      if (key === 'monto_adenda') {
        adenda.monto = typeof valor === 'number' ? valor : Number(valor);
      } else if (key === 'estado_adenda') {
        adenda.estado = String(valor);
      } else if (key === 'numero_adenda') {
        adenda.numero_adenda = String(valor);
      } else if (key === 'tipo_adenda') {
        adenda.tipo_adenda = String(valor);
      }
    } else {
      (obra as Record<string, unknown>)[key] = valor;
    }
  }

  return { obra, contratista, contrato, adenda };
}

function xmlFieldToPlain(field: unknown): unknown {
  if (field == null) return field;
  if (Array.isArray(field)) return xmlFieldToPlain(field[0]);
  if (typeof field === 'object') {
    const obj = field as Record<string, unknown>;
    if (obj['#text'] !== undefined) return obj['#text'];
  }
  return field;
}

export function flatFromXmlObra(obraXml: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obraXml)) {
    if (k.startsWith('@_')) continue;
    out[k] = xmlFieldToPlain(v);
  }
  if (!out.codigo && obraXml.codigo_contrato) {
    out.codigo = xmlFieldToPlain(obraXml.codigo_contrato);
  }
  return out;
}
