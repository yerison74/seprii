/**
 * Servicio para procesar archivos XML y Excel en el frontend
 */

import * as XLSX from 'xlsx';
import { XMLParser } from 'fast-xml-parser';
import { obrasService, contratistasService } from './supabaseService';
import { contratoObrasService } from './contratoObrasService';
import { supabase } from '../lib/supabase';
import { reservarIdsObra } from '../utils/reservarIdObra';
import { inferirTipoObraGestion } from '../constants/tipoObraGestion';
import { normalizarCodigoObra } from '../utils/normalizarCodigoObra';
import { normalizarNoContrato } from '../utils/techadoNormalizar';
import type { Obra } from '../types/database';
import {
  mapearRegistroPlantillaObra,
  flatFromXmlObra,
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

/** En un mismo archivo, el último registro por código prevalece (evita doble insert). */
function deduplicarItemsPorCodigo(items: ItemCargaObra[]): {
  items: ItemCargaObra[];
  filasDuplicadas: number;
} {
  const porCodigo = new Map<string, ItemCargaObra>();
  let filasDuplicadas = 0;
  for (const it of items) {
    if (porCodigo.has(it.codigoNormalizado)) filasDuplicadas += 1;
    porCodigo.set(it.codigoNormalizado, it);
  }
  return { items: Array.from(porCodigo.values()), filasDuplicadas };
}

async function reservarIdsObraPorTipoObra(tipoObra: string, cantidad: number): Promise<string[]> {
  const prefijo = tipoObraNormalizado(tipoObra) === 'Mantenimiento' ? 'MT' : 'OB';
  return reservarIdsObra(prefijo, cantidad);
}

type ItemCargaObra = {
  obra: ObraCargaArchivo;
  contratista: Partial<ContratistaCargaArchivo>;
  codigoNormalizado: string;
  tipoObraRaw: string;
  etiquetaError: string;
};

function claveContratoCarga(lote: number | null | undefined, noContrato: string): string {
  return `${lote ?? ''}|${normalizarNoContrato(noContrato) ?? ''}`;
}

function omitirCamposTransitoriosCarga(
  obra: ObraCargaArchivo,
): Partial<Omit<Obra, 'id' | 'created_at' | 'updated_at'>> {
  return Object.fromEntries(
    Object.entries(obra).filter(([k, v]) => k !== 'lote' && v !== undefined),
  ) as Partial<Omit<Obra, 'id' | 'created_at' | 'updated_at'>>;
}

async function precargarContratosParaCarga(items: ItemCargaObra[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const pendientes = new Map<
    string,
    { lote?: number | null; no_contrato: string; responsable?: string | null }
  >();

  for (const it of items) {
    const num = it.obra.contrato?.trim();
    if (!num) continue;
    const norm = normalizarNoContrato(num);
    if (!norm) continue;
    const lote = typeof it.obra.lote === 'number' ? it.obra.lote : null;
    const key = claveContratoCarga(lote, norm);
    if (!pendientes.has(key)) {
      pendientes.set(key, { lote, no_contrato: norm, responsable: it.obra.responsable });
    }
  }

  for (const [key, p] of Array.from(pendientes.entries())) {
    const contrato = await contratoObrasService.resolverOCrearContrato({
      no_contrato: p.no_contrato,
      lote: p.lote,
      contratista_nombre: p.responsable,
      crearSiFalta: true,
      vincularObras: false,
    });
    if (contrato?.id) map.set(key, contrato.id);
  }

  return map;
}

function aplicarContratoPrecargado(
  obra: ObraCargaArchivo,
  contratosMap: Map<string, string>,
): ObraCargaArchivo {
  const num = obra.contrato?.trim();
  if (!num) return obra;
  const norm = normalizarNoContrato(num);
  if (!norm) return obra;
  const lote = typeof obra.lote === 'number' ? obra.lote : null;
  const contratoId = contratosMap.get(claveContratoCarga(lote, norm));
  if (!contratoId) return obra;
  return { ...obra, contrato_id: contratoId };
}

async function sincronizarContratistaCarga(
  codigoNormalizado: string,
  contratista: Partial<ContratistaCargaArchivo>,
  responsable?: string | null,
): Promise<void> {
  const tieneDatos =
    (responsable && responsable.trim()) ||
    Object.values(contratista).some((v) => v != null && String(v).trim() !== '');
  if (!tieneDatos) return;

  const obra = await obrasService.obtenerObraPorIdObra(codigoNormalizado);
  if (!obra?.contratista_id) return;

  const updates: Partial<ContratistaCargaArchivo> = { ...contratista };
  if (responsable?.trim()) {
    updates.responsable = responsable.trim();
  }
  const payload = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v != null && String(v).trim() !== ''),
  );
  if (Object.keys(payload).length === 0) return;

  await contratistasService.actualizar(obra.contratista_id, payload);
}

async function ejecutarCargaObrasLote(
  items: ItemCargaObra[],
  onProgreso?: ProgresoCargaCallback,
  rangoPct: { desde: number; hasta: number } = { desde: 0, hasta: 100 },
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

  const { items: itemsUnicos, filasDuplicadas } = deduplicarItemsPorCodigo(items);
  if (filasDuplicadas > 0) {
    resultados.errores.push(
      `${filasDuplicadas} fila(s) duplicada(s) en el archivo (mismo código SIGEDE); se aplicó el último valor de cada una.`,
    );
  }

  const { desde, hasta } = rangoPct;
  const span = hasta - desde;
  const emit = (frac: number, mensaje: string) => {
    notificarProgreso(onProgreso, mensaje, desde + span * Math.min(1, Math.max(0, frac)));
  };

  emit(0, 'Consultando obras ya registradas por código…');
  const existing = await obtenerMapaCodigoAId(itemsUnicos.map((it) => it.codigoNormalizado));

  const sim = new Map(existing);
  const createByTipo = new Map<'Construccion' | 'Mantenimiento', number>();
  for (const it of itemsUnicos) {
    const c = it.codigoNormalizado;
    if (sim.has(c)) continue;
    const tipo = tipoObraNormalizado(it.tipoObraRaw);
    createByTipo.set(tipo, (createByTipo.get(tipo) || 0) + 1);
    sim.set(c, '__nuevo__');
  }

  emit(0.12, 'Reservando identificadores para obras nuevas…');
  const reserved = new Map<'Construccion' | 'Mantenimiento', string[]>();
  const reservedIdx = new Map<'Construccion' | 'Mantenimiento', number>();
  for (const tipo of ['Construccion', 'Mantenimiento'] as const) {
    const n = createByTipo.get(tipo) || 0;
    if (n > 0) {
      reserved.set(tipo, await reservarIdsObraPorTipoObra(tipo, n));
      reservedIdx.set(tipo, 0);
    }
  }

  emit(0.16, 'Resolviendo contratos por lote y número…');
  const contratosPrecargados = await precargarContratosParaCarga(itemsUnicos);
  const itemsConContrato = itemsUnicos.map((it) => ({
    ...it,
    obra: aplicarContratoPrecargado(it.obra, contratosPrecargados),
  }));

  const insertsBuffer: Array<Omit<Obra, 'created_at' | 'updated_at'>> = [];
  const pendientesContratista: Array<{
    codigo: string;
    contratista: Partial<ContratistaCargaArchivo>;
    responsable?: string | null;
  }> = [];

  const flushInserts = async () => {
    if (insertsBuffer.length === 0) return;
    const batchPendientes = pendientesContratista.splice(0, pendientesContratista.length);
    await obrasService.crearObrasLote(insertsBuffer, { chunkSize: INSERT_BATCH });
    for (const pending of batchPendientes) {
      try {
        await sincronizarContratistaCarga(
          pending.codigo,
          pending.contratista,
          pending.responsable,
        );
      } catch {
        /* no bloquear lote por datos de contratista */
      }
    }
    insertsBuffer.length = 0;
  };

  const totalFilas = itemsConContrato.length;
  let filaHecha = 0;
  for (const it of itemsConContrato) {
    try {
      const tipo = tipoObraNormalizado(it.tipoObraRaw);
      const { obra, codigoNormalizado, contratista } = it;

      if (existing.has(codigoNormalizado)) {
        const obraParaActualizar = omitirCamposTransitoriosCarga(obra);
        await obrasService.actualizarObraPorCodigo(codigoNormalizado, obraParaActualizar);
        await sincronizarContratistaCarga(codigoNormalizado, contratista, obra.responsable);
        resultados.actualizadas += 1;
      } else {
        const idsList = reserved.get(tipo);
        const idx = reservedIdx.get(tipo) ?? 0;
        if (!idsList || idx >= idsList.length) {
          throw new Error('No hay ID reservado para una fila nueva');
        }
        reservedIdx.set(tipo, idx + 1);
        const nuevoId = idsList[idx];
        const obraParaCrear = {
          ...omitirCamposTransitoriosCarga(obra),
          id: nuevoId,
          codigo: codigoNormalizado,
          tipo_obra: tipo,
          tipo: inferirTipoObraGestion({
            codigo: codigoNormalizado,
            distrito_minerd_sigede: obra.distrito_minerd_sigede,
            contrato: obra.contrato,
            contrato_id: obra.contrato_id,
          }),
        } as Omit<Obra, 'created_at' | 'updated_at'>;
        insertsBuffer.push(obraParaCrear);
        pendientesContratista.push({
          codigo: codigoNormalizado,
          contratista,
          responsable: obra.responsable,
        });
        existing.set(codigoNormalizado, nuevoId);
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
      const fracFila = 0.22 + 0.78 * (filaHecha / totalFilas);
      emit(
        fracFila,
        `Aplicando cambios en base de datos (${filaHecha}/${totalFilas})…`,
      );
    }
  }

  await flushInserts();
  emit(1, 'Sincronizando últimos registros…');
  return resultados;
}

/**
 * Procesar archivo XML y extraer obras
 */
export const procesarArchivoXml = async (
  file: File,
  onProgreso?: ProgresoCargaCallback,
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

        if (!result.mantenimientos || !result.mantenimientos.obra) {
          reject(
            new Error(
              'Estructura XML inválida: No se encontró el elemento mantenimientos.obra',
            ),
          );
          return;
        }

        const obrasXml = Array.isArray(result.mantenimientos.obra)
          ? result.mantenimientos.obra
          : [result.mantenimientos.obra];

        notificarProgreso(
          onProgreso,
          `Preparando ${obrasXml.length} registro(s) de obra…`,
          26,
        );

        const resultados = {
          total: obrasXml.length,
          exitosas: 0,
          fallidas: 0,
          errores: [] as string[],
          creadas: 0,
          actualizadas: 0,
        };

        const items: ItemCargaObra[] = [];
        for (const obraXml of obrasXml) {
          const { obra, contratista } = mapearRegistroPlantillaObra(
            flatFromXmlObra(obraXml as Record<string, unknown>),
          );

          const codigoNormalizado = normalizarCodigoObra(obra.codigo);
          if (!codigoNormalizado) {
            resultados.fallidas++;
            resultados.errores.push(
              'Obra sin código. El campo "codigo" es obligatorio para crear/actualizar.',
            );
            continue;
          }

          const tipoObra = (obra as any).tipo_obra || 'Construccion';
          const etiquetaError = `Obra ${obraXml.id || obraXml['@_id'] || 'desconocida'}`;
          items.push({ obra, contratista, codigoNormalizado, tipoObraRaw: tipoObra, etiquetaError });
        }

        const lote = await ejecutarCargaObrasLote(items, onProgreso, { desde: 32, hasta: 96 });
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

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

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
          const { obra, contratista } = mapearRegistroPlantillaObra(row);

          const codigoNormalizado = normalizarCodigoObra(obra.codigo);
          if (!codigoNormalizado) {
            resultados.fallidas++;
            resultados.errores.push(
              'Fila sin código. El campo "codigo" es obligatorio para crear/actualizar. Columnas encontradas: ' +
                JSON.stringify(Object.keys(row)),
            );
            continue;
          }

          const tipoObra = (obra as any).tipo_obra || 'Construccion';
          const etiquetaError = `Fila ${rowIdx + 2}`;
          items.push({ obra, contratista, codigoNormalizado, tipoObraRaw: tipoObra, etiquetaError });
        }

        const lote = await ejecutarCargaObrasLote(items, onProgreso, { desde: 30, hasta: 96 });
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
export const validarArchivoXml = async (file: File): Promise<void> => {
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

        if (!result.mantenimientos || !result.mantenimientos.obra) {
          reject(
            new Error(
              'Estructura XML inválida: No se encontró el elemento mantenimientos.obra',
            ),
          );
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
export const validarArchivoExcel = async (file: File): Promise<void> => {
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

        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        if (!jsonData || jsonData.length === 0) {
          reject(new Error('El archivo Excel está vacío'));
          return;
        }

        const firstRow = jsonData[0] as any;
        if (!firstRow.codigo && !firstRow.Código && !firstRow.nombre && !firstRow.Nombre) {
          reject(
            new Error(
              'El archivo Excel no tiene las columnas requeridas (código o nombre)',
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