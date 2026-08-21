import * as XLSX from 'xlsx';
import type { Adenda, ContratoTechado, Obra } from '../types/database';
import { numeroContratoDesdeObra } from '../services/contratoObrasService';
import { normalizarNoContrato } from './techadoNormalizar';
import {
  columnasPlantillaPorTabla,
  nombreHojaPlantilla,
  PLANTILLA_ADENDA_KEYS,
  PLANTILLA_CONTRATISTA_KEYS,
  PLANTILLA_CONTRATO_KEYS,
  PLANTILLA_OBRAS_COLUMNAS,
  PLANTILLA_TIPO_OBRA_VALORES,
  PLANTILLA_TIPO_ADENDA_VALORES,
  PLANTILLA_ESTADO_ADENDA_VALORES,
  type TablaCarga,
} from '../constants/obraPlantillaCarga';

export type ObraFilaPlantilla = Obra & {
  adenda?: Pick<Adenda, 'id' | 'numero_adenda' | 'tipo_adenda' | 'monto' | 'estado'> | null;
};

export type FilaPlantillaContratista = {
  no_contrato: string;
  responsable: string;
  identificacion: string;
  telefono1: string;
  telefono2: string;
  correo: string;
};

function valorContratoPlantilla(contrato: ContratoTechado | null | undefined, key: string): string | number {
  if (!contrato) return '';
  if (key === 'lote') return contrato.lote ?? '';
  if (key === 'contrato' || key === 'no_contrato') return contrato.no_contrato || '';
  if (key === 'contrato_id') return contrato.id || '';
  if (key === 'observaciones_contrato') return contrato.observaciones || '';
  const v = contrato[key as keyof ContratoTechado];
  if (v == null || v === '') return '';
  if (typeof v === 'object') return '';
  return v as string | number;
}

function valorAdendaPlantilla(
  adenda: ObraFilaPlantilla['adenda'],
  key: string,
): string | number {
  if (!adenda) return '';
  if (key === 'monto_adenda') return adenda.monto ?? '';
  if (key === 'estado_adenda') return adenda.estado || '';
  if (key === 'numero_adenda') return adenda.numero_adenda || '';
  if (key === 'tipo_adenda') return adenda.tipo_adenda || '';
  return '';
}

export function valorObraParaPlantilla(obra: ObraFilaPlantilla, key: string): string | number {
  if (key === 'id') return obra.id || '';
  if (key === 'contratista_id') return obra.contratista_id || obra.contratista?.id || '';
  if (key === 'adenda_id') return obra.adenda?.id || '';
  if (PLANTILLA_CONTRATISTA_KEYS.has(key)) {
    const c = obra.contratista;
    const v = c?.[key as keyof typeof c];
    if (v == null || v === '') return '';
    return typeof v === 'number' ? v : String(v);
  }
  if (key === 'contrato') {
    return numeroContratoDesdeObra(obra) || obra.contrato || '';
  }
  if (key === 'contrato_id') {
    return obra.contrato_id || obra.contrato_ref?.id || '';
  }
  if (PLANTILLA_CONTRATO_KEYS.has(key) || key === 'lote') {
    return valorContratoPlantilla(obra.contrato_ref, key);
  }
  if (PLANTILLA_ADENDA_KEYS.has(key)) {
    return valorAdendaPlantilla(obra.adenda, key);
  }
  const v = obra[key as keyof Obra];
  if (v == null || v === '') return '';
  if (typeof v === 'object') return '';
  return v as string | number;
}

export function obraAFilaPlantilla(obra: ObraFilaPlantilla): (string | number)[] {
  return PLANTILLA_OBRAS_COLUMNAS.map((col) => valorObraParaPlantilla(obra, col.key));
}

export function construirWorkbookPlantillaObras(tabla: TablaCarga = 'todo'): XLSX.WorkBook {
  const columnas = columnasPlantillaPorTabla(tabla);
  const headers = columnas.map((c) => c.key);
  const ejemplo = columnas.map((c) => c.ejemplo);
  const anchos = columnas.map((c) => ({ wch: c.ancho ?? 18 }));
  const hoja = nombreHojaPlantilla(tabla);

  const wsDatos = XLSX.utils.aoa_to_sheet([headers, ejemplo]);
  wsDatos['!cols'] = anchos;

  const notasRef =
    tabla === 'contratistas'
      ? [
          ['Modo de carga', 'contratistas'],
          ['Regla', 'Si no_contrato existe se actualiza el contratista de ese contrato; si no, se crea.'],
          ['contrato.no_contrato', 'Identifica el contrato'],
          ['contratistas.responsable / identificacion / telefono1 / telefono2 / correo', 'Datos del contratista'],
        ]
      : [
          ['Modo de carga', tabla],
          ['Regla', 'Si el ID existe se actualiza; si no, se crea. Las filas se conectan por ID.'],
          ['obras.contrato_id', 'FK a contrato.id'],
          ['obras.contratista_id', 'FK a contratistas.id'],
          ['adenda.contrato_id / adenda.obra_id', 'FK a contrato.id y obras.id'],
          [],
          ['tipo_obra', `Valores: ${PLANTILLA_TIPO_OBRA_VALORES.join(', ')}`],
          ['tipo_adenda', `Valores: ${PLANTILLA_TIPO_ADENDA_VALORES.join(', ')}`],
          ['estado_adenda', `Valores: ${PLANTILLA_ESTADO_ADENDA_VALORES.join(', ')}`],
        ];

  const wsRef = XLSX.utils.aoa_to_sheet([
    ['Grupo', 'Etiqueta', 'Clave (columna Excel)', 'Ejemplo', 'Notas'],
    ...columnas.map((c) => [c.grupo, c.label, c.key, c.ejemplo, c.nota || '']),
    [],
    ...notasRef,
  ]);
  wsRef['!cols'] = [{ wch: 22 }, { wch: 28 }, { wch: 28 }, { wch: 22 }, { wch: 55 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsDatos, hoja);
  XLSX.utils.book_append_sheet(wb, wsRef, 'Referencia');
  return wb;
}

export function asociarRelacionesAObrasPlantilla(
  obras: Obra[],
  contratos: ContratoTechado[],
  adendas: Adenda[],
): ObraFilaPlantilla[] {
  const contratoPorId = new Map(contratos.map((c) => [c.id, c]));
  const adendasPorContrato = new Map<string, Adenda[]>();
  for (const a of adendas) {
    const list = adendasPorContrato.get(a.contrato_id) || [];
    list.push(a);
    adendasPorContrato.set(a.contrato_id, list);
  }

  const elegirAdenda = (obra: Obra): Adenda | null => {
    const cid = obra.contrato_id || obra.contrato_ref?.id;
    if (!cid) return null;
    const list = adendasPorContrato.get(cid) || [];
    if (list.length === 0) return null;
    const deObra = list.find((a) => a.obra_id && a.obra_id === obra.id);
    if (deObra) return deObra;
    return list.find((a) => a.estado === 'en_curso') || list[0];
  };

  return obras.map((obra) => {
    const cid = obra.contrato_id || obra.contrato_ref?.id || '';
    const contrato = (cid && contratoPorId.get(cid)) || obra.contrato_ref || null;
    return {
      ...obra,
      contrato_id: obra.contrato_id || contrato?.id || null,
      contrato_ref: contrato,
      adenda: elegirAdenda(obra),
    };
  });
}

export function construirWorkbookExportObras(obras: ObraFilaPlantilla[]): XLSX.WorkBook {
  const headers = PLANTILLA_OBRAS_COLUMNAS.map((c) => c.key);
  const anchos = PLANTILLA_OBRAS_COLUMNAS.map((c) => ({ wch: c.ancho ?? 18 }));
  const ejemplo = PLANTILLA_OBRAS_COLUMNAS.map((c) => c.ejemplo);
  const filas = obras.length > 0 ? obras.map(obraAFilaPlantilla) : [ejemplo];
  const ws = XLSX.utils.aoa_to_sheet([headers, ...filas]);
  ws['!cols'] = anchos;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Obras');
  return wb;
}

export function obrasAFilasPlantillaContratista(obras: Obra[]): FilaPlantillaContratista[] {
  const seen = new Set<string>();
  const out: FilaPlantillaContratista[] = [];
  for (const obra of obras) {
    const bruto = numeroContratoDesdeObra(obra) || obra.contrato || '';
    const no = normalizarNoContrato(bruto) || bruto.trim();
    if (!no || seen.has(no)) continue;
    seen.add(no);
    const c = obra.contratista;
    out.push({
      no_contrato: no,
      responsable: c?.responsable || obra.responsable || obra.contrato_ref?.contratista_nombre || '',
      identificacion: c?.identificacion || '',
      telefono1: c?.telefono1 || '',
      telefono2: c?.telefono2 || '',
      correo: c?.correo || '',
    });
  }
  return out;
}

export function construirWorkbookExportContratistas(
  filas: FilaPlantillaContratista[],
): XLSX.WorkBook {
  const columnas = columnasPlantillaPorTabla('contratistas');
  const headers = columnas.map((c) => c.key);
  const anchos = columnas.map((c) => ({ wch: c.ancho ?? 18 }));
  const rows = filas.map((fila) =>
    columnas.map((c) => fila[c.key as keyof FilaPlantillaContratista] || ''),
  );
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = anchos;
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, nombreHojaPlantilla('contratistas'));
  return wb;
}

export function workbookObrasABlob(wb: XLSX.WorkBook): Blob {
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
