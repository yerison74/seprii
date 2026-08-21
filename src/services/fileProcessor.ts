/**
 * Servicio para procesar archivos XML y Excel en el frontend
 */

import * as XLSX from 'xlsx';
import { XMLParser } from 'fast-xml-parser';
import { obrasService, contratistasService, adendaService } from './supabaseService';
import { contratoObrasService } from './contratoObrasService';
import { supabase } from '../lib/supabase';
import { reservarIdsObra } from '../utils/reservarIdObra';
import { inferirTipoObraGestion } from '../constants/tipoObraGestion';
import { normalizarCodigoObra } from '../utils/normalizarCodigoObra';
import { normalizarNoContrato } from '../utils/techadoNormalizar';
import { PLANTILLA_KEYS_NO_OBRA, nombreHojaPlantilla, type TablaCarga } from '../constants/obraPlantillaCarga';
import type { Obra } from '../types/database';
import {
  mapearRegistroPlantillaObra,
  flatFromXmlObra,
  type AdendaCargaArchivo,
  type ContratoCargaArchivo,
  type ContratistaCargaArchivo,
  type ObraCargaArchivo,
} from '../utils/obraCargaMappers';

/** Estado de avance al cargar obras desde archivo (UI). */
export type ProgresoCargaObra = { mensaje: string; porcentaje: number };

export type ProgresoCargaCallback = (p: ProgresoCargaObra) => void;

function notificarProgreso(
  onProgreso: ProgresoCargaCallback | undefined,
  mensaje: string,
  porcentaje: number,
) {
  if (!onProgreso) return;
  const pct = Math.min(100, Math.max(0, Math.round(porcentaje)));
  try {
    onProgreso({ mensaje, porcentaje: pct });
  } catch {
    /* no bloquear la carga */
  }
}

/** Códigos por consulta `.in()` (evita URLs demasiado largas). */
const CODIGO_CHUNK = 150;
/** Filas acumuladas antes de enviar un insert múltiple. */
const INSERT_BATCH = 50;

function tipoObraNormalizado(tipo: string): 'Construccion' | 'Mantenimiento' {
  return (tipo || '').trim().toLowerCase() === 'mantenimiento' ? 'Mantenimiento' : 'Construccion';
}

async function obtenerMapaCodigoAId(codigos: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniq = Array.from(
    new Set(
      codigos
        .map((c) => normalizarCodigoObra(c))
        .filter((c): c is string => !!c),
    ),
  );
  for (let i = 0; i < uniq.length; i += CODIGO_CHUNK) {
    const chunk = uniq.slice(i, i + CODIGO_CHUNK);
    const { data, error } = await supabase.from('obras').select('id,codigo').in('codigo', chunk);
    if (error) throw error;
    for (const row of data || []) {
      const key = normalizarCodigoObra(row.codigo as string);
      if (key) map.set(key, row.id as string);
    }
  }
  return map;
}

/** En un mismo archivo, el último registro por clave prevalece. */
function deduplicarItemsCarga(
  items: ItemCargaObra[],
  tabla: TablaCarga,
): { items: ItemCargaObra[]; filasDuplicadas: number } {
  const porClave = new Map<string, ItemCargaObra>();
  let filasDuplicadas = 0;
  items.forEach((it, idx) => {
    const key = claveDedupeCarga(it, tabla) || `__fila_${idx}`;
    if (porClave.has(key) && !key.startsWith('__fila_')) filasDuplicadas += 1;
    porClave.set(key, it);
  });
  return { items: Array.from(porClave.values()), filasDuplicadas };
}

async function reservarIdsObraPorTipoObra(tipoObra: string, cantidad: number): Promise<string[]> {
  const prefijo = tipoObraNormalizado(tipoObra) === 'Mantenimiento' ? 'MT' : 'OB';
  return reservarIdsObra(prefijo, cantidad);
}

type ItemCargaObra = {
  obra: ObraCargaArchivo;
  contratista: Partial<ContratistaCargaArchivo>;
  contrato: ContratoCargaArchivo;
  adenda: AdendaCargaArchivo;
  codigoNormalizado: string;
  tipoObraRaw: string;
  etiquetaError: string;
};

function idObraFila(obra: ObraCargaArchivo): string {
  return String(obra.id || obra.id_obra || '').trim();
}

function claveDedupeCarga(it: ItemCargaObra, tabla: TablaCarga): string | null {
  const obraId = idObraFila(it.obra);
  const codigo = it.codigoNormalizado;
  const coId = String(it.contrato.contrato_id || it.obra.contrato_id || '').trim();
  const num = normalizarNoContrato(it.contrato.no_contrato || it.obra.contrato || '') || '';
  const lote = it.contrato.lote ?? it.obra.lote ?? '';
  const adId = String(it.adenda.id || '').trim();
  const adNum = String(it.adenda.numero_adenda || '').trim();

  if (tabla === 'contratistas') {
    return num ? `con:${num}` : null;
  }
  if (tabla === 'contratos') {
    return coId ? `co:${coId}` : num ? `con:${lote}|${num}` : obraId ? `oid:${obraId}` : null;
  }
  if (tabla === 'adendas') {
    if (adId) return `ad:${adId}`;
    if (adNum) return `adn:${coId || `${lote}|${num}`}|${adNum}`;
    return null;
  }
  return obraId ? `oid:${obraId}` : codigo ? `cod:${codigo}` : null;
}

function errorFilaInvalida(it: ItemCargaObra, tabla: TablaCarga): string | null {
  const obraId = idObraFila(it.obra);
  const codigo = it.codigoNormalizado;
  if (tabla === 'todo' || tabla === 'obras') {
    if (!obraId && !codigo) return 'Falta ID obra o código para crear/actualizar la obra.';
    return null;
  }
  if (tabla === 'contratistas') {
    const num = String(it.contrato.no_contrato || it.obra.contrato || '').trim();
    const nombre = String(it.contratista.responsable || it.obra.responsable || '').trim();
    if (!num) return 'Falta no_contrato.';
    if (!nombre) return 'Falta responsable (nombre del contratista).';
    return null;
  }
  if (tabla === 'contratos') {
    const coId = String(it.contrato.contrato_id || it.obra.contrato_id || '').trim();
    const num = String(it.contrato.no_contrato || it.obra.contrato || '').trim();
    if (!coId && !num && !obraId && !codigo) {
      return 'Falta ID contrato, no. contrato, o ID/código de obra.';
    }
    return null;
  }
  const adId = String(it.adenda.id || '').trim();
  const adNum = String(it.adenda.numero_adenda || '').trim();
  const coId = String(it.contrato.contrato_id || it.obra.contrato_id || '').trim();
  if (!adId && !adNum && !coId && !obraId && !codigo) {
    return 'Falta ID adenda, no. adenda, o ID de contrato/obra.';
  }
  return null;
}

function claveContratoCarga(lote: number | null | undefined, noContrato: string): string {
  return `${lote ?? ''}|${normalizarNoContrato(noContrato) ?? ''}`;
}

function omitirCamposTransitoriosCarga(
  obra: ObraCargaArchivo,
): Partial<Omit<Obra, 'id' | 'created_at' | 'updated_at'>> {
  return Object.fromEntries(
    Object.entries(obra).filter(
      ([k, v]) =>
        k !== 'id' &&
        k !== 'id_obra' &&
        !PLANTILLA_KEYS_NO_OBRA.has(k) &&
        v !== undefined &&
        v !== null &&
        v !== '',
    ),
  ) as Partial<Omit<Obra, 'id' | 'created_at' | 'updated_at'>>;
}

function payloadObraActualizacion(obra: ObraCargaArchivo) {
  const payload = omitirCamposTransitoriosCarga(obra);
  if (!payload.nombre) delete payload.nombre;
  if (!payload.estado) delete payload.estado;
  return payload;
}

async function obtenerMapasObrasExistentes(items: ItemCargaObra[]): Promise<{
  byId: Map<string, string>;
  byCodigo: Map<string, string>;
}> {
  const byCodigo = await obtenerMapaCodigoAId(items.map((it) => it.codigoNormalizado));
  const byId = new Map<string, string>();
  const ids = Array.from(new Set(items.map((it) => idObraFila(it.obra)).filter(Boolean)));
  for (let i = 0; i < ids.length; i += CODIGO_CHUNK) {
    const chunk = ids.slice(i, i + CODIGO_CHUNK);
    const { data, error } = await supabase.from('obras').select('id,codigo').in('id', chunk);
    if (error) throw error;
    for (const row of data || []) {
      const id = String(row.id || '');
      if (!id) continue;
      byId.set(id, id);
      const codigo = normalizarCodigoObra(row.codigo as string);
      if (codigo) byCodigo.set(codigo, id);
    }
  }
  return { byId, byCodigo };
}

function obraIdExistente(
  it: ItemCargaObra,
  mapas: { byId: Map<string, string>; byCodigo: Map<string, string> },
): string | undefined {
  const oid = idObraFila(it.obra);
  if (oid && mapas.byId.has(oid)) return mapas.byId.get(oid);
  if (it.codigoNormalizado && mapas.byCodigo.has(it.codigoNormalizado)) {
    return mapas.byCodigo.get(it.codigoNormalizado);
  }
  return undefined;
}

async function precargarContratistasParaCarga(items: ItemCargaObra[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const it of items) {
    const idDirecto = String(it.contratista.id || it.obra.contratista_id || '').trim();
    const nombre = String(it.contratista.responsable || it.obra.responsable || '').trim();
    const resultado = await contratistasService.upsertDesdeCarga({
      id: idDirecto || undefined,
      responsable: nombre || undefined,
      identificacion: it.contratista.identificacion,
      telefono1: it.contratista.telefono1,
      telefono2: it.contratista.telefono2,
      correo: it.contratista.correo,
    });
    if (!resultado?.id) continue;
    if (idDirecto) map.set(`id:${idDirecto}`, resultado.id);
    map.set(`id:${resultado.id}`, resultado.id);
    if (nombre) map.set(nombre.toLowerCase(), resultado.id);
  }
  return map;
}

function extrasContratoDesdeCarga(contrato: ContratoCargaArchivo) {
  return {
    fecha_contrato: contrato.fecha_contrato || null,
    estatus_contrato: contrato.estatus_contrato || null,
    proceso: contrato.proceso || null,
    certificacion: contrato.certificacion || null,
    presupuesto_centro: contrato.presupuesto_centro ?? null,
    monto_total_contrato: contrato.monto_total_contrato ?? null,
    monto_total_inversion: contrato.monto_total_inversion ?? null,
    observaciones: contrato.observaciones || null,
  };
}

function contratistaIdDeItem(item: ItemCargaObra, contratistaIds: Map<string, string>): string | null {
  const idDirecto = String(item.contratista.id || item.obra.contratista_id || '').trim();
  const responsable = String(item.contratista.responsable || item.obra.responsable || '').trim();
  return (
    (idDirecto && contratistaIds.get(`id:${idDirecto}`)) ||
    (responsable ? contratistaIds.get(responsable.toLowerCase()) : undefined) ||
    idDirecto ||
    item.obra.contratista_id ||
    null
  );
}

async function precargarContratosParaCarga(
  items: ItemCargaObra[],
  contratistaIds: Map<string, string>,
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const pendientes = new Map<
    string,
    {
      lote?: number | null;
      no_contrato: string;
      contrato_id?: string | null;
      responsable?: string | null;
      contratista_id?: string | null;
      extras: ReturnType<typeof extrasContratoDesdeCarga>;
    }
  >();

  for (const it of items) {
    const idDirecto = String(it.contrato.contrato_id || it.obra.contrato_id || '').trim();
    const num = String(it.contrato.no_contrato || it.obra.contrato || '').trim();
    const norm = normalizarNoContrato(num);
    const lote =
      typeof it.contrato.lote === 'number'
        ? it.contrato.lote
        : typeof it.obra.lote === 'number'
          ? it.obra.lote
          : null;
    const responsable =
      String(it.contrato.contratista_nombre || it.obra.responsable || '').trim() || null;
    const contratistaId = contratistaIdDeItem(it, contratistaIds);
    const extras = extrasContratoDesdeCarga(it.contrato);

    if (idDirecto) {
      const key = `id:${idDirecto}`;
      if (!pendientes.has(key)) {
        pendientes.set(key, {
          lote,
          no_contrato: norm || num,
          contrato_id: idDirecto,
          responsable,
          contratista_id: contratistaId,
          extras,
        });
      }
      continue;
    }

    if (!norm) continue;
    const key = claveContratoCarga(lote, norm);
    if (!pendientes.has(key)) {
      pendientes.set(key, {
        lote,
        no_contrato: norm,
        responsable,
        contratista_id: contratistaId,
        extras,
      });
    }
  }

  for (const [key, p] of Array.from(pendientes.entries())) {
    const resultado = await contratoObrasService.upsertDesdeCarga({
      contrato_id: p.contrato_id,
      no_contrato: p.no_contrato,
      lote: p.lote,
      contratista_nombre: p.responsable,
      contratista_id: p.contratista_id,
      extras: p.extras,
    });
    if (resultado?.contrato.id) {
      map.set(key, resultado.contrato.id);
      map.set(`id:${resultado.contrato.id}`, resultado.contrato.id);
    }
  }

  return map;
}

function aplicarContratoPrecargado(
  item: ItemCargaObra,
  contratosMap: Map<string, string>,
  contratistaIds: Map<string, string>,
): ItemCargaObra {
  const contratistaId = contratistaIdDeItem(item, contratistaIds);
  const idDirecto = String(item.contrato.contrato_id || item.obra.contrato_id || '').trim();
  const num = String(item.contrato.no_contrato || item.obra.contrato || '').trim();
  const norm = normalizarNoContrato(num);
  const lote =
    typeof item.contrato.lote === 'number'
      ? item.contrato.lote
      : typeof item.obra.lote === 'number'
        ? item.obra.lote
        : null;
  const contratoId =
    (idDirecto && contratosMap.get(`id:${idDirecto}`)) ||
    (norm ? contratosMap.get(claveContratoCarga(lote, norm)) : undefined) ||
    idDirecto ||
    item.obra.contrato_id ||
    null;

  return {
    ...item,
    obra: {
      ...item.obra,
      contrato_id: contratoId,
      contratista_id: contratistaId || item.obra.contratista_id || null,
    },
  };
}

async function vincularFksRelacionadas(
  obraId: string | null | undefined,
  contratoId: string | null | undefined,
  contratistaId: string | null | undefined,
): Promise<void> {
  if (obraId && contratoId) {
    await contratoObrasService.asignarContratoAObra(obraId, contratoId);
  }
  if (obraId && contratistaId) {
    await obrasService.actualizarObra(obraId, { contratista_id: contratistaId });
  }
  if (contratoId && contratistaId) {
    await contratoObrasService.upsertDesdeCarga({
      contrato_id: contratoId,
      contratista_id: contratistaId,
    });
  }
}

async function upsertAdendaDeItem(
  item: ItemCargaObra,
  contratoId: string | null | undefined,
  obraId: string | null | undefined,
): Promise<void> {
  const cid = contratoId || item.obra.contrato_id || item.contrato.contrato_id || null;
  if (!cid && !item.adenda.id) return;
  await adendaService.upsertDesdeCarga({
    id: item.adenda.id,
    contrato_id: cid,
    obra_id: obraId || null,
    numero_adenda: item.adenda.numero_adenda,
    tipo_adenda: item.adenda.tipo_adenda,
    monto: item.adenda.monto,
    estado: item.adenda.estado,
  });
}

async function ejecutarCargaObrasLote(
  items: ItemCargaObra[],
  onProgreso?: ProgresoCargaCallback,
  rangoPct: { desde: number; hasta: number } = { desde: 0, hasta: 100 },
  tabla: TablaCarga = 'todo',
): Promise<{
  total: number;
  exitosas: number;
  fallidas: number;
  errores: string[];
  creadas: number;
  actualizadas: number;
}> {
  const resultados = {
    total: items.length,
    exitosas: 0,
    fallidas: 0,
    errores: [] as string[],
    creadas: 0,
    actualizadas: 0,
  };

  if (items.length === 0) {
    return resultados;
  }

  const { items: itemsUnicos, filasDuplicadas } = deduplicarItemsCarga(items, tabla);
  if (filasDuplicadas > 0) {
    resultados.errores.push(
      `${filasDuplicadas} fila(s) duplicada(s) en el archivo; se aplicó el último valor de cada una.`,
    );
  }

  const { desde, hasta } = rangoPct;
  const span = hasta - desde;
  const emit = (frac: number, mensaje: string) => {
    notificarProgreso(onProgreso, mensaje, desde + span * Math.min(1, Math.max(0, frac)));
  };

  emit(0, 'Preparando registros…');

  if (tabla === 'contratistas') {
    emit(0.1, 'Actualizando contratistas por no. contrato…');
    const totalFilas = itemsUnicos.length;
    let filaHecha = 0;
    for (const it of itemsUnicos) {
      try {
        const noContrato = String(it.contrato.no_contrato || it.obra.contrato || '').trim();
        const nombre = String(it.contratista.responsable || it.obra.responsable || '').trim();
        const upsertCt = await contratistasService.upsertDesdeCarga({
          responsable: nombre || undefined,
          identificacion: it.contratista.identificacion,
          telefono1: it.contratista.telefono1,
          telefono2: it.contratista.telefono2,
          correo: it.contratista.correo,
        });
        if (!upsertCt?.id) {
          throw new Error('No se pudo crear o actualizar el contratista');
        }
        const contrato = await contratoObrasService.upsertDesdeCarga({
          no_contrato: noContrato,
          contratista_id: upsertCt.id,
          contratista_nombre: nombre,
        });
        if (!contrato?.contrato.id) {
          throw new Error(`No se encontró ni se pudo crear el contrato ${noContrato}`);
        }
        await contratoObrasService.asignarContratistaPorNoContrato(
          noContrato,
          upsertCt.id,
          nombre,
        );
        if (upsertCt.created) resultados.creadas += 1;
        else resultados.actualizadas += 1;
        resultados.exitosas += 1;
      } catch (error: any) {
        resultados.fallidas += 1;
        resultados.errores.push(`${it.etiquetaError}: ${error.message || error}`);
      }
      filaHecha += 1;
      if (filaHecha % 3 === 0 || filaHecha === totalFilas) {
        emit(0.2 + 0.8 * (filaHecha / totalFilas), `Aplicando cambios (${filaHecha}/${totalFilas})…`);
      }
    }
    emit(1, 'Sincronizando últimos registros…');
    return resultados;
  }

  emit(0.08, 'Consultando obras existentes…');
  const mapasObras = await obtenerMapasObrasExistentes(itemsUnicos);

  emit(0.12, 'Resolviendo contratistas…');
  const contratistaIds = await precargarContratistasParaCarga(itemsUnicos);

  emit(0.16, 'Resolviendo contratos (contrato.id)…');
  const contratosPrecargados = await precargarContratosParaCarga(itemsUnicos, contratistaIds);
  const itemsConContrato = itemsUnicos.map((it) =>
    aplicarContratoPrecargado(it, contratosPrecargados, contratistaIds),
  );

  const crearObras = tabla === 'todo' || tabla === 'obras';

  if (!crearObras) {
    const totalFilas = itemsConContrato.length;
    let filaHecha = 0;
    for (const it of itemsConContrato) {
      try {
        const contratoId = it.obra.contrato_id || it.contrato.contrato_id || null;
        const contratistaId = it.obra.contratista_id || it.contratista.id || null;
        let obraId = obraIdExistente(it, mapasObras) || null;
        if (!obraId && idObraFila(it.obra)) {
          const encontrada = await obrasService.obtenerObraPorIdObra(idObraFila(it.obra));
          obraId = encontrada?.id || null;
        }
        if (!obraId && it.codigoNormalizado) {
          const encontrada = await obrasService.obtenerObraPorIdObra(it.codigoNormalizado);
          obraId = encontrada?.id || null;
        }
        if (obraId && !contratoId) {
          const obra = await obrasService.obtenerObraPorIdObra(obraId);
          if (obra?.contrato_id) {
            it.obra.contrato_id = obra.contrato_id;
          }
        }

        await vincularFksRelacionadas(
          obraId,
          it.obra.contrato_id || contratoId,
          contratistaId,
        );
        await upsertAdendaDeItem(it, it.obra.contrato_id || contratoId, obraId);
        resultados.actualizadas += 1;
        resultados.exitosas += 1;
      } catch (error: any) {
        resultados.fallidas += 1;
        resultados.errores.push(`${it.etiquetaError}: ${error.message || error}`);
      }
      filaHecha += 1;
      if (filaHecha % 3 === 0 || filaHecha === totalFilas) {
        emit(0.22 + 0.78 * (filaHecha / totalFilas), `Aplicando cambios (${filaHecha}/${totalFilas})…`);
      }
    }
    emit(1, 'Sincronizando últimos registros…');
    return resultados;
  }

  const createByTipo = new Map<'Construccion' | 'Mantenimiento', number>();
  for (const it of itemsConContrato) {
    if (obraIdExistente(it, mapasObras)) continue;
    if (idObraFila(it.obra)) continue;
    const tipo = tipoObraNormalizado(it.tipoObraRaw);
    createByTipo.set(tipo, (createByTipo.get(tipo) || 0) + 1);
  }

  emit(0.18, 'Reservando identificadores para obras nuevas…');
  const reserved = new Map<'Construccion' | 'Mantenimiento', string[]>();
  const reservedIdx = new Map<'Construccion' | 'Mantenimiento', number>();
  for (const tipo of ['Construccion', 'Mantenimiento'] as const) {
    const n = createByTipo.get(tipo) || 0;
    if (n > 0) {
      reserved.set(tipo, await reservarIdsObraPorTipoObra(tipo, n));
      reservedIdx.set(tipo, 0);
    }
  }

  const insertsBuffer: Array<Omit<Obra, 'created_at' | 'updated_at'>> = [];
  const pendientesPostInsert: Array<{ item: ItemCargaObra; obraId: string }> = [];

  const flushInserts = async () => {
    if (insertsBuffer.length === 0) return;
    const batchPendientes = pendientesPostInsert.splice(0, pendientesPostInsert.length);
    await obrasService.crearObrasLote(insertsBuffer, { chunkSize: INSERT_BATCH });
    for (const pending of batchPendientes) {
      try {
        await vincularFksRelacionadas(
          pending.obraId,
          pending.item.obra.contrato_id,
          pending.item.obra.contratista_id,
        );
      } catch {
        /* no bloquear lote */
      }
      try {
        await upsertAdendaDeItem(pending.item, pending.item.obra.contrato_id, pending.obraId);
      } catch {
        /* no bloquear lote por adenda */
      }
    }
    insertsBuffer.length = 0;
  };

  const totalFilas = itemsConContrato.length;
  let filaHecha = 0;
  for (const it of itemsConContrato) {
    try {
      const tipo = tipoObraNormalizado(it.tipoObraRaw);
      const { obra, codigoNormalizado } = it;
      const existenteId = obraIdExistente(it, mapasObras);

      if (existenteId) {
        const obraParaActualizar = payloadObraActualizacion(obra);
        await obrasService.actualizarObra(existenteId, obraParaActualizar);
        await vincularFksRelacionadas(existenteId, obra.contrato_id, obra.contratista_id);
        try {
          await upsertAdendaDeItem(it, obra.contrato_id, existenteId);
        } catch {
          /* no bloquear actualización por adenda */
        }
        resultados.actualizadas += 1;
      } else {
        const idPropuesto = idObraFila(obra);
        let nuevoId = idPropuesto;
        if (!nuevoId) {
          const idsList = reserved.get(tipo);
          const idx = reservedIdx.get(tipo) ?? 0;
          if (!idsList || idx >= idsList.length) {
            throw new Error('No hay ID reservado para una fila nueva');
          }
          reservedIdx.set(tipo, idx + 1);
          nuevoId = idsList[idx];
        }
        const obraParaCrear = {
          ...omitirCamposTransitoriosCarga(obra),
          id: nuevoId,
          codigo: codigoNormalizado || obra.codigo || null,
          nombre: obra.nombre?.trim() || 'Sin nombre',
          estado: obra.estado?.trim() || 'NO ESPECIFICADO',
          tipo_obra: tipo,
          tipo: inferirTipoObraGestion({
            codigo: codigoNormalizado || obra.codigo,
            distrito_minerd_sigede: obra.distrito_minerd_sigede,
            contrato: obra.contrato,
            contrato_id: obra.contrato_id,
          }),
        } as Omit<Obra, 'created_at' | 'updated_at'>;
        insertsBuffer.push(obraParaCrear);
        pendientesPostInsert.push({ item: it, obraId: nuevoId });
        mapasObras.byId.set(nuevoId, nuevoId);
        if (codigoNormalizado) mapasObras.byCodigo.set(codigoNormalizado, nuevoId);
        resultados.creadas += 1;
        if (insertsBuffer.length >= INSERT_BATCH) {
          await flushInserts();
        }
      }
      resultados.exitosas += 1;
    } catch (error: any) {
      resultados.fallidas += 1;
      resultados.errores.push(`${it.etiquetaError}: ${error.message || error}`);
    }
    filaHecha += 1;
    if (filaHecha % 3 === 0 || filaHecha === totalFilas) {
      emit(0.22 + 0.78 * (filaHecha / totalFilas), `Aplicando cambios en base de datos (${filaHecha}/${totalFilas})…`);
    }
  }

  await flushInserts();
  emit(1, 'Sincronizando últimos registros…');
  return resultados;
}

function hojaDatosWorkbook(workbook: XLSX.WorkBook, tabla: TablaCarga) {
  const preferida = nombreHojaPlantilla(tabla);
  const nombre =
    workbook.SheetNames.find((n) => n.toLowerCase() === preferida.toLowerCase()) ||
    workbook.SheetNames.find((n) => n.toLowerCase() !== 'referencia') ||
    workbook.SheetNames[0];
  return workbook.Sheets[nombre];
}

function filasDesdeXmlParseado(parsed: Record<string, any>, tabla: TablaCarga): Record<string, unknown>[] {
  if (tabla === 'contratistas') {
    const nodo =
      parsed?.contratistas?.contratista ??
      parsed?.mantenimientos?.contratista ??
      parsed?.mantenimientos?.obra;
    if (!nodo) {
      throw new Error(
        'Estructura XML inválida: se esperaba contratistas.contratista (plantilla de contratistas).',
      );
    }
    return Array.isArray(nodo) ? nodo : [nodo];
  }

  const nodo = parsed?.mantenimientos?.obra;
  if (!nodo) {
    throw new Error('Estructura XML inválida: No se encontró el elemento mantenimientos.obra');
  }
  return Array.isArray(nodo) ? nodo : [nodo];
}

function construirItemCarga(
  mapped: ReturnType<typeof mapearRegistroPlantillaObra>,
  etiquetaError: string,
  tabla: TablaCarga,
): { item?: ItemCargaObra; error?: string } {
  const { obra, contratista, contrato, adenda } = mapped;
  const codigoNormalizado = normalizarCodigoObra(obra.codigo);
  const item: ItemCargaObra = {
    obra,
    contratista,
    contrato,
    adenda,
    codigoNormalizado: codigoNormalizado || '',
    tipoObraRaw: (obra as { tipo_obra?: string }).tipo_obra || 'Construccion',
    etiquetaError,
  };
  const error = errorFilaInvalida(item, tabla);
  if (error) return { error: `${etiquetaError}: ${error}` };
  return { item };
}

/**
 * Procesar archivo XML y extraer obras
 */
export const procesarArchivoXml = async (
  file: File,
  onProgreso?: ProgresoCargaCallback,
  tabla: TablaCarga = 'todo',
): Promise<{
  total: number;
  exitosas: number;
  fallidas: number;
  errores: string[];
  creadas: number;
  actualizadas: number;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        notificarProgreso(onProgreso, 'Leyendo contenido del archivo…', 8);
        const xmlContent = e.target?.result as string;

        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          textNodeName: '#text',
          parseAttributeValue: true,
          trimValues: true,
        });

        let result: any;
        try {
          result = parser.parse(xmlContent);
        } catch (err: any) {
          reject(new Error(`Error al parsear XML: ${err.message}`));
          return;
        }

        notificarProgreso(onProgreso, 'Validando estructura del documento…', 18);

        let filasXml: Record<string, unknown>[];
        try {
          filasXml = filasDesdeXmlParseado(result, tabla);
        } catch (err: any) {
          reject(err);
          return;
        }

        notificarProgreso(
          onProgreso,
          `Preparando ${filasXml.length} registro(s)…`,
          26,
        );

        const resultados = {
          total: filasXml.length,
          exitosas: 0,
          fallidas: 0,
          errores: [] as string[],
          creadas: 0,
          actualizadas: 0,
        };

        const items: ItemCargaObra[] = [];
        for (const filaXml of filasXml) {
          const mapped = mapearRegistroPlantillaObra(
            flatFromXmlObra(filaXml as Record<string, unknown>),
          );
          const etiquetaError =
            tabla === 'contratistas'
              ? `Contrato ${mapped.contrato.no_contrato || mapped.obra.contrato || 'sin número'}`
              : `Obra ${filaXml.id || filaXml['@_id'] || mapped.obra.codigo || 'desconocida'}`;
          const construido = construirItemCarga(mapped, etiquetaError, tabla);
          if (construido.error) {
            resultados.fallidas++;
            resultados.errores.push(construido.error);
            continue;
          }
          if (construido.item) items.push(construido.item);
        }

        const lote = await ejecutarCargaObrasLote(items, onProgreso, { desde: 32, hasta: 96 }, tabla);
        resultados.exitosas = lote.exitosas;
        resultados.fallidas += lote.fallidas;
        resultados.errores.push(...lote.errores);
        resultados.creadas = lote.creadas;
        resultados.actualizadas = lote.actualizadas;

        resolve(resultados);
      } catch (error: any) {
        reject(new Error(`Error al leer archivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file);
  });
};

/**
 * Procesar archivo Excel y extraer obras
 */
export const procesarArchivoExcel = async (
  file: File,
  onProgreso?: ProgresoCargaCallback,
  tabla: TablaCarga = 'todo',
): Promise<{
  total: number;
  exitosas: number;
  fallidas: number;
  errores: string[];
  creadas: number;
  actualizadas: number;
}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        notificarProgreso(onProgreso, 'Leyendo bytes del archivo Excel…', 10);
        const data = e.target?.result;
        notificarProgreso(onProgreso, 'Analizando libro y hojas…', 16);
        const workbook = XLSX.read(data as string, { type: 'binary' });

        const worksheet = hojaDatosWorkbook(workbook, tabla);

        notificarProgreso(onProgreso, 'Convirtiendo filas a registros de obra…', 22);
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío o no tiene datos'));
          return;
        }

        const resultados = {
          total: jsonData.length,
          exitosas: 0,
          fallidas: 0,
          errores: [] as string[],
          creadas: 0,
          actualizadas: 0,
        };

        notificarProgreso(
          onProgreso,
          `Validando ${jsonData.length} fila(s) del archivo…`,
          28,
        );

        const items: ItemCargaObra[] = [];
        for (let rowIdx = 0; rowIdx < jsonData.length; rowIdx++) {
          const row = (jsonData as Record<string, unknown>[])[rowIdx];
          const mapped = mapearRegistroPlantillaObra(row);
          const etiquetaError = `Fila ${rowIdx + 2}`;
          const construido = construirItemCarga(mapped, etiquetaError, tabla);
          if (construido.error) {
            resultados.fallidas++;
            resultados.errores.push(
              `${construido.error} Columnas: ${JSON.stringify(Object.keys(row))}`,
            );
            continue;
          }
          if (construido.item) items.push(construido.item);
        }

        const lote = await ejecutarCargaObrasLote(items, onProgreso, { desde: 30, hasta: 96 }, tabla);
        resultados.exitosas = lote.exitosas;
        resultados.fallidas += lote.fallidas;
        resultados.errores.push(...lote.errores);
        resultados.creadas = lote.creadas;
        resultados.actualizadas = lote.actualizadas;

        resolve(resultados);
      } catch (error: any) {
        reject(new Error(`Error al procesar Excel: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsBinaryString(file);
  });
};

/**
 * Validar estructura XML sin procesarlo
 */
export const validarArchivoXml = async (
  file: File,
  tabla: TablaCarga = 'todo',
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const xmlContent = e.target?.result as string;

        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: '@_',
          textNodeName: '#text',
          parseAttributeValue: true,
          trimValues: true,
        });

        let result: any;
        try {
          result = parser.parse(xmlContent);
        } catch (err: any) {
          reject(new Error(`XML inválido: ${err.message}`));
          return;
        }

        try {
          filasDesdeXmlParseado(result, tabla);
        } catch (err: any) {
          reject(err);
          return;
        }

        resolve();
      } catch (error: any) {
        reject(new Error(`Error al leer archivo: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsText(file);
  });
};

/**
 * Validar estructura Excel sin procesarlo
 */
export const validarArchivoExcel = async (
  file: File,
  tabla: TablaCarga = 'todo',
): Promise<void> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data as string, { type: 'binary' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          reject(new Error('El archivo Excel no tiene hojas'));
          return;
        }

        const worksheet = hojaDatosWorkbook(workbook, tabla);
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío'));
          return;
        }

        const firstRow = jsonData[0] as Record<string, unknown>;
        const claves = Object.keys(firstRow).map((k) => k.toLowerCase().trim());
        if (tabla === 'contratistas') {
          const tieneContrato = claves.some((k) =>
            ['no_contrato', 'no. contrato', 'no contrato', 'contrato'].includes(k),
          );
          const tieneResponsable = claves.some((k) =>
            ['responsable', 'contratista'].includes(k),
          );
          if (!tieneContrato || !tieneResponsable) {
            reject(
              new Error(
                'La plantilla de contratistas requiere las columnas no_contrato y responsable.',
              ),
            );
            return;
          }
          resolve();
          return;
        }
        const aceptadas = [
          'codigo',
          'código',
          'nombre',
          'id',
          'id obra',
          'contrato',
          'no_contrato',
          'no. contrato',
          'contrato_id',
          'id contrato',
          'contratista_id',
          'id contratista',
          'responsable',
          'contratista',
          'adenda_id',
          'id adenda',
          'numero_adenda',
          'no. adenda',
        ];
        if (!claves.some((k) => aceptadas.includes(k))) {
          reject(
            new Error(
              'El archivo Excel no tiene columnas reconocidas (id, código, contrato, contratista o adenda).',
            ),
          );
          return;
        }

        resolve();
      } catch (error: any) {
        reject(new Error(`Error al leer archivo Excel: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error al leer el archivo'));
    };

    reader.readAsBinaryString(file);
  });
};