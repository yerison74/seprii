import { supabase } from '../lib/supabase';
import type {
  ApiResponse,
  ContratoAdendaTechado,
  ContratoTechado,
  ImportTechadoResult,
  MatrizGeneralDetalle,
  MatrizGeneralFilters,
  MatrizGeneralTechado,
  MatrizGeneralVista,
  Obra,
  ObraMatrizTechadoResumen,
} from '../types/database';
import type { FilaMatrizTechadoParseada } from '../utils/parsearMatrizTechadoExcel';
import { normalizarNoContrato, normalizarRegDist } from '../utils/techadoNormalizar';
import { buscarObraIdParaMatriz, type MatrizMatchInput, type ObraMatchCandidata } from '../utils/techadoObraMatch';
import { obrasService } from './supabaseService';
import { TIPO_OBRA_TECHADOS, esTipoObraTechados } from '../constants/tipoObra';
import {
  propagarEstadoMatrizAObra,
  reconciliarEstadoAlVincular,
  sincronizarEstadosObraMatrizEnLote,
} from './obraTechadoSync';
import { adendasVisiblesParaObra } from '../utils/obraDetalleTechado';

async function marcarObraComoTechados(obraId: string): Promise<void> {
  const { error } = await supabase
    .from('obras')
    .update({ tipo_obra: TIPO_OBRA_TECHADOS })
    .eq('id', obraId);
  if (error) throw error;
}

async function sincronizarTiposObraTechadosEnObras(): Promise<number> {
  const { data, error } = await supabase
    .from('matriz_general')
    .select('obra_id')
    .not('obra_id', 'is', null);
  if (error) throw error;
  const ids = Array.from(
    new Set((data || []).map((r) => r.obra_id as string).filter(Boolean)),
  );
  if (ids.length === 0) return 0;
  const { error: upErr } = await supabase
    .from('obras')
    .update({ tipo_obra: TIPO_OBRA_TECHADOS })
    .in('id', ids);
  if (upErr) throw upErr;
  return ids.length;
}

type ContratoContext = Pick<
  FilaMatrizTechadoParseada,
  | 'no_contrato'
  | 'contratista_nombre'
  | 'fecha_contrato'
  | 'presupuesto_centro'
  | 'estatus_contrato'
  | 'proceso'
  | 'certificacion'
  | 'monto_total_inversion'
  | 'monto_total_contrato'
  | 'avance_20_porciento'
  | 'cubicacion_enviada'
  | 'libramiento'
  | 'fecha_salida'
  | 'observaciones_contrato'
  | 'tipo_adenda'
  | 'monto_adendado'
>;

function mergeContratoPayload(
  prev: Partial<ContratoContext>,
  fila: FilaMatrizTechadoParseada,
): ContratoContext {
  const pick = <K extends keyof ContratoContext>(key: K): ContratoContext[K] => {
    const v = fila[key];
    if (v != null && v !== '') return v as ContratoContext[K];
    return prev[key] as ContratoContext[K];
  };
  return {
    no_contrato: fila.no_contrato || prev.no_contrato || '',
    contratista_nombre: pick('contratista_nombre'),
    fecha_contrato: pick('fecha_contrato'),
    presupuesto_centro: pick('presupuesto_centro'),
    estatus_contrato: pick('estatus_contrato'),
    proceso: pick('proceso'),
    certificacion: pick('certificacion'),
    monto_total_inversion: pick('monto_total_inversion'),
    monto_total_contrato: pick('monto_total_contrato'),
    avance_20_porciento: pick('avance_20_porciento'),
    cubicacion_enviada: pick('cubicacion_enviada'),
    libramiento: pick('libramiento'),
    fecha_salida: pick('fecha_salida'),
    observaciones_contrato: pick('observaciones_contrato'),
    tipo_adenda: pick('tipo_adenda'),
    monto_adendado: pick('monto_adendado'),
  };
}

function prepararFilasConContrato(filas: FilaMatrizTechadoParseada[]): FilaMatrizTechadoParseada[] {
  const ctxByLote = new Map<number, ContratoContext>();
  const out: FilaMatrizTechadoParseada[] = [];
  for (const fila of filas) {
    const prev = ctxByLote.get(fila.lote) || { no_contrato: '' };
    const merged = mergeContratoPayload(prev, fila);
    if (merged.no_contrato) ctxByLote.set(fila.lote, merged);
    if (!merged.no_contrato) continue;
    out.push({ ...fila, ...merged });
  }
  return out;
}

async function buscarObraIdParaMatrizEnBd(input: MatrizMatchInput): Promise<string | null> {
  const payload = {
    p_no_contrato: normalizarNoContrato(input.no_contrato),
    p_reg_dist: normalizarRegDist(input.reg_dist),
    p_plantel: (input.plantel || '').trim(),
    p_provincia: input.provincia?.trim() || null,
    p_municipio: input.municipio?.trim() || null,
  };

  const { data, error } = await supabase.rpc('buscar_obra_para_matriz', payload);

  if (error) {
    const msg = error.message || '';
    const rpcNoDisponible =
      msg.includes('buscar_obra_para_matriz') ||
      msg.includes('Could not find the function') ||
      msg.includes('schema cache');
    if (rpcNoDisponible) {
      const obras = await cargarObrasParaMatch();
      return buscarObraIdParaMatriz(obras, {
        ...input,
        no_contrato: payload.p_no_contrato,
        reg_dist: payload.p_reg_dist,
      });
    }
    throw error;
  }

  return (data as string | null) || null;
}

async function cargarObrasParaMatch(): Promise<ObraMatchCandidata[]> {
  const obras: ObraMatchCandidata[] = [];
  const PAGE = 1000;
  let desde = 0;
  while (true) {
    const { data, error } = await supabase
      .from('obras')
      .select('id, contrato, distrito_minerd_sigede, nombre, provincia, municipio')
      .range(desde, desde + PAGE - 1);
    if (error) throw error;
    const lote = (data || []) as ObraMatchCandidata[];
    obras.push(...lote);
    if (lote.length < PAGE) break;
    desde += PAGE;
  }
  return obras;
}

function matrizPayloadFromFila(
  fila: FilaMatrizTechadoParseada,
  contratoId: string,
  obraId?: string | null,
): Omit<MatrizGeneralTechado, 'id' | 'created_at' | 'updated_at'> {
  const base: Omit<MatrizGeneralTechado, 'id' | 'created_at' | 'updated_at' | 'obra_id'> & {
    obra_id?: string | null;
  } = {
    contrato_id: contratoId,
    lote: fila.lote,
    plantel: (fila.plantel || '').trim(),
    provincia: fila.provincia,
    municipio: fila.municipio,
    reg_dist: fila.reg_dist,
    ejecucion_actual: fila.ejecucion_actual,
    observaciones: fila.observaciones,
    estatus: fila.estatus,
    porcentaje_ejecucion: fila.porcentaje_ejecucion,
    porcentaje_ejecucion_alt: fila.porcentaje_ejecucion_alt,
    fecha_inauguracion: fila.fecha_inauguracion,
    anio_proceso: fila.anio_proceso,
    monto_contratado_centro: fila.monto_contratado_centro ?? fila.presupuesto_centro,
    monto_cubicado_centro: fila.monto_cubicado_centro,
    porcentaje_cubicado_centro: fila.porcentaje_cubicado_centro,
    monto_total_cubicado_sin_amort: fila.monto_total_cubicado_sin_amort,
    porciento_cubicado: fila.porciento_cubicado,
    pendiente_a_cubicar: fila.pendiente_a_cubicar,
    monto_total_pagado: fila.monto_total_pagado,
    monto_avance_centro: fila.monto_avance_centro,
    fecha_ultima_cubicacion: fila.fecha_ultima_cubicacion,
    estatus_ultima_cubicacion: fila.estatus_ultima_cubicacion,
    numero_ultima_cubicacion: fila.numero_ultima_cubicacion,
    monto_ultima_cubicacion: fila.monto_ultima_cubicacion,
    valor_cubicado_presupuesto_base: fila.valor_cubicado_presupuesto_base,
    adicional_cubicacion: fila.adicional_cubicacion,
    movimiento_tierra: fila.movimiento_tierra,
    obs_movimiento_tierra: fila.obs_movimiento_tierra,
    obs_planos_arquitectonicos: fila.obs_planos_arquitectonicos,
    obs_diseno: fila.obs_diseno,
    as_built: fila.as_built,
    diseno_arquitectonico: fila.diseno_arquitectonico,
    diseno_estructural: fila.diseno_estructural,
    diseno_sanitario: fila.diseno_sanitario,
    diseno_electrico: fila.diseno_electrico,
    diseno_hidraulico: fila.diseno_hidraulico,
    paisajismo: fila.paisajismo,
    plano_terminacion: fila.plano_terminacion,
    presupuesto_terminacion: fila.presupuesto_terminacion,
    monto_presupuesto_terminacion: fila.monto_presupuesto_terminacion,
  };
  if (obraId) return { ...base, obra_id: obraId };
  return base;
}

function contratoRowFromFila(fila: FilaMatrizTechadoParseada) {
  return {
    lote: fila.lote,
    no_contrato: normalizarNoContrato(fila.no_contrato),
    contratista_nombre: fila.contratista_nombre,
    fecha_contrato: fila.fecha_contrato,
    presupuesto_centro: fila.presupuesto_centro,
    estatus_contrato: fila.estatus_contrato,
    proceso: fila.proceso,
    certificacion: fila.certificacion,
    monto_total_inversion: fila.monto_total_inversion,
    monto_total_contrato: fila.monto_total_contrato,
    avance_20_porciento: fila.avance_20_porciento,
    cubicacion_enviada: fila.cubicacion_enviada,
    libramiento: fila.libramiento,
    fecha_salida: fila.fecha_salida,
    observaciones: fila.observaciones_contrato,
  };
}

async function obtenerMatrizExistente(
  contratoId: string,
  plantel: string,
): Promise<{ id: string; obra_id: string | null } | null> {
  const { data, error } = await supabase
    .from('matriz_general')
    .select('id, obra_id')
    .eq('contrato_id', contratoId)
    .eq('plantel', plantel)
    .maybeSingle();
  if (error) throw error;
  return data ? { id: data.id as string, obra_id: (data.obra_id as string | null) ?? null } : null;
}

async function resolverObraIdParaImport(
  fila: FilaMatrizTechadoParseada,
  contratoId: string,
  plantel: string,
  matrizExistente: { obra_id: string | null } | null,
): Promise<string | null> {
  const matched = await buscarObraIdParaMatrizEnBd({
    no_contrato: fila.no_contrato,
    reg_dist: fila.reg_dist,
    plantel,
    provincia: fila.provincia,
    municipio: fila.municipio,
  });
  if (matched) return matched;
  return matrizExistente?.obra_id ?? null;
}

async function upsertAdendaDesdeFila(
  contratoId: string,
  fila: FilaMatrizTechadoParseada,
): Promise<'creada' | 'actualizada' | null> {
  if (!fila.tipo_adenda && fila.monto_adendado == null && !fila.certificacion) return null;

  const tipo = fila.tipo_adenda?.trim() || null;
  const certificacion = fila.certificacion?.trim() || null;

  let consulta = supabase.from('contrato_adenda').select('id').eq('contrato_id', contratoId);
  if (tipo) {
    consulta = consulta.eq('tipo_adenda', tipo);
  } else if (certificacion) {
    consulta = consulta.eq('certificacion', certificacion);
  } else {
    return null;
  }

  const { data: existente } = await consulta.maybeSingle();

  const payload = {
    contrato_id: contratoId,
    tipo_adenda: tipo,
    certificacion,
    monto_adendado: fila.monto_adendado,
  };

  if (existente?.id) {
    const { error } = await supabase.from('contrato_adenda').update(payload).eq('id', existente.id);
    if (error) throw error;
    return 'actualizada';
  }

  const { error } = await supabase.from('contrato_adenda').insert(payload);
  if (error) throw error;
  return 'creada';
}

export const techadoService = {
  obtenerMatrizGeneral: async (
    filtros: MatrizGeneralFilters = {},
  ): Promise<ApiResponse<MatrizGeneralVista[]>> => {
    let query = supabase.from('v_matriz_general_techado').select('*', { count: 'exact' });

    if (filtros.estatus?.trim()) {
      query = query.ilike('estatus', filtros.estatus.trim());
    }
    if (filtros.search?.trim()) {
      const p = `%${filtros.search.trim()}%`;
      query = query.or(
        [
          `plantel.ilike.${p}`,
          `no_contrato.ilike.${p}`,
          `provincia.ilike.${p}`,
          `municipio.ilike.${p}`,
          `reg_dist.ilike.${p}`,
          `contratista_nombre.ilike.${p}`,
        ].join(','),
      );
    }

    query = query.order('lote', { ascending: true }).order('plantel', { ascending: true });

    if (filtros.limit) query = query.limit(filtros.limit);
    if (filtros.offset != null && filtros.limit) {
      query = query.range(filtros.offset, filtros.offset + filtros.limit - 1);
    }

    const { data, error, count } = await query;
    if (error) throw error;
    let rows = (data || []).map((r) => ({
      ...(r as MatrizGeneralVista),
      id: (r as MatrizGeneralVista).matriz_general_id || (r as MatrizGeneralVista).id,
    }));

    const obraIds = Array.from(
      new Set(rows.map((r) => r.obra_id).filter(Boolean) as string[]),
    );
    if (obraIds.length > 0) {
      const { data: obrasEstado } = await supabase
        .from('obras')
        .select('id, estado')
        .in('id', obraIds);
      const estadoPorObra = new Map(
        (obrasEstado || []).map((o) => [o.id as string, (o.estado ?? '').trim()]),
      );
      rows = rows.map((fila) => {
        if (!fila.obra_id) return fila;
        const estadoObra = estadoPorObra.get(fila.obra_id);
        if (!estadoObra) return fila;
        return { ...fila, estatus: estadoObra };
      });
    }

    return { data: rows, count: count ?? rows.length };
  },

  obtenerDetalleMatriz: async (matrizId: string): Promise<MatrizGeneralDetalle> => {
    const { data: matriz, error } = await supabase
      .from('matriz_general')
      .select('*')
      .eq('id', matrizId)
      .maybeSingle();
    if (error) throw error;
    if (!matriz) throw new Error('Registro de matriz no encontrado');

    const { data: contrato, error: cErr } = await supabase
      .from('contrato')
      .select('*')
      .eq('id', matriz.contrato_id)
      .single();
    if (cErr) throw cErr;

    const { data: adendas } = await supabase
      .from('contrato_adenda')
      .select('*')
      .eq('contrato_id', matriz.contrato_id)
      .order('orden', { ascending: true });

    let obra: Obra | null = null;
    if (matriz.obra_id) {
      await reconciliarEstadoAlVincular(matriz.obra_id, matriz.estatus);
      obra = await obrasService.obtenerObraPorIdObra(matriz.obra_id);
      if (obra?.estado?.trim()) {
        (matriz as MatrizGeneralTechado).estatus = obra.estado;
      }
    }

    return {
      matriz: matriz as MatrizGeneralTechado,
      contrato: contrato as ContratoTechado,
      adendas: (adendas || []) as ContratoAdendaTechado[],
      obra,
    };
  },

  actualizarMatriz: async (
    id: string,
    updates: Partial<MatrizGeneralTechado>,
  ): Promise<MatrizGeneralTechado> => {
    const { data: previo } = await supabase
      .from('matriz_general')
      .select('obra_id, estatus')
      .eq('id', id)
      .maybeSingle();

    const { data, error } = await supabase
      .from('matriz_general')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;

    const obraId = updates.obra_id ?? data.obra_id ?? previo?.obra_id ?? null;
    if (obraId) {
      if (updates.obra_id) {
        await marcarObraComoTechados(obraId);
        await reconciliarEstadoAlVincular(obraId, data.estatus ?? previo?.estatus);
      }
      if (updates.estatus !== undefined && updates.estatus?.trim()) {
        await propagarEstadoMatrizAObra(obraId, updates.estatus);
      }
    }

    return data as MatrizGeneralTechado;
  },

  actualizarContrato: async (
    id: string,
    updates: Partial<ContratoTechado>,
  ): Promise<ContratoTechado> => {
    const { data, error } = await supabase
      .from('contrato')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    return data as ContratoTechado;
  },

  crearTechado: async (input: import('../types/database').CrearTechadoInput) => {
    const lote = Number(input.lote);
    if (!Number.isFinite(lote) || lote < 1) {
      throw new Error('Indique un número de lote válido (entero mayor que 0).');
    }

    const noContrato = normalizarNoContrato(input.no_contrato);
    if (!noContrato) {
      throw new Error('El número de contrato es obligatorio (formato xxxx-xxxx).');
    }

    const plantel = (input.plantel || '').trim();
    if (!plantel) {
      throw new Error('El nombre del plantel es obligatorio.');
    }

    const { data: upsertedContrato, error: cErr } = await supabase
      .from('contrato')
      .upsert(
        {
          lote,
          no_contrato: noContrato,
          contratista_nombre: input.contratista_nombre?.trim() || null,
        },
        { onConflict: 'lote,no_contrato' },
      )
      .select('id')
      .single();
    if (cErr) throw cErr;

    const contratoId = upsertedContrato.id as string;
    const matrizExistente = await obtenerMatrizExistente(contratoId, plantel);
    if (matrizExistente) {
      throw new Error(
        `Ya existe un techado para «${plantel}» en el contrato ${noContrato} (lote ${lote}).`,
      );
    }

    let obraId = input.obra_id?.trim() || null;
    const regDist = normalizarRegDist(input.reg_dist) || null;
    if (!obraId) {
      obraId = await buscarObraIdParaMatrizEnBd({
        no_contrato: noContrato,
        reg_dist: regDist,
        plantel,
        provincia: input.provincia,
        municipio: input.municipio,
      });
    }

    const estatus = input.estatus?.trim() || null;
    const matrizPayload = {
      contrato_id: contratoId,
      lote,
      plantel,
      provincia: input.provincia?.trim() || null,
      municipio: input.municipio?.trim() || null,
      reg_dist: regDist,
      estatus,
      ...(obraId ? { obra_id: obraId } : {}),
    };

    const { data: matriz, error: mErr } = await supabase
      .from('matriz_general')
      .insert(matrizPayload)
      .select('id')
      .single();
    if (mErr) throw mErr;

    const matrizId = matriz.id as string;

    if (obraId) {
      await marcarObraComoTechados(obraId);
      await reconciliarEstadoAlVincular(obraId, estatus);
    }

    return {
      matrizId,
      contratoId,
      obraVinculada: !!obraId,
    };
  },

  vincularObrasEnMatriz: async (): Promise<{ vinculadas: number; sinObra: number }> => {
    const { data: filas, error } = await supabase
      .from('matriz_general')
      .select('id, plantel, reg_dist, contrato_id, obra_id, contrato(no_contrato), provincia, municipio')
      .is('obra_id', null);
    if (error) throw error;

    let vinculadas = 0;
    let sinObra = 0;
    for (const row of filas || []) {
      const c = row.contrato as { no_contrato?: string } | null;
      const obraId = await buscarObraIdParaMatrizEnBd({
        no_contrato: c?.no_contrato || '',
        reg_dist: row.reg_dist,
        plantel: row.plantel,
        provincia: row.provincia,
        municipio: row.municipio,
      });
      if (!obraId) {
        sinObra++;
        continue;
      }
      const { error: upErr } = await supabase
        .from('matriz_general')
        .update({ obra_id: obraId })
        .eq('id', row.id);
      if (!upErr) {
        vinculadas++;
        await marcarObraComoTechados(obraId);
        const { data: matrizRow } = await supabase
          .from('matriz_general')
          .select('estatus')
          .eq('id', row.id)
          .maybeSingle();
        await reconciliarEstadoAlVincular(obraId, matrizRow?.estatus);
      }
    }
    await sincronizarTiposObraTechadosEnObras();
    await sincronizarEstadosObraMatrizEnLote();
    return { vinculadas, sinObra };
  },

  /** Alinea obras.estado con matriz_general.estatus en obras vinculadas. */
  sincronizarEstadosObraMatriz: sincronizarEstadosObraMatrizEnLote,

  /** Actualiza obras.tipo_obra = Techados para todas las obras enlazadas en matriz_general. */
  sincronizarTiposObraTechados: sincronizarTiposObraTechadosEnObras,

  /** Si la obra está en matriz_general, asegura tipo_obra Techados y devuelve el tipo a mostrar. */
  resolverTipoObraParaDetalle: async (obra: Obra): Promise<string | null> => {
    if (esTipoObraTechados(obra.tipo_obra)) return TIPO_OBRA_TECHADOS;

    const { count, error } = await supabase
      .from('matriz_general')
      .select('id', { count: 'exact', head: true })
      .eq('obra_id', obra.id);
    if (error) throw error;
    if ((count ?? 0) > 0) {
      await marcarObraComoTechados(obra.id);
      return TIPO_OBRA_TECHADOS;
    }
    return obra.tipo_obra ?? null;
  },

  obraPerteneceAMatrizTechado: async (obraId: string): Promise<boolean> => {
    const { count, error } = await supabase
      .from('matriz_general')
      .select('id', { count: 'exact', head: true })
      .eq('obra_id', obraId);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  importarMatrizDesdeFilas: async (
    filasRaw: FilaMatrizTechadoParseada[],
  ): Promise<ImportTechadoResult> => {
    const filas = prepararFilasConContrato(filasRaw);
    const result: ImportTechadoResult = {
      contratos: 0,
      contratosCreados: 0,
      contratosActualizados: 0,
      matriz: 0,
      matrizCreadas: 0,
      matrizActualizadas: 0,
      adendas: 0,
      adendasCreadas: 0,
      adendasActualizadas: 0,
      obrasVinculadas: 0,
      sinObra: 0,
      errores: [],
    };

    const contratosConocidos = new Set<string>();
    const contratosProcesadosEnImport = new Set<string>();

    const { data: contratosDb, error: contratosErr } = await supabase
      .from('contrato')
      .select('id, lote, no_contrato');
    if (contratosErr) throw contratosErr;
    for (const c of contratosDb || []) {
      const key = `${c.lote}|${normalizarNoContrato(String(c.no_contrato))}`;
      contratosConocidos.add(key);
    }

    for (const fila of filas) {
      try {
        const plantel = (fila.plantel || '').trim();
        if (!plantel) continue;

        const key = `${fila.lote}|${normalizarNoContrato(fila.no_contrato)}`;
        const contratoExistente = contratosConocidos.has(key);

        const { data: upsertedContrato, error: cErr } = await supabase
          .from('contrato')
          .upsert(contratoRowFromFila(fila), { onConflict: 'lote,no_contrato' })
          .select('id')
          .single();
        if (cErr) throw cErr;

        const contratoId = upsertedContrato.id as string;
        if (!contratosProcesadosEnImport.has(key)) {
          contratosProcesadosEnImport.add(key);
          if (contratoExistente) {
            result.contratosActualizados = (result.contratosActualizados ?? 0) + 1;
          } else {
            result.contratosCreados = (result.contratosCreados ?? 0) + 1;
            contratosConocidos.add(key);
          }
        }

        const adendaResult = await upsertAdendaDesdeFila(contratoId, fila);
        if (adendaResult === 'creada') {
          result.adendas++;
          result.adendasCreadas = (result.adendasCreadas ?? 0) + 1;
        } else if (adendaResult === 'actualizada') {
          result.adendas++;
          result.adendasActualizadas = (result.adendasActualizadas ?? 0) + 1;
        }

        const matrizExistente = await obtenerMatrizExistente(contratoId, plantel);
        const obraId = await resolverObraIdParaImport(fila, contratoId, plantel, matrizExistente);

        if (obraId) {
          result.obrasVinculadas++;
          await marcarObraComoTechados(obraId);
          if (fila.estatus?.trim()) {
            await propagarEstadoMatrizAObra(obraId, fila.estatus);
          }
        } else {
          result.sinObra++;
        }

        const payload = matrizPayloadFromFila(fila, contratoId, obraId);
        const { error: mErr } = await supabase
          .from('matriz_general')
          .upsert(payload, { onConflict: 'contrato_id,plantel' });
        if (mErr) throw mErr;

        result.matriz++;
        if (matrizExistente) {
          result.matrizActualizadas = (result.matrizActualizadas ?? 0) + 1;
        } else {
          result.matrizCreadas = (result.matrizCreadas ?? 0) + 1;
        }
      } catch (e: unknown) {
        result.errores.push(
          `Lote ${fila.lote} / ${fila.plantel}: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
    }

    result.contratos = (result.contratosCreados ?? 0) + (result.contratosActualizados ?? 0);

    await sincronizarTiposObraTechadosEnObras();
    await sincronizarEstadosObraMatrizEnLote();

    return result;
  },

  /** Estatus/estado distintos en matriz_general y obras Techado, normalizados. */
  obtenerEstatusDistintos: async (): Promise<string[]> => {
    const PAGE = 1000;
    const vistos = new Map<string, string>();
    const agregar = (valor?: string | null) => {
      const norm = obrasService.normalizarEstadoDashboard(valor);
      if (norm === 'NO ESPECIFICADO') return;
      if (!vistos.has(norm)) vistos.set(norm, norm);
    };

    let desde = 0;
    while (true) {
      const { data, error } = await supabase
        .from('matriz_general')
        .select('estatus')
        .range(desde, desde + PAGE - 1);
      if (error) throw error;
      const lote = data || [];
      for (const row of lote) agregar(row.estatus);
      if (lote.length < PAGE) break;
      desde += PAGE;
    }

    const estadosObras = await obrasService.obtenerEstadosDistintos();
    for (const estado of estadosObras) agregar(estado);

    return Array.from(vistos.values()).sort((a, b) => a.localeCompare(b, 'es'));
  },

  /** Matriz Techado vinculada a una obra (para resumen en Gestión de Obras). */
  obtenerResumenPorObraId: async (obraId: string): Promise<ObraMatrizTechadoResumen[]> => {
    const id = (obraId || '').trim();
    if (!id) return [];

    const { data: matrices, error } = await supabase
      .from('matriz_general')
      .select('*')
      .eq('obra_id', id)
      .order('lote', { ascending: true })
      .order('plantel', { ascending: true });
    if (error) throw error;
    if (!matrices?.length) return [];

    const contratoIds = Array.from(new Set(matrices.map((m) => m.contrato_id as string)));
    const { data: contratos, error: cErr } = await supabase
      .from('contrato')
      .select('*')
      .in('id', contratoIds);
    if (cErr) throw cErr;

    const { data: adendas, error: aErr } = await supabase
      .from('contrato_adenda')
      .select('*')
      .in('contrato_id', contratoIds)
      .order('orden', { ascending: true });
    if (aErr) throw aErr;

    const contratoPorId = new Map((contratos || []).map((c) => [c.id as string, c as ContratoTechado]));
    const adendasPorContrato = new Map<string, ContratoAdendaTechado[]>();
    for (const a of adendas || []) {
      const cid = a.contrato_id as string;
      const lista = adendasPorContrato.get(cid) || [];
      lista.push(a as ContratoAdendaTechado);
      adendasPorContrato.set(cid, lista);
    }

    return matrices
      .map((m) => {
        const contrato = contratoPorId.get(m.contrato_id as string);
        if (!contrato) return null;
        return {
          matriz: m as MatrizGeneralTechado,
          contrato,
          adendas: adendasVisiblesParaObra(
            adendasPorContrato.get(m.contrato_id as string) || [],
            contrato,
          ),
        };
      })
      .filter((x): x is ObraMatrizTechadoResumen => x != null);
  },

  buscarObraParaMatriz: async (input: {
    no_contrato: string;
    reg_dist?: string | null;
    plantel: string;
    provincia?: string | null;
    municipio?: string | null;
  }): Promise<string | null> => {
    return buscarObraIdParaMatrizEnBd({
      ...input,
      no_contrato: normalizarNoContrato(input.no_contrato),
      reg_dist: normalizarRegDist(input.reg_dist),
    });
  },
};
