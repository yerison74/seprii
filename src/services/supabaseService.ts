import { supabase } from '../lib/supabase';
import type {
  Obra,
  Tramite,
  MovimientoTramite,
  TiempoEnArea,
  NotificacionTiempo,
  HistorialUpload,
  ObrasFilters,
  TramitesFilters,
  ApiResponse,
  Area,
  FormularioContratista,
  MovimientoSolicitudContratista,
  ReporteObrasStats,
  ObraUbicacionGps,
  Contratista,
  DocumentoTecnicoObra,
  ObraSigedeResumen,
  MovimientoDocumentoTecnicoObra,
  Adenda,
  ContratoTechado,
  EstadoAdenda,
} from '../types/database';
import { aplicarFiltrosObrasEnQuery } from '../utils/aplicarFiltrosObrasQuery';
import { ordenarMovimientosDocumento, validarMovimientoDocumento } from '../utils/validarMovimientoDocumento';
import { esEstatusMovimientoValido } from '../constants/gestionTecnicaDocumento';
import {
  OBRAS_SELECT_COMPLETO,
  OBRAS_SELECT_DASHBOARD_PROXIMAS,
  resolverObrasSelect,
  resolverObrasSelectSinJoin,
} from '../constants/obrasSelect';
import { propagarEstadoObraAMatriz } from './obraTechadoSync';
import { contratoObrasService, numeroContratoDesdeObra } from './contratoObrasService';
import {
  inferirTipoObraGestion,
  TIPO_OBRA_GESTION_ARRASTRE,
  TIPO_OBRA_GESTION_MANTENIMIENTO,
} from '../constants/tipoObraGestion';
import { reservarIdsObra } from '../utils/reservarIdObra';
import { normalizarCodigoObra } from '../utils/normalizarCodigoObra';
import { normalizarNoContrato } from '../utils/techadoNormalizar';
import { MARCA_OBSERVACION_GESTION_TECNICA } from '../utils/tramiteGestionTecnica';

// ── Generador de token seguro (Web Crypto API) ──────────────────────────────
function generarToken(longitud = 32): string {
  const bytes = new Uint8Array(longitud);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, longitud);
}

/**
 * Servicio de Supabase para reemplazar las llamadas API del backend
 */

// ============================================
// SERVICIO DE ÁREAS
// ============================================

export const areasService = {
  /** Obtener todas las áreas definidas en la tabla `area`. */
  obtenerAreas: async (): Promise<Area[]> => {
    try {
      const { data, error } = await supabase
        .from('area')
        .select('*')
        .order('area', { ascending: true });
      if (error) throw error;
      return (data as Area[]) || [];
    } catch (error: any) {
      console.error('Error al obtener áreas:', error);
      throw new Error(error.message || 'Error al obtener áreas');
    }
  },
};

// ============================================
// SERVICIO DE FORMULARIO CONTRATISTA
// ============================================

const AREA_GESTION_CONTRATISTA = 'Oficina de gestión del contratista';

export const formularioContratistaService = {
  /** Garantiza registro espejo en `tramites` para cumplir FK de `movimientos_tramites.tramite_id`. */
  asegurarTramiteContratista: async (solicitudId: string): Promise<void> => {
    const { data: existing, error: selErr } = await supabase
      .from('tramites')
      .select('id')
      .eq('id', solicitudId)
      .maybeSingle();
    if (selErr) throw selErr;
    if (existing?.id) return;

    const { data: solicitud, error: formErr } = await supabase
      .from('formulario_contratista')
      .select('*')
      .eq('id', solicitudId)
      .single();
    if (formErr) throw formErr;
    if (!solicitud) throw new Error('Solicitud de contratista no encontrada');

    const areaActual = solicitud.area_actual || 'Pendiente de asignación';
    const estadoActual = solicitud.estado === 'detenido' || solicitud.estado === 'completado'
      ? solicitud.estado
      : 'en_transito';
    const titulo = `${solicitud.motivo_visita || 'Solicitud contratista'} - ${solicitud.nombres || ''} ${solicitud.apellidos || ''}`.trim();
    const destinatario = `${solicitud.nombres || ''} ${solicitud.apellidos || ''}`.trim() || 'Solicitante contratista';

    const { error: insErr } = await supabase.from('tramites').insert({
      id: solicitudId,
      titulo,
      oficio: solicitud.numero_contrato || null,
      nombre_destinatario: destinatario,
      area_destinatario: areaActual,
      area_destino_final: areaActual,
      proceso: null,
      estado: estadoActual,
      codigo_barras: solicitudId,
      archivo_pdf: null,
      nombre_archivo: null,
    });
    if (insErr) throw insErr;
  },

  crear: async (
    payload: Omit<FormularioContratista, 'id'>
  ): Promise<FormularioContratista> => {
    try {
      const withDefaults: Omit<FormularioContratista, 'id'> = {
        ...(payload as any),
        area_actual: (payload as any).area_actual ?? AREA_GESTION_CONTRATISTA,
        estado: (payload as any).estado ?? 'pendiente_asignacion',
      };
      const { data, error } = await supabase
        .from('formulario_contratista')
        .insert([withDefaults])
        .select('*')
        .single();
      if (error) throw error;
      if (!data) throw new Error('No se pudo crear el formulario');
      return data as FormularioContratista;
    } catch (error: any) {
      console.error('Error al crear formulario de contratista:', error);
      throw new Error(error.message || 'Error al crear formulario de contratista');
    }
  },

  /**
   * Listado: si no es admin/supervisión, solo solicitudes cuyo `area_actual` coincide con el área del usuario
   * (misma lógica que trámites con `area_destinatario`).
   */
  obtener: async (
    limit = 50,
    filtros: { areaUsuario?: string; esAdmin?: boolean } = {}
  ): Promise<FormularioContratista[]> => {
    try {
      if (!filtros.esAdmin && !filtros.areaUsuario) {
        return [];
      }

      let query = supabase
        .from('formulario_contratista')
        .select('*');

      if (!filtros.esAdmin && filtros.areaUsuario) {
        query = query.eq('area_actual', filtros.areaUsuario);
      }

      // Traer un lote mayor que `limit` para poder ordenar por última modificación (espejo en `tramites`)
      // y luego recortar; si no, el LIMIT en SQL podría excluir solicitudes antiguas por fecha_visita pero tocadas hace poco.
      const fetchCap = Math.min(1000, Math.max(limit * 10, limit));
      query = query.limit(fetchCap);

      const { data, error } = await query;
      if (error) throw error;
      const rows = (data || []) as FormularioContratista[];

      const ids = rows.map((r) => r.id).filter(Boolean);
      const tsById: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: tramRows, error: tramErr } = await supabase
          .from('tramites')
          .select('id, updated_at, fecha_creacion')
          .in('id', ids);
        if (!tramErr && tramRows?.length) {
          for (const t of tramRows as {
            id: string;
            updated_at?: string | null;
            fecha_creacion?: string | null;
          }[]) {
            const raw = t.updated_at || t.fecha_creacion;
            if (raw) tsById[t.id] = new Date(raw).getTime();
          }
        }
      }

      const fallbackTs = (r: FormularioContratista) => {
        const d = r.fecha_visita ? new Date(`${r.fecha_visita}T12:00:00`) : new Date(0);
        return d.getTime();
      };

      const sorted = [...rows].sort((a, b) => {
        const ta = tsById[a.id] ?? fallbackTs(a);
        const tb = tsById[b.id] ?? fallbackTs(b);
        if (tb !== ta) return tb - ta;
        return b.id.localeCompare(a.id);
      });

      return sorted.slice(0, limit);
    } catch (error: any) {
      console.error('Error al obtener formularios de contratista:', error);
      throw new Error(error.message || 'Error al obtener formularios de contratista');
    }
  },

  /** Sugerencias para nombre_empresa desde contratistas y formulario_contratista. */
  obtenerSugerenciasNombreEmpresa: async (search: string, limit = 8): Promise<string[]> => {
    const term = (search || '').trim();
    if (!term) return [];
    try {
      const [contratistasRes, contratistaRes] = await Promise.all([
        supabase
          .from('contratistas')
          .select('responsable')
          .ilike('responsable', `%${term}%`)
          .not('responsable', 'is', null)
          .limit(limit * 2),
        supabase
          .from('formulario_contratista')
          .select('nombre_empresa')
          .ilike('nombre_empresa', `%${term}%`)
          .not('nombre_empresa', 'is', null)
          .limit(limit * 2),
      ]);

      if (contratistasRes.error && contratistasRes.error.code !== '42P01') {
        throw contratistasRes.error;
      }
      if (contratistaRes.error) throw contratistaRes.error;

      const unique = new Set<string>();
      for (const row of contratistasRes.data || []) {
        const value = (row as { responsable?: string })?.responsable?.trim();
        if (value) unique.add(value);
      }
      for (const row of contratistaRes.data || []) {
        const value = (row as any)?.nombre_empresa?.trim();
        if (value) unique.add(value);
      }
      return Array.from(unique).slice(0, limit);
    } catch (error: any) {
      console.error('Error al obtener sugerencias de nombre de empresa:', error);
      return [];
    }
  },

  obtenerPorId: async (
    id: string,
    filtros?: { areaUsuario?: string; esAdmin?: boolean }
  ): Promise<FormularioContratista | null> => {
    try {
      if (!filtros?.esAdmin && !filtros?.areaUsuario) {
        return null;
      }

      const { data, error } = await supabase
        .from('formulario_contratista')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;

      if (!filtros?.esAdmin && filtros?.areaUsuario) {
        if ((data as FormularioContratista).area_actual !== filtros.areaUsuario) {
          return null;
        }
      }

      return data as FormularioContratista;
    } catch (error: any) {
      console.error('Error al obtener formulario de contratista por id:', error);
      throw new Error(error.message || 'Error al obtener la solicitud');
    }
  },

  /** Primera asignación a un área (pasa a en_seguimiento). */
  asignarArea: async (
    solicitudId: string,
    payload: { area_nombre: string; usuario: string; nota?: string | null }
  ): Promise<FormularioContratista> => {
    try {
      await formularioContratistaService.asegurarTramiteContratista(solicitudId);
      const { data, error } = await supabase
        .from('formulario_contratista')
        .update({
          area_actual: payload.area_nombre,
          estado: 'en_seguimiento',
        })
        .eq('id', solicitudId)
        .select('*')
        .single();
      if (error) throw error;
      if (!data) throw new Error('No se pudo actualizar la solicitud');

      const { error: movError } = await supabase.from('movimientos_tramites').insert({
        tramite_id: solicitudId,
        area_origen: 'Pendiente de asignación',
        area_destino: payload.area_nombre,
        observaciones: payload.nota ?? null,
        estado_resultante: null,
        usuario: payload.usuario,
      });
      if (movError) throw movError;

      // Mantener sincronizado el espejo en `tramites` para reportes/listado unificado.
      await supabase
        .from('tramites')
        .update({
          area_destinatario: payload.area_nombre,
          area_destino_final: payload.area_nombre,
          estado: 'en_transito',
        })
        .eq('id', solicitudId);

      return data as FormularioContratista;
    } catch (error: any) {
      if (error?.code === '42P01') {
        throw new Error(
          'Falta la tabla movimientos_tramites o columnas area_actual/estado.'
        );
      }
      console.error('Error al asignar área a solicitud:', error);
      throw new Error(error.message || 'Error al asignar área');
    }
  },

  /** Envío a otra área y/o detenido / completado (misma lógica que trámites). */
  registrarMovimiento: async (
    solicitudId: string,
    payload: {
      area_origen: string;
      area_destino: string;
      nota?: string | null;
      estado_resultante: '' | 'detenido' | 'completado';
      usuario: string;
      nuevo_estado: 'en_seguimiento' | 'detenido' | 'completado';
      nueva_area_actual: string;
    }
  ): Promise<FormularioContratista> => {
    try {
      await formularioContratistaService.asegurarTramiteContratista(solicitudId);
      const { error: movError } = await supabase.from('movimientos_tramites').insert({
        tramite_id: solicitudId,
        area_origen: payload.area_origen,
        area_destino: payload.area_destino,
        observaciones: payload.nota ?? null,
        estado_resultante: payload.estado_resultante || null,
        usuario: payload.usuario,
      });
      if (movError) throw movError;

      const { data, error } = await supabase
        .from('formulario_contratista')
        .update({
          area_actual: payload.nueva_area_actual,
          estado: payload.nuevo_estado,
        })
        .eq('id', solicitudId)
        .select('*')
        .single();

      if (error) throw error;
      if (!data) throw new Error('No se pudo actualizar la solicitud');

      const estadoTramite = payload.nuevo_estado === 'completado'
        ? 'completado'
        : payload.nuevo_estado === 'detenido'
          ? 'detenido'
          : 'en_transito';
      await supabase
        .from('tramites')
        .update({
          area_destinatario: payload.nueva_area_actual,
          area_destino_final: payload.nueva_area_actual,
          estado: estadoTramite,
        })
        .eq('id', solicitudId);
      return data as FormularioContratista;
    } catch (error: any) {
      if (error?.code === '42P01') {
        throw new Error('Falta la tabla movimientos_tramites.');
      }
      console.error('Error al registrar movimiento de solicitud:', error);
      throw new Error(error.message || 'Error al registrar seguimiento');
    }
  },

  /** Sincroniza área/estado de formulario_contratista desde un movimiento ya registrado en tramites. */
  sincronizarDesdeTramite: async (
    solicitudId: string,
    payload: {
      nueva_area_actual: string;
      nuevo_estado: 'en_seguimiento' | 'detenido' | 'completado';
    }
  ): Promise<void> => {
    try {
      const { error } = await supabase
        .from('formulario_contratista')
        .update({
          area_actual: payload.nueva_area_actual,
          estado: payload.nuevo_estado,
        })
        .eq('id', solicitudId);
      if (error) throw error;
    } catch (error: any) {
      console.error('Error al sincronizar solicitud de contratista desde trámite:', error);
      throw new Error(error.message || 'Error al sincronizar solicitud de contratista');
    }
  },

  obtenerMovimientos: async (solicitudId: string): Promise<MovimientoSolicitudContratista[]> => {
    try {
      const { data, error } = await supabase
        .from('movimientos_tramites')
        .select('*')
        .eq('tramite_id', solicitudId)
        .order('fecha_movimiento', { ascending: false });
      if (error) throw error;
      return (data || []).map((m: any) => ({
        id: m.id,
        solicitud_id: m.tramite_id,
        area_origen: m.area_origen,
        area_destino: m.area_destino,
        nota: m.observaciones ?? null,
        estado_resultante: m.estado_resultante ?? null,
        usuario: m.usuario ?? null,
        fecha_movimiento: m.fecha_movimiento ?? null,
      })) as MovimientoSolicitudContratista[];
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      console.error('Error al obtener movimientos de solicitud:', error);
      throw new Error(error.message || 'Error al obtener el historial');
    }
  },

  /**
   * Obtiene el token QR de una solicitud. Si no existe lo crea.
   * Así el token siempre es el mismo independientemente de desde
   * dónde se genere la URL (formulario público o panel sepri-main).
   */
  obtenerOCrearToken: async (solicitudId: string): Promise<string> => {
    // 1. Buscar token activo existente
    const { data: existing } = await supabase
      .from('contratista_access_tokens')
      .select('token')
      .eq('solicitud_id', solicitudId)
      .eq('is_active', true)
      .maybeSingle();

    if (existing?.token) return existing.token;

    // 2. Crear uno nuevo
    const token = generarToken(32);
    const { data: inserted, error } = await supabase
      .from('contratista_access_tokens')
      .insert({ solicitud_id: solicitudId, token })
      .select('token')
      .single();

    if (error) throw new Error(error.message || 'Error al crear token QR');
    return inserted.token;
  },

  /** Resuelve el solicitud_id a partir de un token (para la ruta /contratista/:token). */
  obtenerSolicitudIdPorToken: async (token: string): Promise<string | null> => {
    const { data, error } = await supabase
      .from('contratista_access_tokens')
      .select('solicitud_id')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) return null;

    // Actualizar last_accessed_at y access_count de forma no bloqueante
    supabase
      .from('contratista_access_tokens')
      .update({
        last_accessed_at: new Date().toISOString(),
        access_count: (data as any).access_count + 1,
      })
      .eq('token', token)
      .then(() => {});

    return data.solicitud_id;
  },
};

// ============================================
// SERVICIO DE OBRAS
// ============================================

/**
 * Límites por columna al persistir obras (evita 22001).
 * Descripción y observaciones: cupo amplio para texto corrido; si la BD usa `text`, no habrá corte en la práctica.
 */
const OBRA_CAMPO_STRING_MAX: Record<string, number> = {
  id: 32,
  codigo: 100,
  contrato: 9,
  tipo_obra: 100,
  tipo: 20,
  estado: 120,
  nombre: 200,
  nombre_inaugurado: 100,
  descripcion: 25000,
  provincia: 200,
  municipio: 200,
  nivel: 200,
  sorteo: 100,
  area_construccion: 100,
  coordinador: 100,
  supervisor: 100,
  numero_ultima_cubicacion: 100,
  tipo_ultima_cubicacion: 100,
  estatus_ultima_cubicacion: 100,
  grupo_ultimo_estatus_cubicacion: 100,
  envio_snip: 100,
  modificacion_snip: 100,
  observacion_legal: 25000,
  observacion_financiero: 25000,
  latitud: 100,
  longitud: 100,
  distrito_minerd_sigede: 200,
  fecha_inicio: 32,
  fecha_fin_estimada: 32,
  fecha_inauguracion: 32,
  fecha_detenida: 32,
};

function mapObraRow(row: Record<string, unknown>): Obra {
  const contratistaRaw = row.contratistas;
  const contratista = (
    Array.isArray(contratistaRaw) ? contratistaRaw[0] : contratistaRaw
  ) as Contratista | null | undefined;
  const contratoRaw = row.contrato_ref;
  const contratoRef = (
    Array.isArray(contratoRaw) ? contratoRaw[0] : contratoRaw
  ) as Obra['contrato_ref'];
  const responsableLegacy = row.responsable as string | null | undefined;
  const { contratistas: _c, contrato_ref: _cr, ...rest } = row;
  const contratoNumero =
    numeroContratoDesdeObra({
      contrato: rest.contrato as string | null | undefined,
      contrato_ref: contratoRef,
    }) ?? (rest.contrato as string | null | undefined) ?? null;
  return {
    ...(rest as unknown as Obra),
    contrato: contratoNumero,
    contrato_ref: contratoRef ?? null,
    contratista: contratista ?? null,
    responsable: contratista?.responsable ?? responsableLegacy ?? null,
  };
}

function mapObrasRows(rows: Record<string, unknown>[] | null): Obra[] {
  return (rows || []).map((row) => mapObraRow(row));
}

function getResponsableFromJoinedRow(row: Record<string, unknown>): string {
  const contratistaRaw = row.contratistas;
  const contratista = (
    Array.isArray(contratistaRaw) ? contratistaRaw[0] : contratistaRaw
  ) as { responsable?: string } | null | undefined;
  const legacy = row.responsable as string | undefined;
  return (contratista?.responsable || legacy || '').trim() || 'Sin responsable';
}

async function obtenerFilasObrasUbicacionResponsablePaginadas(): Promise<Record<string, unknown>[]> {
  const PAGE_SIZE = 1000;
  const filas: Record<string, unknown>[] = [];
  let desde = 0;
  while (true) {
    const hasta = desde + PAGE_SIZE - 1;
    let { data, error } = await supabase
      .from('obras')
      .select('provincia, municipio, contratistas(responsable)')
      .range(desde, hasta);

    if (error) {
      const fb = await supabase
        .from('obras')
        .select('provincia, municipio')
        .range(desde, hasta);
      if (fb.error) throw fb.error;
      const lote = (fb.data || []) as Record<string, unknown>[];
      filas.push(...lote);
      if (lote.length < PAGE_SIZE) break;
      desde += PAGE_SIZE;
      continue;
    }

    const lote = (data || []) as Record<string, unknown>[];
    filas.push(...lote);
    if (lote.length < PAGE_SIZE) break;
    desde += PAGE_SIZE;
  }
  return filas;
}

async function buscarContratistaIdsPorResponsable(term: string): Promise<string[]> {
  const pattern = `%${term.replace(/'/g, "''")}%`;
  const { data, error } = await supabase
    .from('contratistas')
    .select('id')
    .ilike('responsable', pattern);
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return (data || []).map((r) => r.id as string);
}

async function condicionesBusquedaObras(searchTerm: string): Promise<string[]> {
  const term = searchTerm.trim();
  const esc = term.replace(/'/g, "''");
  const searchPattern = `%${esc}%`;
  const isNumeric = /^\d+$/.test(term);
  const searchConditions: string[] = [];

  if (isNumeric) {
    searchConditions.push(`id.eq.${term}`);
  }

  searchConditions.push(
    `id.ilike.${searchPattern}`,
    `contrato.ilike.${searchPattern}`,
    `codigo.ilike.${searchPattern}`,
    `nombre.ilike.${searchPattern}`,
    `estado.ilike.${searchPattern}`,
    `descripcion.ilike.${searchPattern}`,
    `provincia.ilike.${searchPattern}`,
    `municipio.ilike.${searchPattern}`,
    `nivel.ilike.${searchPattern}`,
    `distrito_minerd_sigede.ilike.${searchPattern}`,
    `coordinador.ilike.${searchPattern}`,
    `supervisor.ilike.${searchPattern}`,
    `nombre_inaugurado.ilike.${searchPattern}`,
  );

  const contratistaIds = await buscarContratistaIdsPorResponsable(term);
  if (contratistaIds.length > 0) {
    searchConditions.push(`contratista_id.in.(${contratistaIds.join(',')})`);
  }

  try {
    const contratoIds = await contratoObrasService.buscarContratoIdsPorTermino(term);
    if (contratoIds.length > 0) {
      searchConditions.push(`contrato_id.in.(${contratoIds.join(',')})`);
    }
  } catch {
    /* catálogo contrato opcional */
  }

  return searchConditions;
}

async function sugerenciasResponsableLegacy(_search: string, _limit: number): Promise<string[]> {
  return [];
}

export const contratistasService = {
  buscarOCrearPorResponsable: async (nombre: string): Promise<string | null> => {
    const responsable = (nombre || '').trim();
    if (!responsable) return null;

    const { data: existente, error: findError } = await supabase
      .from('contratistas')
      .select('id')
      .ilike('responsable', responsable)
      .limit(1)
      .maybeSingle();

    if (findError && findError.code !== '42P01') throw findError;
    if (existente?.id) return existente.id as string;

    const { data: creado, error: insertError } = await supabase
      .from('contratistas')
      .insert([{ responsable: responsable.slice(0, 400) }])
      .select('id')
      .single();

    if (insertError) {
      if (insertError.code === '42P01') return null;
      throw insertError;
    }
    return creado?.id as string;
  },

  obtenerSugerenciasResponsable: async (search: string, limit = 8): Promise<string[]> => {
    const term = (search || '').trim();
    if (term.length < 2) return [];
    try {
      const pattern = `%${term.replace(/'/g, "''")}%`;
      const { data, error } = await supabase
        .from('contratistas')
        .select('responsable')
        .ilike('responsable', pattern)
        .limit(limit * 3);

      if (error) {
        if (error.code === '42P01') {
          return sugerenciasResponsableLegacy(term, limit);
        }
        throw error;
      }

      const items = (data || [])
        .map((r) => String(r.responsable || '').trim())
        .filter(Boolean);
      return ORDENAR_SUGERENCIAS(items, term).slice(0, limit);
    } catch (error: any) {
      console.error('Error al obtener sugerencias de contratista:', error);
      return [];
    }
  },

  actualizar: async (id: string, datos: Partial<Contratista>): Promise<Contratista> => {
    const payload = Object.fromEntries(
      Object.entries(datos).filter(([, v]) => v !== undefined),
    );
    const { data, error } = await supabase
      .from('contratistas')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) throw new Error('Contratista no encontrado');
    return data as Contratista;
  },

  buscar: async (search: string, limit = 10): Promise<Contratista[]> => {
    const term = (search || '').trim();
    if (term.length < 1) return [];
    try {
      const pattern = `%${term.replace(/'/g, "''")}%`;
      const { data, error } = await supabase
        .from('contratistas')
        .select('id, responsable, identificacion, telefono1, telefono2, correo')
        .ilike('responsable', pattern)
        .limit(limit);
      if (error) {
        if (error.code === '42P01') return [];
        throw error;
      }
      return (data || []) as Contratista[];
    } catch {
      return [];
    }
  },
};

async function prepararPayloadObraPersistencia(
  obra: Record<string, unknown> | Partial<Obra>,
): Promise<Record<string, unknown>> {
  const raw = { ...obra } as Record<string, unknown>;
  const responsable = typeof raw.responsable === 'string' ? raw.responsable.trim() : '';
  delete raw.responsable;
  delete raw.contratista;
  delete raw.contrato_ref;

  if (responsable && !raw.contratista_id) {
    raw.contratista_id = await contratistasService.buscarOCrearPorResponsable(responsable);
  }

  const numContrato =
    typeof raw.contrato === 'string' && raw.contrato.trim()
      ? raw.contrato.trim()
      : null;
  if (numContrato && !raw.contrato_id) {
    const contrato = await contratoObrasService.resolverOCrearContrato({
      no_contrato: numContrato,
      contratista_nombre: responsable || null,
      crearSiFalta: true,
    });
    if (contrato?.id) {
      raw.contrato_id = contrato.id;
    }
  }
  delete raw.contrato;

  if (!raw.tipo) {
    raw.tipo = inferirTipoObraGestion({
      codigo: raw.codigo as string | null | undefined,
      distrito_minerd_sigede: raw.distrito_minerd_sigede as string | null | undefined,
      contrato_id: raw.contrato_id as string | null | undefined,
    });
  }

  if (raw.codigo != null && raw.codigo !== '') {
    raw.codigo = normalizarCodigoObra(String(raw.codigo));
  }

  return normalizarPayloadObra(raw);
}

function truncarStringObraPorCampo(key: string, v: unknown): unknown {
  if (typeof v !== 'string') return v;
  const maxLen = OBRA_CAMPO_STRING_MAX[key] ?? 4000;
  return v.length > maxLen ? v.slice(0, maxLen) : v;
}

function normalizarPayloadObra(
  obra: Record<string, unknown> | Partial<Obra> | Omit<Obra, 'created_at' | 'updated_at'>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obra)
      .filter(([k]) => k !== 'id_obra' && k !== 'contrato_ref')
      .map(([k, v]) => [k, truncarStringObraPorCampo(k, v)]),
  );
}

const ORDENAR_SUGERENCIAS = (items: string[], term: string): string[] => {
  const lower = term.toLowerCase();
  return Array.from(new Set(items)).sort((a, b) => {
    const aLower = a.toLowerCase();
    const bLower = b.toLowerCase();
    const aStarts = aLower.startsWith(lower) ? 0 : 1;
    const bStarts = bLower.startsWith(lower) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    const aIdx = aLower.indexOf(lower);
    const bIdx = bLower.indexOf(lower);
    if (aIdx !== bIdx) return aIdx - bIdx;
    return a.localeCompare(b, 'es');
  });
};

async function obtenerFilasObrasPaginadas<T extends string>(
  columnas: T,
): Promise<Record<string, unknown>[]> {
  const PAGE_SIZE = 1000;
  const filas: Record<string, unknown>[] = [];
  let desde = 0;
  while (true) {
    const hasta = desde + PAGE_SIZE - 1;
    const { data, error } = await supabase.from('obras').select(columnas).range(desde, hasta);
    if (error) throw error;
    const lote = (data || []) as Record<string, unknown>[];
    filas.push(...lote);
    if (lote.length < PAGE_SIZE) break;
    desde += PAGE_SIZE;
  }
  return filas;
}

export const obrasService = {
  /**
   * Normaliza valores de estado para evitar conteos duplicados por variaciones
   * de mayúsculas/minúsculas o espacios extra.
   */
  normalizarEstadoDashboard: (estado?: string | null): string => {
    const limpio = (estado || '').trim().replace(/\s+/g, ' ').toUpperCase();
    return limpio || 'NO ESPECIFICADO';
  },

  /** Estados distintos en obras (toda la tabla), normalizados para filtros y etiquetas. */
  obtenerEstadosDistintos: async (): Promise<string[]> => {
    const filas = await obtenerFilasObrasPaginadas('estado');
    const vistos = new Map<string, string>();
    for (const fila of filas) {
      const norm = obrasService.normalizarEstadoDashboard(String(fila.estado ?? ''));
      if (norm === 'NO ESPECIFICADO') continue;
      if (!vistos.has(norm)) vistos.set(norm, norm);
    }
    return Array.from(vistos.values()).sort((a, b) => a.localeCompare(b, 'es'));
  },

  /**
   * Obtener obras con filtros y paginación
   */
  obtenerObras: async (filtros: ObrasFilters = {}): Promise<ApiResponse<Obra[]>> => {
    try {
      const filtroResponsable = filtros.responsable?.trim() || '';
      const proyeccion = filtros.proyeccion ?? 'listado';
      const selectCols = resolverObrasSelect(proyeccion, !!filtroResponsable);
      const selectFallback = resolverObrasSelectSinJoin(proyeccion);

      let query = supabase
        .from('obras')
        .select(selectCols, { count: 'exact' });

      query = aplicarFiltrosObrasEnQuery(query, filtros);

      if (filtros.moduloBusquedaOr?.termino?.trim()) {
        const termino = filtros.moduloBusquedaOr.termino.trim();
        const pattern = `%${termino}%`;
        const columnas = filtros.moduloBusquedaOr.columnas?.length
          ? filtros.moduloBusquedaOr.columnas
          : ['descripcion', 'nombre'];
        const condiciones = columnas.map((col) => `${col}.ilike.${pattern}`);
        query = query.or(condiciones.join(','));
      }

      if (filtroResponsable) {
        query = query.ilike('contratistas.responsable', `%${filtroResponsable}%`);
      }

      if (filtros.search) {
        const searchConditions = await condicionesBusquedaObras(filtros.search);
        query = query.or(searchConditions.join(','));
      }

      query = query.order('created_at', { ascending: false });

      if (filtros.limit) {
        query = query.limit(filtros.limit);
      }
      if (filtros.offset != null && filtros.limit) {
        query = query.range(filtros.offset, filtros.offset + filtros.limit - 1);
      }

      let { data, error, count } = await query;

      if (error?.message?.includes('contratistas') || error?.code === 'PGRST200') {
        let fallback = supabase.from('obras').select(selectFallback, { count: 'exact' });
        fallback = aplicarFiltrosObrasEnQuery(fallback, filtros);
        if (filtros.moduloBusquedaOr?.termino?.trim()) {
          const termino = filtros.moduloBusquedaOr.termino.trim();
          const pattern = `%${termino}%`;
          const columnas = filtros.moduloBusquedaOr.columnas?.length
            ? filtros.moduloBusquedaOr.columnas
            : ['descripcion', 'nombre'];
          const condiciones = columnas.map((col) => `${col}.ilike.${pattern}`);
          fallback = fallback.or(condiciones.join(','));
        }
        if (filtroResponsable) {
          const ids = await buscarContratistaIdsPorResponsable(filtroResponsable);
          if (ids.length > 0) fallback = fallback.in('contratista_id', ids);
          else {
            return { data: [], count: 0 };
          }
        }
        if (filtros.search) {
          const searchConditions = await condicionesBusquedaObras(filtros.search);
          fallback = fallback.or(searchConditions.join(','));
        }
        fallback = fallback.order('created_at', { ascending: false });
        if (filtros.limit) fallback = fallback.limit(filtros.limit);
        if (filtros.offset != null && filtros.limit) {
          fallback = fallback.range(filtros.offset, filtros.offset + filtros.limit - 1);
        }
        const fb = await fallback;
        data = fb.data;
        error = fb.error;
        count = fb.count;
      }

      if (error) throw error;

      return {
        data: mapObrasRows((data || []) as unknown as Record<string, unknown>[]),
        count: count || 0,
      };
    } catch (error: any) {
      console.error('Error al obtener obras:', error);
      throw new Error(error.message || 'Error al obtener obras');
    }
  },

  /** Provincias, municipios y niveles distintos en la BD para filtros de descarga. */
  obtenerOpcionesFiltroDescarga: async (): Promise<{
    provincias: string[];
    municipios: { provincia: string; municipio: string }[];
    niveles: string[];
  }> => {
    try {
      const filas = await obtenerFilasObrasPaginadas('provincia, municipio, nivel');
      const provinciasSet = new Set<string>();
      const municipiosMap = new Map<string, Set<string>>();
      const nivelesSet = new Set<string>();

      for (const fila of filas) {
        const provincia = String(fila.provincia || '').trim();
        const municipio = String(fila.municipio || '').trim();
        const nivel = String(fila.nivel || '').trim();

        if (provincia) provinciasSet.add(provincia);
        if (municipio && provincia) {
          if (!municipiosMap.has(provincia)) municipiosMap.set(provincia, new Set());
          municipiosMap.get(provincia)!.add(municipio);
        }
        if (nivel) nivelesSet.add(nivel);
      }

      const municipios = Array.from(municipiosMap.entries()).flatMap(([prov, munSet]) =>
        Array.from(munSet)
          .sort((a, b) => a.localeCompare(b, 'es'))
          .map((municipio) => ({ provincia: prov, municipio })),
      );

      return {
        provincias: Array.from(provinciasSet).sort((a, b) => a.localeCompare(b, 'es')),
        municipios,
        niveles: Array.from(nivelesSet).sort((a, b) => a.localeCompare(b, 'es')),
      };
    } catch (error: any) {
      console.error('Error al obtener opciones de filtro:', error);
      return { provincias: [], municipios: [], niveles: [] };
    }
  },

  /** Sugerencias de búsqueda general (nombre, código, contrato, id, responsable, estado). */
  obtenerSugerenciasBuscarObras: async (search: string, limit = 8): Promise<string[]> => {
    const term = (search || '').trim();
    if (term.length < 2) return [];
    try {
      const pattern = `%${term.replace(/'/g, "''")}%`;
      const { data, error } = await supabase
        .from('obras')
        .select(
          'id, nombre, codigo, contrato, contrato_id, estado, contratista_id, contratistas(responsable), contrato_ref:contrato_id(no_contrato)',
        )
        .or(
          [
            `nombre.ilike.${pattern}`,
            `codigo.ilike.${pattern}`,
            `contrato.ilike.${pattern}`,
            `id.ilike.${pattern}`,
            `estado.ilike.${pattern}`,
          ].join(','),
        )
        .limit(limit * 4);

      if (error) throw error;

      let filas = (data || []) as Record<string, unknown>[];
      try {
        const contratoIds = await contratoObrasService.buscarContratoIdsPorTermino(term);
        if (contratoIds.length > 0) {
          const { data: porContrato } = await supabase
            .from('obras')
            .select(
              'id, nombre, codigo, contrato, contrato_id, estado, contratista_id, contratistas(responsable), contrato_ref:contrato_id(no_contrato)',
            )
            .in('contrato_id', contratoIds)
            .limit(limit * 4);
          const idsVistos = new Set(filas.map((r) => String(r.id)));
          for (const row of porContrato || []) {
            if (!idsVistos.has(String(row.id))) filas.push(row as Record<string, unknown>);
          }
        }
      } catch {
        /* sin catálogo contrato */
      }

      const lower = term.toLowerCase();
      const candidatos: string[] = [];
      for (const obra of filas) {
        const row = obra as Record<string, unknown>;
        const contratista = row.contratistas as { responsable?: string } | null;
        const contratoRef = row.contrato_ref as { no_contrato?: string } | { no_contrato?: string }[] | null;
        const ref = Array.isArray(contratoRef) ? contratoRef[0] : contratoRef;
        const numContrato =
          numeroContratoDesdeObra({
            contrato: row.contrato as string | null,
            contrato_ref: ref as Parameters<typeof numeroContratoDesdeObra>[0]['contrato_ref'],
          }) ?? (row.contrato as string | null);
        for (const valor of [
          row.nombre,
          row.codigo,
          numContrato,
          row.contrato,
          row.id,
          contratista?.responsable,
          row.estado,
        ]) {
          const limpio = String(valor || '').trim();
          if (limpio && limpio.toLowerCase().includes(lower)) {
            candidatos.push(limpio);
          }
        }
      }

      return ORDENAR_SUGERENCIAS(candidatos, term).slice(0, limit);
    } catch (error: any) {
      console.error('Error al obtener sugerencias de búsqueda:', error);
      return [];
    }
  },

  /** Sugerencias de responsables/contratistas. */
  obtenerSugerenciasResponsable: async (search: string, limit = 8): Promise<string[]> => {
    return contratistasService.obtenerSugerenciasResponsable(search, limit);
  },

  /** Fallback si no existe la tabla contratistas. */
  obtenerSugerenciasResponsableLegacy: async (): Promise<string[]> => {
    return [];
  },

  /**
   * Obtener una obra por cualquier identificador.
   * En la BD, id es varchar (ej. OB-0000). Solo búsqueda por string; no usar id numérico.
   */
  obtenerObraPorIdObra: async (idObra: string): Promise<Obra | null> => {
    const isNotFound = (err: any) =>
      err?.code === 'PGRST116' || err?.status === 406 || (err?.message && String(err.message).includes('406'));

    const mapResult = (row: Record<string, unknown> | null) =>
      row ? mapObraRow(row) : null;

    try {
      const idObraNormalizado = idObra.trim().toUpperCase();
      const searchPattern = `%${idObraNormalizado}%`;

      let { data, error } = await supabase
        .from('obras')
        .select(OBRAS_SELECT_COMPLETO)
        .eq('id', idObraNormalizado)
        .maybeSingle();

      if (!error && data) return mapResult(data as Record<string, unknown>);

      if (isNotFound(error)) {
        const res = await supabase
          .from('obras')
          .select(OBRAS_SELECT_COMPLETO)
          .eq('codigo', idObraNormalizado)
          .maybeSingle();
        if (!res.error && res.data) return mapResult(res.data as Record<string, unknown>);
        error = res.error;
      }

      if (isNotFound(error)) {
        const contratistaIds = await buscarContratistaIdsPorResponsable(idObraNormalizado);
        const orParts = [
          `id.ilike.${searchPattern}`,
          `contrato.ilike.${searchPattern}`,
          `codigo.ilike.${searchPattern}`,
          `nombre.ilike.${searchPattern}`,
          `estado.ilike.${searchPattern}`,
          `provincia.ilike.${searchPattern}`,
          `municipio.ilike.${searchPattern}`,
        ];
        if (contratistaIds.length > 0) {
          orParts.push(`contratista_id.in.(${contratistaIds.join(',')})`);
        }

        const { data: searchData, error: searchError } = await supabase
          .from('obras')
          .select(OBRAS_SELECT_COMPLETO)
          .or(orParts.join(','))
          .limit(1);

        if (!searchError && searchData?.[0]) {
          return mapResult(searchData[0] as Record<string, unknown>);
        }
      }

      if (error && !isNotFound(error)) {
        const fallback = await supabase
          .from('obras')
          .select(OBRAS_SELECT_COMPLETO)
          .eq('id', idObraNormalizado)
          .maybeSingle();
        if (!fallback.error && fallback.data) {
          return mapObraRow(fallback.data as Record<string, unknown>);
        }
        throw error;
      }
      return null;
    } catch (error: any) {
      console.error('Error al obtener obra por id_obra:', error);
      if (isNotFound(error)) return null;
      throw new Error(error.message || 'Error al obtener obra');
    }
  },

  /**
   * Obtener una obra por ID (numérico interno)
   */
  obtenerObraPorId: async (id: number): Promise<Obra> => {
    try {
      const { data, error } = await supabase
        .from('obras')
        .select(OBRAS_SELECT_COMPLETO)
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Obra no encontrada');

      return mapObraRow(data as Record<string, unknown>);
    } catch (error: any) {
      console.error('Error al obtener obra:', error);
      throw new Error(error.message || 'Error al obtener obra');
    }
  },


  /**
   * Crear una nueva obra.
   * Si la tabla usa id varchar (ej. OB-0000), pasar obra con id incluido.
   * Trunca strings según límites por columna (ver OBRA_CAMPO_STRING_MAX) para evitar error 22001.
   */
  crearObra: async (
    obra:
      | (Omit<Obra, 'created_at' | 'updated_at'> & { id?: string })
      | Record<string, unknown>,
  ): Promise<Obra> => {
    try {
      const payload = await prepararPayloadObraPersistencia(obra as Record<string, unknown>);

      const { data, error } = await supabase
        .from('obras')
        .insert([payload])
        .select(OBRAS_SELECT_COMPLETO)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Error al crear obra');

      return mapObraRow(data as Record<string, unknown>);
    } catch (error: any) {
      console.error('Error al crear obra:', error);
      throw new Error(error.message || 'Error al crear obra');
    }
  },

  /**
   * Crear muchas obras con pocos viajes de red (insert por lotes).
   */
  crearObrasLote: async (
    obras: Array<Omit<Obra, 'created_at' | 'updated_at'> | Record<string, unknown>>,
    options?: { chunkSize?: number },
  ): Promise<Obra[]> => {
    const chunkSize = options?.chunkSize ?? 50;
    if (obras.length === 0) return [];
    try {
      const todas: Obra[] = [];
      for (let i = 0; i < obras.length; i += chunkSize) {
        const slice = obras.slice(i, i + chunkSize);
        const payloads = await Promise.all(
          slice.map((o) => prepararPayloadObraPersistencia(o as Record<string, unknown>)),
        );
        const conCodigo = payloads.every((p) => p.codigo);
        const { data, error } = conCodigo
          ? await supabase
              .from('obras')
              .upsert(payloads, { onConflict: 'codigo' })
              .select(OBRAS_SELECT_COMPLETO)
          : await supabase.from('obras').insert(payloads).select(OBRAS_SELECT_COMPLETO);
        if (error) throw error;
        todas.push(...mapObrasRows((data || []) as Record<string, unknown>[]));
      }
      return todas;
    } catch (error: any) {
      console.error('Error al crear obras en lote:', error);
      throw new Error(error.message || 'Error al crear obras en lote');
    }
  },

  /**
   * Actualizar una obra (id puede ser number o string según el esquema de obras).
   * Trunca strings según límites por columna (OBRA_CAMPO_STRING_MAX).
   */
  actualizarObra: async (id: number | string, updates: Partial<Obra>): Promise<Obra> => {
    try {
      const payload = await prepararPayloadObraPersistencia(updates as Record<string, unknown>);

      const { data, error } = await supabase
        .from('obras')
        .update(payload)
        .eq('id', id)
        .select(OBRAS_SELECT_COMPLETO)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Obra no encontrada');

      const obra = mapObraRow(data as Record<string, unknown>);
      if (updates.estado !== undefined && updates.estado?.trim()) {
        await propagarEstadoObraAMatriz(String(id), updates.estado);
      }
      return obra;
    } catch (error: any) {
      console.error('Error al actualizar obra:', error);
      throw new Error(error.message || 'Error al actualizar obra');
    }
  },

  /**
   * Actualizar una obra usando su código (campo codigo).
   */
  actualizarObraPorCodigo: async (codigo: string, updates: Partial<Obra>): Promise<Obra> => {
    try {
      const codigoNorm = normalizarCodigoObra(codigo);
      if (!codigoNorm) throw new Error('Código de obra inválido');

      const payload = await prepararPayloadObraPersistencia(updates as Record<string, unknown>);

      const { data, error } = await supabase
        .from('obras')
        .update(payload)
        .eq('codigo', codigoNorm)
        .select(OBRAS_SELECT_COMPLETO)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Obra no encontrada para el código especificado');

      const obra = mapObraRow(data as Record<string, unknown>);
      if (updates.estado !== undefined && updates.estado?.trim()) {
        await propagarEstadoObraAMatriz(obra.id, updates.estado);
      }
      return obra;
    } catch (error: any) {
      console.error('Error al actualizar obra por código:', error);
      throw new Error(error.message || 'Error al actualizar obra por código');
    }
  },

  /**
   * Eliminar una obra por su id (string o numérico).
   */
  eliminarObra: async (id: number | string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error al eliminar obra:', error);
      throw new Error(error.message || 'Error al eliminar obra');
    }
  },

  /**
   * Estadísticas de obras aplicando los mismos filtros que listado/descarga.
   */
  obtenerEstadisticasReporte: async (filtros: ObrasFilters = {}): Promise<ReporteObrasStats> => {
    try {
      const PAGE_SIZE = 1000;
      const obras: Obra[] = [];
      let offset = 0;

      while (true) {
        const lote = await obrasService.obtenerObras({
          ...filtros,
          proyeccion: filtros.proyeccion ?? 'reporte',
          limit: PAGE_SIZE,
          offset,
        });
        obras.push(...(lote.data || []));
        if (!lote.data || lote.data.length < PAGE_SIZE) break;
        offset += PAGE_SIZE;
      }

      const conteoPorEstado = new Map<string, number>();
      const obrasPorResponsableMap = new Map<string, number>();
      const obrasPorProvinciaMap = new Map<string, number>();
      const obrasPorMunicipioMap = new Map<string, { provincia: string; cantidad: number }>();
      const obrasPorNivelMap = new Map<string, number>();
      let totalAulas = 0;
      let conUbicacion = 0;

      const hoy = new Date().toISOString().split('T')[0];
      const limite = new Date();
      limite.setDate(limite.getDate() + 30);
      const limiteStr = limite.toISOString().split('T')[0];

      const obrasProximasInaugurar: Obra[] = [];
      const obrasConUbicacion: ObraUbicacionGps[] = [];

      for (const obra of obras) {
        const estado = obrasService.normalizarEstadoDashboard(obra.estado);
        conteoPorEstado.set(estado, (conteoPorEstado.get(estado) || 0) + 1);

        const responsable =
          (obra.contratista?.responsable || obra.responsable || '').trim() || 'Sin responsable';
        obrasPorResponsableMap.set(responsable, (obrasPorResponsableMap.get(responsable) || 0) + 1);

        const provincia = (obra.provincia || '').trim() || 'Sin provincia';
        obrasPorProvinciaMap.set(provincia, (obrasPorProvinciaMap.get(provincia) || 0) + 1);

        const municipio = (obra.municipio || '').trim() || 'Sin municipio';
        const keyMun = `${provincia}::${municipio}`;
        const prevMun = obrasPorMunicipioMap.get(keyMun);
        if (prevMun) prevMun.cantidad += 1;
        else obrasPorMunicipioMap.set(keyMun, { provincia, cantidad: 1 });

        const nivel = (obra.nivel || '').trim() || 'Sin nivel';
        obrasPorNivelMap.set(nivel, (obrasPorNivelMap.get(nivel) || 0) + 1);

        if (obra.no_aula != null && !Number.isNaN(Number(obra.no_aula))) {
          totalAulas += Number(obra.no_aula);
        }
        if (obra.latitud && obra.longitud) {
          conUbicacion += 1;
          const lat = parseFloat(String(obra.latitud).trim());
          const lng = parseFloat(String(obra.longitud).trim());
          if (
            Number.isFinite(lat) &&
            Number.isFinite(lng) &&
            lat >= -90 &&
            lat <= 90 &&
            lng >= -180 &&
            lng <= 180
          ) {
            obrasConUbicacion.push({
              id: obra.id,
              codigo: obra.codigo,
              nombre: obra.nombre,
              estado: obrasService.normalizarEstadoDashboard(obra.estado),
              provincia: obra.provincia,
              latitud: String(obra.latitud).trim(),
              longitud: String(obra.longitud).trim(),
            });
          }
        }

        const fi = obra.fecha_inauguracion;
        if (fi && fi >= hoy && fi <= limiteStr) {
          obrasProximasInaugurar.push(obra);
        }
      }

      obrasProximasInaugurar.sort((a, b) =>
        String(a.fecha_inauguracion || '').localeCompare(String(b.fecha_inauguracion || '')),
      );

      const porEstado = Array.from(conteoPorEstado.entries())
        .map(([estado, cantidad]) => ({ estado, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad);

      return {
        estadisticas: {
          totalObras: obras.length,
          porEstado,
          totalAulas,
          conUbicacion,
        },
        obrasPorProvincia: Array.from(obrasPorProvinciaMap.entries())
          .map(([provincia, cantidad]) => ({ provincia, cantidad }))
          .filter((p) => p.provincia !== 'Sin provincia')
          .sort((a, b) => b.cantidad - a.cantidad),
        obrasPorMunicipio: Array.from(obrasPorMunicipioMap.entries())
          .map(([key, { provincia, cantidad }]) => ({
            municipio: key.split('::')[1] || '',
            provincia,
            cantidad,
          }))
          .filter((m) => m.municipio !== 'Sin municipio')
          .sort((a, b) => b.cantidad - a.cantidad),
        obrasPorNivel: Array.from(obrasPorNivelMap.entries())
          .map(([nivel, cantidad]) => ({ nivel, cantidad }))
          .filter((n) => n.nivel !== 'Sin nivel')
          .sort((a, b) => b.cantidad - a.cantidad),
        obrasPorResponsable: Array.from(obrasPorResponsableMap.entries())
          .map(([responsable, cantidad]) => ({ responsable, cantidad }))
          .sort((a, b) => b.cantidad - a.cantidad)
          .slice(0, 15),
        obrasProximasInaugurar: obrasProximasInaugurar.slice(0, 20),
        obrasConUbicacion,
        obrasDetalle: obras,
      };
    } catch (error: any) {
      console.error('Error al obtener estadísticas de reporte:', error);
      throw new Error(error.message || 'Error al obtener estadísticas del reporte');
    }
  },

  /**
   * Obtener estadísticas del dashboard
   */
  obtenerEstadisticas: async () => {
    try {
      const PAGE_SIZE = 1000;

      const obtenerTodasLasObras = async <T extends string>(columnas: T) => {
        const filas: any[] = [];
        let desde = 0;
        while (true) {
          const hasta = desde + PAGE_SIZE - 1;
          const { data, error } = await supabase
            .from('obras')
            .select(columnas)
            .range(desde, hasta);
          if (error) throw error;
          const lote = data || [];
          filas.push(...lote);
          if (lote.length < PAGE_SIZE) break;
          desde += PAGE_SIZE;
        }
        return filas;
      };

      // Obtener total de obras
      const { count: totalObras } = await supabase
        .from('obras')
        .select('id', { count: 'exact', head: true });

      // Obtener obras por estado: solo estados que existen en la base de datos
      const todasLasObras = await obtenerTodasLasObras('estado');

      const porEstado: Array<{ estado: string; cantidad: number }> = [];
      if (todasLasObras && todasLasObras.length > 0) {
        const conteoPorEstado = new Map<string, number>();
        todasLasObras.forEach((o: { estado?: string | null }) => {
          const estado = obrasService.normalizarEstadoDashboard(o.estado);
          conteoPorEstado.set(estado, (conteoPorEstado.get(estado) || 0) + 1);
        });
        Array.from(conteoPorEstado.entries())
          .sort((a, b) => b[1] - a[1])
          .forEach(([estado, cantidad]) => porEstado.push({ estado, cantidad }));
      }

      // Obtener obras próximas a inaugurar (próximos 30 días)
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + 30);
      const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];
      const fechaHoy = new Date().toISOString().split('T')[0];

      const { data: obrasProximasRaw, error: proximasError } = await supabase
        .from('obras')
        .select(OBRAS_SELECT_DASHBOARD_PROXIMAS)
        .not('fecha_inauguracion', 'is', null)
        .gte('fecha_inauguracion', fechaHoy)
        .lte('fecha_inauguracion', fechaLimiteStr)
        .order('fecha_inauguracion', { ascending: true })
        .limit(10);

      let obrasProximas: Obra[] = [];
      if (!proximasError && obrasProximasRaw) {
        obrasProximas = mapObrasRows(obrasProximasRaw as Record<string, unknown>[]);
      } else {
        const fb = await supabase
          .from('obras')
          .select('id, codigo, nombre, estado, fecha_inauguracion, contratista_id')
          .not('fecha_inauguracion', 'is', null)
          .gte('fecha_inauguracion', fechaHoy)
          .lte('fecha_inauguracion', fechaLimiteStr)
          .order('fecha_inauguracion', { ascending: true })
          .limit(10);
        if (!fb.error && fb.data) {
          obrasProximas = mapObrasRows(fb.data as Record<string, unknown>[]);
        }
      }

      const todasObras = await obtenerFilasObrasUbicacionResponsablePaginadas();

      const obrasPorResponsableMap = new Map<string, number>();
      const obrasPorProvinciaMap = new Map<string, number>();
      const obrasPorMunicipioMap = new Map<string, { provincia: string; cantidad: number }>();

      if (todasObras && todasObras.length > 0) {
        todasObras.forEach((obra) => {
          const responsable = getResponsableFromJoinedRow(obra);
          obrasPorResponsableMap.set(
            responsable,
            (obrasPorResponsableMap.get(responsable) || 0) + 1
          );
          const provincia = String(obra.provincia || '').trim() || 'Sin provincia';
          obrasPorProvinciaMap.set(provincia, (obrasPorProvinciaMap.get(provincia) || 0) + 1);
          const municipio = String(obra.municipio || '').trim() || 'Sin municipio';
          const key = `${provincia}::${municipio}`;
          const prev = obrasPorMunicipioMap.get(key);
          if (prev) prev.cantidad += 1;
          else obrasPorMunicipioMap.set(key, { provincia, cantidad: 1 });
        });
      }

      const obrasPorResponsable = Array.from(obrasPorResponsableMap.entries())
        .map(([responsable, cantidad]) => ({ responsable, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)
        .slice(0, 10); // Top 10

      const obrasPorProvincia = Array.from(obrasPorProvinciaMap.entries())
        .map(([provincia, cantidad]) => ({ provincia, cantidad }))
        .filter(p => p.provincia !== 'Sin provincia')
        .sort((a, b) => b.cantidad - a.cantidad);

      const obrasPorMunicipio = Array.from(obrasPorMunicipioMap.entries())
        .map(([key, { provincia, cantidad }]) => ({
          municipio: key.split('::')[1] || '',
          provincia,
          cantidad,
        }))
        .filter(m => m.municipio !== 'Sin municipio')
        .sort((a, b) => b.cantidad - a.cantidad);

      return {
        estadisticas: {
          totalObras: totalObras || 0,
          porEstado: porEstado,
        },
        obrasProximasInaugurar: obrasProximas || [],
        obrasPorResponsable: obrasPorResponsable || [],
        obrasPorProvincia: obrasPorProvincia || [],
        obrasPorMunicipio: obrasPorMunicipio || [],
      };
    } catch (error: any) {
      console.error('Error al obtener estadísticas:', error);
      throw new Error(error.message || 'Error al obtener estadísticas');
    }
  },

  /** Búsqueda de obras para asignar como ID SIGEDE (código o distrito). */
  buscarObrasParaSigede: async (
    search: string,
    limit = 10,
  ): Promise<
    Array<{
      codigo?: string | null;
      nombre: string;
      contrato?: string | null;
      tipo_obra?: string | null;
      provincia?: string | null;
      municipio?: string | null;
      distrito_minerd_sigede?: string | null;
    }>
  > => {
    const term = (search || '').trim();
    if (term.length < 1) return [];
    const pattern = `%${term.replace(/'/g, "''")}%`;
    const { data, error } = await supabase
      .from('obras')
      .select(
        'codigo, nombre, contrato, contrato_id, tipo, tipo_obra, provincia, municipio, distrito_minerd_sigede, contrato_ref:contrato_id(no_contrato)',
      )
      .eq('tipo', TIPO_OBRA_GESTION_ARRASTRE)
      .or(
        `codigo.ilike.${pattern},nombre.ilike.${pattern},distrito_minerd_sigede.ilike.${pattern}`,
      )
      .order('codigo', { ascending: true })
      .limit(limit);
    if (error) throw error;
    return (data || []).map((row) => ({
      codigo: row.codigo,
      nombre: row.nombre,
      contrato:
        numeroContratoDesdeObra(
          row as unknown as Parameters<typeof numeroContratoDesdeObra>[0],
        ) ?? row.contrato ?? null,
      tipo_obra: row.tipo_obra,
      provincia: row.provincia,
      municipio: row.municipio,
      distrito_minerd_sigede: row.distrito_minerd_sigede,
    }));
  },

  /** Búsqueda de obras para vincular a trámites (SIGEDE, contrato, nombre, responsable). */
  buscarObrasParaTramite: async (
    search: string,
    limit = 12,
  ): Promise<import('../types/database').BuscarObrasTramiteResult> => {
    const term = (search || '').trim();
    if (term.length < 1) {
      return { obras: [], loteContrato: null };
    }

    const cols =
      'codigo, nombre, contrato, provincia, municipio, distrito_minerd_sigede, contratista_id';
    const pattern = `%${term.replace(/'/g, "''")}%`;
    const esc = term.replace(/'/g, "''");

    const searchConditions = [
      `codigo.ilike.${pattern}`,
      `nombre.ilike.${pattern}`,
      `distrito_minerd_sigede.ilike.${pattern}`,
      `contrato.ilike.${pattern}`,
    ];

    let contratistaIds: string[] = [];
    try {
      contratistaIds = await buscarContratistaIdsPorResponsable(term);
    } catch {
      contratistaIds = [];
    }

    const [resGeneral, resPorContratista, resContratoExacto] = await Promise.all([
      supabase
        .from('obras')
        .select(cols)
        .or(searchConditions.join(','))
        .order('codigo', { ascending: true })
        .limit(limit),
      contratistaIds.length > 0
        ? supabase
            .from('obras')
            .select(cols)
            .in('contratista_id', contratistaIds)
            .order('codigo', { ascending: true })
            .limit(limit)
        : Promise.resolve({ data: [] as Record<string, unknown>[], error: null }),
      supabase
        .from('obras')
        .select(cols)
        .eq('contrato', esc)
        .order('codigo', { ascending: true })
        .limit(500),
    ]);

    if (resGeneral.error) throw resGeneral.error;
    if (resPorContratista.error) throw resPorContratista.error;
    if (resContratoExacto.error) throw resContratoExacto.error;

    const filasCombinadas = [
      ...((resGeneral.data || []) as Record<string, unknown>[]),
      ...((resPorContratista.data || []) as Record<string, unknown>[]),
    ];
    const loteFilas = (resContratoExacto.data || []) as Record<string, unknown>[];

    const idsContratista = Array.from(
      new Set(
        [...filasCombinadas, ...loteFilas]
          .map((row) => row.contratista_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0),
      ),
    );

    const responsablePorContratista = new Map<string, string>();
    if (idsContratista.length > 0) {
      const { data: contratistasData, error: contratistasError } = await supabase
        .from('contratistas')
        .select('id, responsable')
        .in('id', idsContratista);
      if (!contratistasError) {
        for (const c of contratistasData || []) {
          if (c.id) responsablePorContratista.set(String(c.id), String(c.responsable || ''));
        }
      }
    }

    const mapRow = (row: Record<string, unknown>): import('../types/database').ObraTramiteOpcion | null => {
      const sigede = String(row.codigo || row.distrito_minerd_sigede || '').trim();
      if (!sigede) return null;
      const contratistaId =
        typeof row.contratista_id === 'string' ? row.contratista_id : null;
      return {
        sigede,
        nombre: String(row.nombre || ''),
        contrato: row.contrato != null ? String(row.contrato) : null,
        responsable: contratistaId
          ? responsablePorContratista.get(contratistaId) ?? null
          : null,
        provincia: row.provincia != null ? String(row.provincia) : null,
        municipio: row.municipio != null ? String(row.municipio) : null,
      };
    };

    const mergeUnicas = (
      filas: Record<string, unknown>[],
    ): import('../types/database').ObraTramiteOpcion[] => {
      const vistos = new Set<string>();
      const out: import('../types/database').ObraTramiteOpcion[] = [];
      for (const row of filas) {
        const m = mapRow(row);
        if (!m || vistos.has(m.sigede)) continue;
        vistos.add(m.sigede);
        out.push(m);
      }
      return out;
    };

    const obras = mergeUnicas(filasCombinadas).slice(0, limit);

    const loteObras = mergeUnicas(loteFilas);
    const loteContrato =
      loteObras.length > 0
        ? { contrato: term, obras: loteObras }
        : null;

    return { obras, loteContrato };
  },

  /** Búsqueda de obras para edición (SIGEDE, contrato, nombre, provincia, municipio). */
  buscarObrasParaEdicion: async (
    search: string,
    limit = 10,
  ): Promise<import('../types/database').ObraEdicionOpcion[]> => {
    const term = (search || '').trim();
    if (term.length < 1) return [];

    const cols = 'id, codigo, nombre, contrato, provincia, municipio, distrito_minerd_sigede';
    const pattern = `%${term.replace(/'/g, "''")}%`;

    const { data, error } = await supabase
      .from('obras')
      .select(cols)
      .or(
        [
          `codigo.ilike.${pattern}`,
          `distrito_minerd_sigede.ilike.${pattern}`,
          `contrato.ilike.${pattern}`,
          `nombre.ilike.${pattern}`,
          `provincia.ilike.${pattern}`,
          `municipio.ilike.${pattern}`,
        ].join(','),
      )
      .order('codigo', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const vistos = new Set<string>();
    const out: import('../types/database').ObraEdicionOpcion[] = [];

    for (const row of data || []) {
      const id = String(row.id || '').trim();
      if (!id || vistos.has(id)) continue;
      vistos.add(id);
      const codigo = String(row.codigo || '').trim();
      const distrito = String(row.distrito_minerd_sigede || '').trim();
      out.push({
        id,
        sigede: codigo || id,
        codigo: codigo || null,
        distrito_minerd_sigede: distrito || null,
        nombre: String(row.nombre || ''),
        contrato: row.contrato != null ? String(row.contrato) : null,
        provincia: row.provincia != null ? String(row.provincia) : null,
        municipio: row.municipio != null ? String(row.municipio) : null,
      });
    }

    return out;
  },

  /** Trámites y documentos técnicos vinculados a uno o más SIGEDE. */
  obtenerRelacionesPorSigede: async (
    sigedes: string[],
  ): Promise<import('../types/database').ObraRelacionesSigede> => {
    const ids = Array.from(new Set(sigedes.map((s) => s.trim()).filter(Boolean)));
    if (ids.length === 0) {
      return { sigedes: [], tramites: [], documentos: [] };
    }

    const [resTramites, resDocumentos] = await Promise.all([
      supabase
        .from('tramites')
        .select('id, titulo, estado, oficio, area_destinatario, proceso, fecha_creacion')
        .overlaps('id_sigede', ids)
        .order('fecha_creacion', { ascending: false })
        .limit(100),
      supabase
        .from('documentos_tecnicos_obra')
        .select(
          'id, solicitud, tipo_adenda, no_adenda_solicituda, numero_adenda_actual, monto_total, created_at',
        )
        .overlaps('id_sigede', ids)
        .order('created_at', { ascending: false })
        .limit(100),
    ]);

    if (resTramites.error) throw resTramites.error;
    if (resDocumentos.error) throw resDocumentos.error;

    return {
      sigedes: ids,
      tramites: (resTramites.data || []) as import('../types/database').TramiteObraResumen[],
      documentos: (resDocumentos.data || []) as import('../types/database').DocumentoObraResumen[],
    };
  },

  /** Resumen de obra (contrato, plantel, tipo, ubicación) por cada id_sigede (arrastre). */
  obtenerResumenesPorSigede: async (ids: string[]): Promise<ObraSigedeResumen[]> => {
    const uniq = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (uniq.length === 0) return [];

    const cols =
      'codigo, nombre, contrato, contrato_id, tipo, tipo_obra, provincia, municipio, distrito_minerd_sigede, contrato_ref:contrato_id(no_contrato)';
    const [resCodigo, resDistrito] = await Promise.all([
      supabase.from('obras').select(cols).in('codigo', uniq),
      supabase.from('obras').select(cols).in('distrito_minerd_sigede', uniq),
    ]);
    if (resCodigo.error) throw resCodigo.error;
    if (resDistrito.error) throw resDistrito.error;

    const porCodigo = new Map(
      (resCodigo.data || []).map((o) => [String(o.codigo || '').trim(), o]),
    );
    const porDistrito = new Map(
      (resDistrito.data || []).map((o) => [String(o.distrito_minerd_sigede || '').trim(), o]),
    );

    return uniq.map((idSigede) => {
      const obra = porCodigo.get(idSigede) || porDistrito.get(idSigede);
      if (!obra) {
        return {
          id_sigede: idSigede,
          tipo_gestion: TIPO_OBRA_GESTION_ARRASTRE,
          encontrada: false,
        };
      }
      return {
        id_sigede: idSigede,
        tipo_gestion: TIPO_OBRA_GESTION_ARRASTRE,
        contrato:
          numeroContratoDesdeObra(
            obra as unknown as Parameters<typeof numeroContratoDesdeObra>[0],
          ) ??
          obra.contrato ??
          null,
        plantel: obra.nombre ?? null,
        tipo: obra.tipo_obra ?? null,
        provincia: obra.provincia ?? null,
        municipio: obra.municipio ?? null,
        encontrada: true,
      };
    });
  },

  /** Resumen de obras de mantenimiento por id (MT-xxxx). */
  obtenerResumenesPorObraIds: async (ids: string[]): Promise<ObraSigedeResumen[]> => {
    const uniq = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (uniq.length === 0) return [];

    const cols =
      'id, nombre, contrato, contrato_id, tipo, tipo_obra, provincia, municipio, contrato_ref:contrato_id(no_contrato)';
    const { data, error } = await supabase.from('obras').select(cols).in('id', uniq);
    if (error) throw error;

    const porId = new Map((data || []).map((o) => [String(o.id || '').trim(), o]));

    return uniq.map((obraId) => {
      const obra = porId.get(obraId);
      if (!obra) {
        return {
          id_sigede: obraId,
          obra_id: obraId,
          tipo_gestion: TIPO_OBRA_GESTION_MANTENIMIENTO,
          encontrada: false,
        };
      }
      return {
        id_sigede: obraId,
        obra_id: obraId,
        tipo_gestion: TIPO_OBRA_GESTION_MANTENIMIENTO,
        contrato:
          numeroContratoDesdeObra(
            obra as unknown as Parameters<typeof numeroContratoDesdeObra>[0],
          ) ??
          obra.contrato ??
          null,
        plantel: obra.nombre ?? null,
        tipo: obra.tipo_obra ?? null,
        provincia: obra.provincia ?? null,
        municipio: obra.municipio ?? null,
        encontrada: true,
      };
    });
  },

  obtenerResumenesObrasDocumento: async (
    idSigede: string[],
    obraIds: string[],
  ): Promise<ObraSigedeResumen[]> => {
    const [arrastre, mantenimiento] = await Promise.all([
      obrasService.obtenerResumenesPorSigede(idSigede),
      obrasService.obtenerResumenesPorObraIds(obraIds),
    ]);
    return [...arrastre, ...mantenimiento];
  },

  /** Crea una obra de mantenimiento (sin SIGEDE) vinculada al contrato del documento. */
  crearObraMantenimientoGestionTecnica: async (payload: {
    nombre: string;
    provincia?: string | null;
    municipio?: string | null;
    tipo_obra?: string | null;
    contrato_id: string;
    contratista_id?: string | null;
  }): Promise<Obra> => {
    const nombre = payload.nombre.trim();
    if (!nombre) throw new Error('El nombre del plantel es obligatorio');
    if (!payload.contrato_id?.trim()) {
      throw new Error('Debe indicar el contrato antes de agregar una obra de mantenimiento');
    }

    const { data: existente } = await supabase
      .from('obras')
      .select('id, nombre')
      .eq('tipo', TIPO_OBRA_GESTION_MANTENIMIENTO)
      .eq('contrato_id', payload.contrato_id)
      .ilike('nombre', nombre)
      .limit(1)
      .maybeSingle();

    if (existente?.id) {
      throw new Error(
        `Ya existe una obra de mantenimiento «${existente.nombre}» en este contrato (${existente.id})`,
      );
    }

    const [idObra] = await reservarIdsObra('MT', 1);
    const obra = await obrasService.crearObra({
      id: idObra,
      nombre,
      estado: 'NO ESPECIFICADO',
      codigo: null,
      distrito_minerd_sigede: null,
      provincia: payload.provincia?.trim() || null,
      municipio: payload.municipio?.trim() || null,
      tipo_obra: payload.tipo_obra?.trim() || 'Mantenimiento',
      tipo: TIPO_OBRA_GESTION_MANTENIMIENTO,
      contrato_id: payload.contrato_id,
      contratista_id: payload.contratista_id || null,
    });
    return obra;
  },
};

// ============================================
// SERVICIO DE TRÁMITES
// ============================================

export const tramitesService = {
  /**
   * Obtener trámites con filtros y paginación
   */
  obtenerTramites: async (filtros: TramitesFilters = {}): Promise<ApiResponse<Tramite[]>> => {
    try {
      let query = supabase
        .from('tramites')
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filtros.estado) {
        query = query.eq('estado', filtros.estado);
      }

      if (filtros.area) {
        query = query.eq('area_destinatario', filtros.area);
      }

      // Restricción por área: solo trámites enviados a su área (area_destinatario) o enviados por su área (origen = area_destinatario en creación). Filtro único por area_destinatario.
      if (!filtros.esAdmin) {
        if (filtros.areaUsuario) {
          query = query.eq('area_destinatario', filtros.areaUsuario);
        } else {
          query = query.limit(0);
        }
      }

      // Búsqueda por texto (incluye oficio)
      if (filtros.search) {
        const term = filtros.search.trim().replace(/'/g, "''");
        query = query.or(
          `titulo.ilike.%${term}%,nombre_destinatario.ilike.%${term}%,id.ilike.%${term}%,oficio.ilike.%${term}%`
        );
      }

      // Ordenar por fecha de creación descendente
      query = query.order('fecha_creacion', { ascending: false });

      // Paginación
      if (filtros.limit) {
        query = query.limit(filtros.limit);
      }
      if (filtros.offset) {
        query = query.range(filtros.offset, filtros.offset + (filtros.limit || 10) - 1);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      return {
        data: data || [],
        count: count || 0,
      };
    } catch (error: any) {
      console.error('Error al obtener trámites:', error);
      throw new Error(error.message || 'Error al obtener trámites');
    }
  },

  /**
   * Obtener un trámite por ID
   */
  obtenerTramitePorId: async (id: string): Promise<Tramite> => {
    try {
      const { data, error } = await supabase
        .from('tramites')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (!data) throw new Error('Trámite no encontrado');

      const ids = Array.isArray(data.id_sigede)
        ? (data.id_sigede as string[]).map((s) => String(s).trim()).filter(Boolean)
        : [];

      return {
        ...data,
        id_sigede: ids,
        obras_sigede: ids.length > 0 ? await obrasService.obtenerResumenesPorSigede(ids) : [],
      };
    } catch (error: any) {
      console.error('Error al obtener trámite:', error);
      throw new Error(error.message || 'Error al obtener trámite');
    }
  },

  /**
   * Crear un nuevo trámite
   */
  crearTramite: async (tramite: Omit<Tramite, 'created_at' | 'updated_at' | 'fecha_creacion'>): Promise<Tramite> => {
    try {
      const { data, error } = await supabase
        .from('tramites')
        .insert([tramite])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Error al crear trámite');

      return data;
    } catch (error: any) {
      console.error('Error al crear trámite:', error);
      throw new Error(error.message || 'Error al crear trámite');
    }
  },

  /**
   * Actualizar un trámite
   */
  actualizarTramite: async (id: string, updates: Partial<Tramite>): Promise<Tramite> => {
    try {
      const { data, error } = await supabase
        .from('tramites')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Trámite no encontrado');

      return data;
    } catch (error: any) {
      console.error('Error al actualizar trámite:', error);
      throw new Error(error.message || 'Error al actualizar trámite');
    }
  },

  /**
   * Eliminar un trámite
   */
  eliminarTramite: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tramites')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error al eliminar trámite:', error);
      throw new Error(error.message || 'Error al eliminar trámite');
    }
  },

  /**
   * Obtener historial de movimientos de un trámite
   */
  obtenerHistorialTramite: async (tramiteId: string): Promise<MovimientoTramite[]> => {
    try {
      const { data, error } = await supabase
        .from('movimientos_tramites')
        .select('*')
        .eq('tramite_id', tramiteId)
        .order('fecha_movimiento', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error al obtener historial:', error);
      throw new Error(error.message || 'Error al obtener historial');
    }
  },

  /**
   * Última fecha de movimiento por trámite (una sola consulta para listados).
   */
  obtenerUltimosMovimientosPorTramites: async (
    tramiteIds: string[],
  ): Promise<Map<string, string | null>> => {
    const resultado = new Map<string, string | null>();
    if (tramiteIds.length === 0) return resultado;

    try {
      const { data, error } = await supabase
        .from('movimientos_tramites')
        .select('tramite_id, fecha_movimiento')
        .in('tramite_id', tramiteIds)
        .order('fecha_movimiento', { ascending: false });

      if (error) throw error;

      for (const row of data || []) {
        if (!resultado.has(row.tramite_id)) {
          resultado.set(row.tramite_id, row.fecha_movimiento ?? null);
        }
      }
      return resultado;
    } catch (error: any) {
      console.error('Error al obtener últimos movimientos:', error);
      throw new Error(error.message || 'Error al obtener últimos movimientos');
    }
  },

  /**
   * Registrar un movimiento de trámite
   */
  registrarMovimiento: async (
    tramiteId: string,
    movimiento: Omit<MovimientoTramite, 'id' | 'fecha_movimiento' | 'tramite_id'>
  ): Promise<MovimientoTramite> => {
    try {
      // No enviar 'id' para que la BD use la secuencia (evita conflicto si la secuencia está desincronizada)
      const payload = {
        tramite_id: tramiteId,
        area_origen: movimiento.area_origen,
        area_destino: movimiento.area_destino,
        oficio: movimiento.oficio ?? null,
        observaciones: movimiento.observaciones ?? null,
        usuario: movimiento.usuario ?? null,
        estado_resultante: movimiento.estado_resultante ?? null,
      };
      const { data, error } = await supabase
        .from('movimientos_tramites')
        .insert([payload])
        .select()
        .single();

      if (error) throw error;
      if (!data) throw new Error('Error al registrar movimiento');

      return data;
    } catch (error: any) {
      console.error('Error al registrar movimiento:', error);
      throw new Error(error.message || 'Error al registrar movimiento');
    }
  },

  /**
   * Cerrar el registro de tiempo en el área actual (al enviar el trámite a otra área).
   */
  cerrarTiempoEnAreaActual: async (tramiteId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('tiempo_en_area')
        .update({ fecha_salida: new Date().toISOString() })
        .eq('tramite_id', tramiteId)
        .is('fecha_salida', null);
      if (error) throw error;
    } catch (error: any) {
      if (error?.code !== '42P01') console.warn('Error al cerrar tiempo en área:', error?.message);
    }
  },

  /**
   * Abrir registro de tiempo en un área (trámite entra a esta área).
   */
  abrirTiempoEnArea: async (tramiteId: string, areaNombre: string, procesoId: string): Promise<void> => {
    try {
      const { error } = await supabase.from('tiempo_en_area').insert([
        {
          tramite_id: tramiteId,
          area_nombre: areaNombre,
          fecha_entrada: new Date().toISOString(),
          proceso_id: procesoId,
        },
      ]);
      if (error) throw error;
    } catch (error: any) {
      if (error?.code !== '42P01') console.warn('Error al abrir tiempo en área:', error?.message);
    }
  },

  /**
   * Obtener el registro actual de tiempo en área (el que tiene fecha_salida null) para un trámite.
   */
  obtenerTiempoEnAreaActual: async (tramiteId: string): Promise<TiempoEnArea | null> => {
    try {
      const { data, error } = await supabase
        .from('tiempo_en_area')
        .select('*')
        .eq('tramite_id', tramiteId)
        .is('fecha_salida', null)
        .order('fecha_entrada', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    } catch (error: any) {
      if (error?.code === '42P01') return null;
      console.warn('Error al obtener tiempo en área actual:', error?.message);
      return null;
    }
  },

  /**
   * Obtener registros actuales de tiempo (fecha_salida null) para varios trámites.
   */
  obtenerTiemposActualesPorTramites: async (tramiteIds: string[]): Promise<Record<string, TiempoEnArea | null>> => {
    if (tramiteIds.length === 0) return {};
    try {
      const { data, error } = await supabase
        .from('tiempo_en_area')
        .select('*')
        .in('tramite_id', tramiteIds)
        .is('fecha_salida', null);
      if (error) throw error;
      const result: Record<string, TiempoEnArea | null> = {};
      tramiteIds.forEach((id) => { result[id] = null; });
      (data || []).forEach((row: TiempoEnArea) => {
        if (!result[row.tramite_id] || new Date(row.fecha_entrada) > new Date((result[row.tramite_id] as TiempoEnArea).fecha_entrada)) {
          result[row.tramite_id] = row;
        }
      });
      return result;
    } catch (error: any) {
      if (error?.code === '42P01') return {};
      console.warn('Error al obtener tiempos actuales:', error?.message);
      return {};
    }
  },

  /**
   * Obtener TODOS los registros de tiempo en área para los trámites (para sumar tiempo total por área).
   */
  obtenerTodosTiemposEnAreaPorTramites: async (tramiteIds: string[]): Promise<TiempoEnArea[]> => {
    if (tramiteIds.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('tiempo_en_area')
        .select('*')
        .in('tramite_id', tramiteIds)
        .order('fecha_entrada', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      console.warn('Error al obtener todos los tiempos en área:', error?.message);
      return [];
    }
  },

  /** Registros de tiempo_en_area abiertos (sin fecha_salida) para evaluar notificaciones 50/70/100%. */
  obtenerTiemposEnAreaAbiertos: async (): Promise<TiempoEnArea[]> => {
    try {
      const { data, error } = await supabase
        .from('tiempo_en_area')
        .select('*')
        .is('fecha_salida', null)
        .order('fecha_entrada', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      console.warn('Error al obtener tiempos en área abiertos:', error?.message);
      return [];
    }
  },

  /** Obtener trámites por lista de IDs (solo campos necesarios para notificaciones). */
  obtenerTramitesPorIds: async (ids: string[]): Promise<Pick<Tramite, 'id' | 'titulo' | 'proceso'>[]> => {
    if (ids.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('tramites')
        .select('id, titulo, proceso')
        .in('id', ids);
      if (error) throw error;
      return (data || []) as Pick<Tramite, 'id' | 'titulo' | 'proceso'>[];
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      return [];
    }
  },
};

// ============================================
// SERVICIO DE NOTIFICACIONES POR TIEMPO (50%, 70%, 100%)
// ============================================

export const notificacionesTiempoService = {
  /** Notificaciones para usuarios de un área (donde corre el tiempo del proceso). */
  obtenerPorArea: async (areaNombre: string): Promise<NotificacionTiempo[]> => {
    try {
      const { data, error } = await supabase
        .from('notificaciones_tiempo')
        .select('*')
        .eq('area_nombre', areaNombre)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      console.warn('Error al obtener notificaciones por área:', error?.message);
      return [];
    }
  },

  /** Notificaciones NO leídas para un usuario concreto de un área. */
  obtenerNoLeidasPorAreaYUsuario: async (
    areaNombre: string,
    usuarioId: string
  ): Promise<NotificacionTiempo[]> => {
    try {
      const [notifsRes, leidasRes] = await Promise.all([
        supabase
          .from('notificaciones_tiempo')
          .select('*')
          .eq('area_nombre', areaNombre)
          .order('created_at', { ascending: false })
          .limit(100),
        supabase
          .from('notificacion_leida')
          .select('notificacion_id')
          .eq('usuario_id', usuarioId),
      ]);

      const notifError = (notifsRes as any).error;
      const leidasError = (leidasRes as any).error;
      if (notifError) throw notifError;
      if (leidasError) throw leidasError;

      const notifs = (notifsRes as any).data as NotificacionTiempo[] | null;
      const leidas = ((leidasRes as any).data as { notificacion_id: number }[] | null) ?? [];
      const leidasSet = new Set(leidas.map((r) => r.notificacion_id));

      return (notifs || []).filter((n) => !leidasSet.has(n.id));
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      console.warn('Error al obtener notificaciones no leídas:', error?.message);
      return [];
    }
  },

  /** Pares (tiempo_en_area_id, porcentaje) ya emitidos para no duplicar. */
  obtenerYaEmitidasPorTiempoEnArea: async (
    tiempoEnAreaIds: number[]
  ): Promise<{ tiempo_en_area_id: number; porcentaje: number }[]> => {
    if (tiempoEnAreaIds.length === 0) return [];
    try {
      const { data, error } = await supabase
        .from('notificaciones_tiempo')
        .select('tiempo_en_area_id, porcentaje')
        .in('tiempo_en_area_id', tiempoEnAreaIds);
      if (error) throw error;
      return (data || []).map((r: any) => ({
        tiempo_en_area_id: r.tiempo_en_area_id,
        porcentaje: r.porcentaje,
      }));
    } catch (error: any) {
      if (error?.code === '42P01') return [];
      return [];
    }
  },

  /** Insertar una notificación (evitar duplicados con unique en BD). */
  insertar: async (payload: {
    tiempo_en_area_id: number;
    tramite_id: string;
    tramite_titulo: string;
    area_nombre: string;
    porcentaje: 50 | 70 | 100;
    mensaje: string;
  }): Promise<NotificacionTiempo | null> => {
    try {
      const { data, error } = await supabase
        .from('notificaciones_tiempo')
        .insert(payload)
        .select()
        .single();
      if (error) {
        if (error.code === '23505') return null; // unique violation = ya existe
        throw error;
      }
      return data;
    } catch (error: any) {
      console.warn('Error al insertar notificación tiempo:', error?.message);
      return null;
    }
  },

  /** Marca una notificación como leída para un usuario (tabla notificacion_leida). */
  marcarLeida: async (notificacionId: number, usuarioId: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('notificacion_leida')
        .insert({
          notificacion_id: notificacionId,
          usuario_id: usuarioId,
        });
      if (error && error.code !== '23505') throw error;
    } catch (error: any) {
      if (error?.code === '42P01') return;
      console.warn('Error al marcar notificación como leída:', error?.message);
    }
  },
};

// ============================================
// SERVICIO DE HISTORIAL DE UPLOADS
// ============================================

export const historialUploadsService = {
  /**
   * Obtener historial de uploads
   */
  obtenerHistorial: async (): Promise<HistorialUpload[]> => {
    try {
      const { data, error } = await supabase
        .from('historial_uploads')
        .select('*')
        .order('fecha_subida', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error al obtener historial de uploads:', error);
      throw new Error(error.message || 'Error al obtener historial');
    }
  },

  /**
   * Registrar un nuevo upload
   */
  registrarUpload: async (upload: Omit<HistorialUpload, 'id' | 'fecha_subida'>): Promise<HistorialUpload> => {
    try {
      const { data, error } = await supabase
        .from('historial_uploads')
        .insert([upload])
        .select()
        .single();

      if (error) {
        // Si la tabla no existe, lanzar un error específico
        if (error.message?.includes('Could not find the table') || 
            error.message?.includes('relation') ||
            error.message?.includes('does not exist')) {
          const tableError = new Error('Tabla historial_uploads no encontrada. Ejecuta supabase-schema-completo.sql en Supabase.');
          (tableError as any).isTableNotFound = true;
          throw tableError;
        }
        throw error;
      }
      if (!data) throw new Error('Error al registrar upload');

      return data;
    } catch (error: any) {
      // Re-lanzar el error para que el código que llama pueda manejarlo
      throw error;
    }
  },
};

// ============================================
// DOCUMENTOS TÉCNICOS DE OBRA
// ============================================

const DOC_TECNICO_SELECT =
  '*, contratistas(id, responsable, identificacion), contrato:contrato_id(id, lote, no_contrato, contratista_nombre)';
const MOV_DOC_TECNICO_SELECT = '*, area:departamento(id, area)';

function parseNoAdendaSolicitud(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = typeof value === 'number' ? value : parseInt(String(value).trim(), 10);
  return Number.isNaN(n) ? null : n;
}

function parseMontoDocumento(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') {
    return Number.isNaN(value) ? null : Math.round(value * 100) / 100;
  }
  const normalized = String(value).trim().replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const n = parseFloat(normalized);
  return Number.isNaN(n) ? null : Math.round(n * 100) / 100;
}

function parseCodigoAdenda(value: string | number | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed || null;
}

function mapDocumentoTecnicoRow(row: Record<string, unknown>): DocumentoTecnicoObra {
  const contratistaRaw = row.contratistas;
  const contratista = (
    Array.isArray(contratistaRaw) ? contratistaRaw[0] : contratistaRaw
  ) as Contratista | null;
  const contratoRaw = row.contrato;
  const contrato = (
    Array.isArray(contratoRaw) ? contratoRaw[0] : contratoRaw
  ) as DocumentoTecnicoObra['contrato'];
  const { contratistas: _c, contrato: _ct, ...rest } = row;
  const idSigede = Array.isArray(rest.id_sigede)
    ? (rest.id_sigede as string[]).map(String)
    : rest.id_sigede
      ? [String(rest.id_sigede)]
      : [];
  const obraIds = Array.isArray(rest.obra_ids)
    ? (rest.obra_ids as string[]).map(String)
    : rest.obra_ids
      ? [String(rest.obra_ids)]
      : [];
  return {
    ...(rest as unknown as DocumentoTecnicoObra),
    id_sigede: idSigede,
    obra_ids: obraIds,
    no_adenda_solicituda: parseNoAdendaSolicitud(
      (rest.no_adenda_solicituda ?? rest.no_adenda_solicitud) as string | number | null,
    ),
    numero_adenda_anterior: parseCodigoAdenda(rest.numero_adenda_anterior as string | number | null),
    numero_adenda_actual: parseCodigoAdenda(rest.numero_adenda_actual as string | number | null),
    contratista: contratista ?? null,
    contrato: contrato ?? null,
  };
}

function mapMovimientoDocumentoRow(row: Record<string, unknown>): MovimientoDocumentoTecnicoObra {
  const areaRaw = row.area;
  const area = (Array.isArray(areaRaw) ? areaRaw[0] : areaRaw) as MovimientoDocumentoTecnicoObra['area'];
  const { area: _a, ...rest } = row;
  return { ...(rest as unknown as MovimientoDocumentoTecnicoObra), area: area ?? null };
}

const AREA_ORIGEN_GESTION_TECNICA = 'Gestión técnica de documento';

function resolverNombreAreaPorId(
  departamentoId: string | null | undefined,
  areas: Area[],
): string | null {
  if (!departamentoId?.trim()) return null;
  return areas.find((a) => a.id === departamentoId.trim())?.area ?? null;
}

function mapearEstatusAEstadoTramite(estatus: string | null | undefined): Tramite['estado'] {
  const e = (estatus || '').trim();
  if (e === 'Detenida') return 'detenido';
  if (e === 'Certificada') return 'completado';
  return 'en_transito';
}

function mapearEstatusAEstadoResultante(estatus: string | null | undefined): string | null {
  const e = (estatus || '').trim();
  if (e === 'Detenida') return 'detenido';
  if (e === 'Certificada') return 'completado';
  return null;
}

async function obtenerAreaOrigenMovimientoDocumento(
  noTramite: string,
  movimientoActualId: string,
  areas: Area[],
): Promise<string> {
  const { data, error } = await supabase
    .from('movimiento_documentos_tecnicos_obra')
    .select('id, departamento, fecha_entrada, created_at')
    .eq('no_tramite', noTramite.trim())
    .order('fecha_entrada', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });

  if (error) throw error;

  const filas = data || [];
  const idx = filas.findIndex((r) => r.id === movimientoActualId);
  if (idx <= 0) return AREA_ORIGEN_GESTION_TECNICA;

  const prev = filas[idx - 1];
  return resolverNombreAreaPorId(prev.departamento, areas) || AREA_ORIGEN_GESTION_TECNICA;
}

/** Garantiza registro en `tramites` para que `no_tramite` pueda recibir movimientos de seguimiento. */
async function asegurarTramiteGestionTecnica(params: {
  noTramite: string;
  solicitud: string;
  areaDestinatario: string;
  oficio?: string | null;
}): Promise<void> {
  const id = params.noTramite.trim();
  const { data: existing, error: selErr } = await supabase
    .from('tramites')
    .select('id, tipo_tramite')
    .eq('id', id)
    .maybeSingle();
  if (selErr) throw selErr;

  if (existing?.id) {
    if (existing.tipo_tramite !== 'tipo_gestion_tecnica') {
      const { error: updErr } = await supabase
        .from('tramites')
        .update({
          tipo_tramite: 'tipo_gestion_tecnica',
          area_destinatario: params.areaDestinatario,
          area_destino_final: params.areaDestinatario,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (updErr) throw updErr;
    }
    return;
  }

  const { data: doc, error: docErr } = await supabase
    .from('documentos_tecnicos_obra')
    .select('tipo_adenda')
    .eq('solicitud', params.solicitud.trim())
    .maybeSingle();
  if (docErr) throw docErr;

  const tituloBase = `Doc. técnico ${params.solicitud}`;
  const titulo = doc?.tipo_adenda
    ? `${tituloBase} - ${doc.tipo_adenda}`
    : tituloBase;

  const { error: insErr } = await supabase.from('tramites').insert({
    id,
    titulo,
    oficio: params.oficio?.trim() || null,
    nombre_destinatario: params.solicitud,
    area_destinatario: params.areaDestinatario,
    area_destino_final: params.areaDestinatario,
    proceso: null,
    estado: 'en_transito',
    codigo_barras: id,
    archivo_pdf: null,
    nombre_archivo: null,
    tipo_tramite: 'tipo_gestion_tecnica',
  });
  if (insErr) throw insErr;
}

async function actualizarEstadoTramiteDesdeUltimoMovimiento(tramiteId: string): Promise<void> {
  const { data: ultimo, error } = await supabase
    .from('movimientos_tramites')
    .select('area_destino, estado_resultante')
    .eq('tramite_id', tramiteId.trim())
    .order('fecha_movimiento', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!ultimo) return;

  const estado =
    ultimo.estado_resultante === 'detenido'
      ? 'detenido'
      : ultimo.estado_resultante === 'completado'
        ? 'completado'
        : 'en_transito';

  await tramitesService.actualizarTramite(tramiteId, {
    area_destinatario: ultimo.area_destino as string,
    estado: estado as Tramite['estado'],
  });
}

async function eliminarEspejoMovimientoEnTramite(movimientoDocumentoId: string): Promise<string | null> {
  const { data: espejo, error: selErr } = await supabase
    .from('movimientos_tramites')
    .select('tramite_id')
    .eq('movimiento_documento_id', movimientoDocumentoId)
    .maybeSingle();
  if (selErr) throw selErr;

  const { error: delErr } = await supabase
    .from('movimientos_tramites')
    .delete()
    .eq('movimiento_documento_id', movimientoDocumentoId);
  if (delErr) throw delErr;

  return (espejo?.tramite_id as string) || null;
}

/**
 * Replica o actualiza el movimiento de gestión técnica en `movimientos_tramites` (solo lectura en seguimiento).
 */
async function sincronizarMovimientoGestionTecnicaATramite(
  movimiento: MovimientoDocumentoTecnicoObra,
  opciones: { usuario?: string | null } = {},
): Promise<void> {
  const noTramite = movimiento.no_tramite?.trim();
  if (!noTramite) {
    await eliminarEspejoMovimientoEnTramite(movimiento.id);
    return;
  }

  const areas = await areasService.obtenerAreas();
  const areaDestinoNombre =
    movimiento.area?.area || resolverNombreAreaPorId(movimiento.departamento, areas);
  if (!areaDestinoNombre) return;

  await asegurarTramiteGestionTecnica({
    noTramite,
    solicitud: movimiento.solicitud,
    areaDestinatario: areaDestinoNombre,
    oficio: movimiento.oficio,
  });

  const areaOrigen = await obtenerAreaOrigenMovimientoDocumento(
    noTramite,
    movimiento.id,
    areas,
  );

  const estatus = movimiento.estatus?.trim() || '';
  const esDetenido = estatus === 'Detenida';
  const esCompletado = estatus === 'Certificada';
  const areaDestinoMovimiento =
    esDetenido || esCompletado ? areaOrigen : areaDestinoNombre;

  const observacionesPartes = [
    movimiento.observaciones?.trim() || null,
    `Solicitud: ${movimiento.solicitud}`,
    estatus ? `Estatus: ${estatus}` : null,
    movimiento.fecha_entrada ? `Entrada: ${movimiento.fecha_entrada}` : null,
    MARCA_OBSERVACION_GESTION_TECNICA,
  ].filter(Boolean);

  const payload = {
    tramite_id: noTramite,
    area_origen: areaOrigen,
    area_destino: areaDestinoMovimiento,
    oficio: movimiento.oficio?.trim() || null,
    observaciones: observacionesPartes.join(' | '),
    usuario: opciones.usuario?.trim() || 'Gestión técnica de documento',
    estado_resultante: mapearEstatusAEstadoResultante(estatus),
    tipo_tramite: 'tipo_gestion_tecnica',
    movimiento_documento_id: movimiento.id,
  };

  const { data: espejo, error: buscarErr } = await supabase
    .from('movimientos_tramites')
    .select('id, tramite_id')
    .eq('movimiento_documento_id', movimiento.id)
    .maybeSingle();
  if (buscarErr) throw buscarErr;

  if (espejo?.id) {
    if (espejo.tramite_id !== noTramite) {
      await supabase.from('movimientos_tramites').delete().eq('id', espejo.id);
      const { error: insErr } = await supabase.from('movimientos_tramites').insert(payload);
      if (insErr) throw insErr;
    } else {
      const { error: updErr } = await supabase
        .from('movimientos_tramites')
        .update(payload)
        .eq('id', espejo.id);
      if (updErr) throw updErr;
    }
  } else {
    const { error: insErr } = await supabase.from('movimientos_tramites').insert(payload);
    if (insErr) throw insErr;
  }

  await tramitesService.actualizarTramite(noTramite, {
    area_destinatario: areaDestinoNombre,
    estado: mapearEstatusAEstadoTramite(estatus),
    tipo_tramite: 'tipo_gestion_tecnica',
  });
}

async function cargarObrasSigedeDocumento(
  doc: Pick<DocumentoTecnicoObra, 'id_sigede' | 'obra_ids'>,
): Promise<ObraSigedeResumen[]> {
  return obrasService.obtenerResumenesObrasDocumento(doc.id_sigede || [], doc.obra_ids || []);
}

export const documentosTecnicosService = {
  listar: async (filtros?: { busqueda?: string }): Promise<DocumentoTecnicoObra[]> => {
    const { data, error } = await supabase
      .from('documentos_tecnicos_obra')
      .select(DOC_TECNICO_SELECT)
      .order('created_at', { ascending: false });

    if (error) throw error;

    let filas = (data || []).map((r) => mapDocumentoTecnicoRow(r as Record<string, unknown>));
    filas = await Promise.all(
      filas.map(async (doc) => ({
        ...doc,
        obras_sigede: await cargarObrasSigedeDocumento(doc),
      })),
    );
    const term = filtros?.busqueda?.trim().toLowerCase();
    if (term) {
      const termNorm = normalizarNoContrato(term).toLowerCase();
      const coincideNumeroContrato = (valor?: string | null): boolean => {
        if (!valor?.trim()) return false;
        const raw = valor.toLowerCase();
        if (raw.includes(term)) return true;
        const norm = normalizarNoContrato(valor).toLowerCase();
        return !!termNorm && norm.includes(termNorm);
      };

      filas = filas.filter((d) => {
        const responsable = (d.contratista?.responsable || '').toLowerCase();
        const sigedes = (d.id_sigede || []).join(' ').toLowerCase();
        const obraIds = (d.obra_ids || []).join(' ').toLowerCase();
        const planteles = (d.obras_sigede || [])
          .map((o) => o.plantel || '')
          .join(' ')
          .toLowerCase();
        const contratoDoc = d.contrato?.no_contrato;
        const contratosObra = (d.obras_sigede || [])
          .map((o) => o.contrato)
          .filter(Boolean) as string[];
        return (
          d.solicitud.toLowerCase().includes(term) ||
          (d.cuadrantes || '').toLowerCase().includes(term) ||
          (d.tipo_adenda || '').toLowerCase().includes(term) ||
          String(d.no_adenda_solicituda ?? '').includes(term) ||
          (d.numero_adenda_anterior || '').toLowerCase().includes(term) ||
          (d.numero_adenda_actual || '').toLowerCase().includes(term) ||
          (d.tipo_adenda_anterior || '').toLowerCase().includes(term) ||
          (d.observacion || '').toLowerCase().includes(term) ||
          responsable.includes(term) ||
          sigedes.includes(term) ||
          obraIds.includes(term) ||
          planteles.includes(term) ||
          coincideNumeroContrato(contratoDoc) ||
          contratosObra.some((c) => coincideNumeroContrato(c))
        );
      });
    }
    return filas;
  },

  obtenerPorSolicitud: async (solicitud: string): Promise<DocumentoTecnicoObra | null> => {
    const { data, error } = await supabase
      .from('documentos_tecnicos_obra')
      .select(DOC_TECNICO_SELECT)
      .eq('solicitud', solicitud.trim())
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const doc = mapDocumentoTecnicoRow(data as Record<string, unknown>);
    return {
      ...doc,
      obras_sigede: await cargarObrasSigedeDocumento(doc),
    };
  },

  obtenerPorId: async (id: string): Promise<DocumentoTecnicoObra | null> => {
    const { data, error } = await supabase
      .from('documentos_tecnicos_obra')
      .select(DOC_TECNICO_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const doc = mapDocumentoTecnicoRow(data as Record<string, unknown>);
    return {
      ...doc,
      obras_sigede: await cargarObrasSigedeDocumento(doc),
    };
  },

  crear: async (payload: {
    solicitud: string;
    cuadrantes?: string;
    tipo_adenda?: string;
    no_adenda_solicituda?: number | string | null;
    tipo_adenda_anterior?: string;
    numero_adenda_anterior?: string | null;
    numero_adenda_actual?: string | null;
    observacion?: string;
    monto_contrato_base?: number | string | null;
    monto_adenda_anterior?: number | string | null;
    monto_adenda_solicitada?: number | string | null;
    monto_total?: number | string | null;
    contratista_id?: string | null;
    contrato_id?: string | null;
    id_sigede: string[];
    obra_ids?: string[];
  }): Promise<DocumentoTecnicoObra> => {
    const row = {
      solicitud: payload.solicitud.trim().slice(0, 75),
      cuadrantes: payload.cuadrantes?.trim() || null,
      tipo_adenda: payload.tipo_adenda?.trim() || null,
      no_adenda_solicituda: parseNoAdendaSolicitud(payload.no_adenda_solicituda),
      tipo_adenda_anterior: payload.tipo_adenda_anterior?.trim() || null,
      numero_adenda_anterior: parseCodigoAdenda(payload.numero_adenda_anterior),
      numero_adenda_actual: parseCodigoAdenda(payload.numero_adenda_actual),
      observacion: payload.observacion?.trim() || null,
      monto_contrato_base: parseMontoDocumento(payload.monto_contrato_base),
      monto_adenda_anterior: parseMontoDocumento(payload.monto_adenda_anterior),
      monto_adenda_solicitada: parseMontoDocumento(payload.monto_adenda_solicitada),
      monto_total: parseMontoDocumento(payload.monto_total),
      contratista_id: payload.contratista_id || null,
      contrato_id: payload.contrato_id || null,
      id_sigede: payload.id_sigede.filter(Boolean).map((s) => s.trim()).filter(Boolean),
      obra_ids: (payload.obra_ids || []).filter(Boolean).map((s) => s.trim()).filter(Boolean),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('documentos_tecnicos_obra')
      .insert(row)
      .select(DOC_TECNICO_SELECT)
      .single();

    if (error) throw error;
    const doc = mapDocumentoTecnicoRow(data as Record<string, unknown>);
    return {
      ...doc,
      obras_sigede: await cargarObrasSigedeDocumento(doc),
    };
  },

  actualizar: async (
    id: string,
    payload: Partial<{
      solicitud: string;
      cuadrantes: string | null;
      tipo_adenda: string | null;
      no_adenda_solicituda: number | string | null;
      tipo_adenda_anterior: string | null;
      numero_adenda_anterior: string | null;
      numero_adenda_actual: string | null;
      observacion: string | null;
      monto_contrato_base: number | string | null;
      monto_adenda_anterior: number | string | null;
      monto_adenda_solicitada: number | string | null;
      monto_total: number | string | null;
      contratista_id: string | null;
      contrato_id: string | null;
      id_sigede: string[];
      obra_ids: string[];
    }>,
  ): Promise<DocumentoTecnicoObra> => {
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.solicitud !== undefined) updates.solicitud = payload.solicitud.trim().slice(0, 75);
    if (payload.cuadrantes !== undefined) updates.cuadrantes = payload.cuadrantes?.trim() || null;
    if (payload.tipo_adenda !== undefined) updates.tipo_adenda = payload.tipo_adenda?.trim() || null;
    if (payload.no_adenda_solicituda !== undefined) {
      updates.no_adenda_solicituda = parseNoAdendaSolicitud(payload.no_adenda_solicituda);
    }
    if (payload.tipo_adenda_anterior !== undefined) {
      updates.tipo_adenda_anterior = payload.tipo_adenda_anterior?.trim() || null;
    }
    if (payload.numero_adenda_anterior !== undefined) {
      updates.numero_adenda_anterior = parseCodigoAdenda(payload.numero_adenda_anterior);
    }
    if (payload.numero_adenda_actual !== undefined) {
      updates.numero_adenda_actual = parseCodigoAdenda(payload.numero_adenda_actual);
    }
    if (payload.observacion !== undefined) {
      updates.observacion = payload.observacion?.trim() || null;
    }
    if (payload.monto_contrato_base !== undefined) {
      updates.monto_contrato_base = parseMontoDocumento(payload.monto_contrato_base);
    }
    if (payload.monto_adenda_anterior !== undefined) {
      updates.monto_adenda_anterior = parseMontoDocumento(payload.monto_adenda_anterior);
    }
    if (payload.monto_adenda_solicitada !== undefined) {
      updates.monto_adenda_solicitada = parseMontoDocumento(payload.monto_adenda_solicitada);
    }
    if (payload.monto_total !== undefined) {
      updates.monto_total = parseMontoDocumento(payload.monto_total);
    }
    if (payload.contratista_id !== undefined) updates.contratista_id = payload.contratista_id;
    if (payload.contrato_id !== undefined) updates.contrato_id = payload.contrato_id || null;
    if (payload.id_sigede !== undefined) {
      updates.id_sigede = payload.id_sigede.filter(Boolean).map((s) => s.trim()).filter(Boolean);
    }
    if (payload.obra_ids !== undefined) {
      updates.obra_ids = payload.obra_ids.filter(Boolean).map((s) => s.trim()).filter(Boolean);
    }

    const { data, error } = await supabase
      .from('documentos_tecnicos_obra')
      .update(updates)
      .eq('id', id)
      .select(DOC_TECNICO_SELECT)
      .single();

    if (error) throw error;
    const doc = mapDocumentoTecnicoRow(data as Record<string, unknown>);
    return {
      ...doc,
      obras_sigede: await cargarObrasSigedeDocumento(doc),
    };
  },

  eliminar: async (id: string): Promise<void> => {
    const { error } = await supabase.from('documentos_tecnicos_obra').delete().eq('id', id);
    if (error) throw error;
  },

  listarMovimientos: async (solicitud: string): Promise<MovimientoDocumentoTecnicoObra[]> => {
    const { data, error } = await supabase
      .from('movimiento_documentos_tecnicos_obra')
      .select(MOV_DOC_TECNICO_SELECT)
      .eq('solicitud', solicitud.trim())
      .order('fecha_entrada', { ascending: true, nullsFirst: false })
      .order('fecha_salida', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true });

    if (error) throw error;
    const filas = (data || []).map((r) => mapMovimientoDocumentoRow(r as Record<string, unknown>));
    return ordenarMovimientosDocumento(filas);
  },

  crearMovimiento: async (payload: {
    solicitud: string;
    fecha_solicitud?: string | null;
    fecha_entrada?: string | null;
    no_tramite?: string | null;
    oficio?: string | null;
    estatus?: string | null;
    departamento?: string | null;
    fecha_salida?: string | null;
    observaciones?: string | null;
    usuario?: string | null;
  }): Promise<MovimientoDocumentoTecnicoObra> => {
    const solicitud = payload.solicitud.trim();
    const existentes = await documentosTecnicosService.listarMovimientos(solicitud);
    const errorValidacion = validarMovimientoDocumento(existentes, payload);
    if (errorValidacion) {
      throw new Error(errorValidacion);
    }
    if (payload.estatus?.trim() && !esEstatusMovimientoValido(payload.estatus)) {
      throw new Error('Estatus debe ser: En Proceso, Detenida o Certificada');
    }

    const row: Record<string, string | null> = {
      solicitud,
      fecha_solicitud: payload.fecha_solicitud || null,
      fecha_entrada: payload.fecha_entrada || null,
      no_tramite: payload.no_tramite?.trim() || null,
      oficio: payload.oficio?.trim() || null,
      estatus: payload.estatus?.trim() || null,
      departamento: payload.departamento?.trim() || null,
      fecha_salida: payload.fecha_salida || null,
      observaciones: payload.observaciones?.trim() || null,
    };

    const { data, error } = await supabase
      .from('movimiento_documentos_tecnicos_obra')
      .insert(row)
      .select(MOV_DOC_TECNICO_SELECT)
      .single();

    if (error) {
      const msg = error.message || '';
      if (/fecha_entrada|oficio|estatus|observaciones/i.test(msg) && (error.code === 'PGRST204' || /column/i.test(msg))) {
        throw new Error(
          'Faltan columnas en movimiento_documentos_tecnicos_obra. Ejecute supabase-schema-completo.sql en Supabase y recargue la página.',
        );
      }
      throw error;
    }
    const movimiento = mapMovimientoDocumentoRow(data as Record<string, unknown>);
    try {
      await sincronizarMovimientoGestionTecnicaATramite(movimiento, {
        usuario: payload.usuario,
      });
    } catch (syncErr: unknown) {
      const msg = syncErr instanceof Error ? syncErr.message : 'Error al sincronizar con seguimiento de trámite';
      throw new Error(
        `Movimiento guardado, pero no se pudo sincronizar con Seguimiento de trámite: ${msg}`,
      );
    }
    return movimiento;
  },

  actualizarMovimiento: async (
    id: string,
    payload: {
      solicitud: string;
      fecha_solicitud?: string | null;
      fecha_entrada?: string | null;
      no_tramite?: string | null;
      oficio?: string | null;
      estatus?: string | null;
      departamento?: string | null;
      fecha_salida?: string | null;
      observaciones?: string | null;
    },
  ): Promise<MovimientoDocumentoTecnicoObra> => {
    const solicitud = payload.solicitud.trim();
    const existentes = await documentosTecnicosService.listarMovimientos(solicitud);
    const errorValidacion = validarMovimientoDocumento(existentes, payload, id);
    if (errorValidacion) {
      throw new Error(errorValidacion);
    }
    if (payload.estatus?.trim() && !esEstatusMovimientoValido(payload.estatus)) {
      throw new Error('Estatus debe ser: En Proceso, Detenida o Certificada');
    }

    const updates: Record<string, string | null> = {
      fecha_solicitud: payload.fecha_solicitud || null,
      fecha_entrada: payload.fecha_entrada || null,
      no_tramite: payload.no_tramite?.trim() || null,
      oficio: payload.oficio?.trim() || null,
      estatus: payload.estatus?.trim() || null,
      departamento: payload.departamento?.trim() || null,
      fecha_salida: payload.fecha_salida || null,
      observaciones: payload.observaciones?.trim() || null,
    };

    const { data, error } = await supabase
      .from('movimiento_documentos_tecnicos_obra')
      .update(updates)
      .eq('id', id)
      .select(MOV_DOC_TECNICO_SELECT)
      .single();

    if (error) throw error;
    const movimiento = mapMovimientoDocumentoRow(data as Record<string, unknown>);
    try {
      await sincronizarMovimientoGestionTecnicaATramite(movimiento);
    } catch (syncErr: unknown) {
      const msg = syncErr instanceof Error ? syncErr.message : 'Error al sincronizar con seguimiento de trámite';
      throw new Error(
        `Movimiento actualizado, pero no se pudo sincronizar con Seguimiento de trámite: ${msg}`,
      );
    }
    return movimiento;
  },

  eliminarMovimiento: async (id: string): Promise<void> => {
    const tramiteId = await eliminarEspejoMovimientoEnTramite(id);
    const { error } = await supabase.from('movimiento_documentos_tecnicos_obra').delete().eq('id', id);
    if (error) throw error;
    if (tramiteId) {
      try {
        await actualizarEstadoTramiteDesdeUltimoMovimiento(tramiteId);
      } catch {
        /* estado del trámite se ajustará en el próximo movimiento */
      }
    }
  },

  listarTodosMovimientos: async (): Promise<MovimientoDocumentoTecnicoObra[]> => {
    const { data, error } = await supabase
      .from('movimiento_documentos_tecnicos_obra')
      .select(MOV_DOC_TECNICO_SELECT)
      .order('solicitud', { ascending: true })
      .order('fecha_entrada', { ascending: true, nullsFirst: false })
      .order('fecha_salida', { ascending: true, nullsFirst: false });

    if (error) throw error;
    return (data || []).map((r) => mapMovimientoDocumentoRow(r as Record<string, unknown>));
  },

  importarMasivo: async (payload: {
    documentos: Array<{
      solicitud: string;
      cuadrantes?: string;
      no_contrato?: string;
      tipo_adenda?: string;
      no_adenda_solicituda?: number | null;
      tipo_adenda_anterior?: string;
      numero_adenda_anterior?: string | null;
      numero_adenda_actual?: string | null;
      observacion?: string;
      monto_contrato_base?: number | null;
      monto_adenda_anterior?: number | null;
      monto_adenda_solicitada?: number | null;
      monto_total?: number | null;
      contratista?: string;
      id_sigede?: string[];
    }>;
    movimientos: Array<{
      solicitud: string;
      fecha_solicitud?: string | null;
      fecha_entrada?: string | null;
      no_tramite?: string | null;
      oficio?: string | null;
      estatus?: string | null;
      departamento?: string | null;
      fecha_salida?: string | null;
      observaciones?: string | null;
    }>;
    adendas?: Array<{
      no_contrato: string;
      numero_adenda: string;
      tipo_adenda?: string;
      monto?: number | null;
      estado?: EstadoAdenda | null;
    }>;
  }): Promise<{
    documentosCreados: number;
    documentosActualizados: number;
    movimientosCreados: number;
    adendasCreadas: number;
    adendasActualizadas: number;
    errores: string[];
  }> => {
    const resultado = {
      documentosCreados: 0,
      documentosActualizados: 0,
      movimientosCreados: 0,
      adendasCreadas: 0,
      adendasActualizadas: 0,
      errores: [] as string[],
    };

    if (
      payload.documentos.length === 0 &&
      payload.movimientos.length === 0 &&
      (payload.adendas?.length ?? 0) === 0
    ) {
      throw new Error('El archivo no contiene documentos ni movimientos para importar');
    }

    const areas = await areasService.obtenerAreas();
    const areaPorNombre = new Map(
      areas.map((a) => [a.area.trim().toLowerCase(), a.id] as const),
    );

    const solicitudesRegistradas = new Set<string>();

    for (let i = 0; i < payload.documentos.length; i++) {
      const fila = payload.documentos[i];
      const filaNum = i + 2;
      try {
        if (!fila.solicitud.trim()) {
          resultado.errores.push(`Documentos fila ${filaNum}: solicitud vacía`);
          continue;
        }

        let contratista_id: string | null = null;
        if (fila.contratista?.trim()) {
          contratista_id = await contratistasService.buscarOCrearPorResponsable(fila.contratista);
        }

        let contrato_id: string | null = null;
        if (fila.no_contrato?.trim()) {
          const contrato = await adendaService.resolverOCrearContrato({
            no_contrato: fila.no_contrato,
            crearSiFalta: true,
          });
          if (contrato?.id) {
            contrato_id = contrato.id;
          } else {
            resultado.errores.push(
              `Documentos fila ${filaNum}: no se pudo resolver el contrato "${fila.no_contrato.trim()}"`,
            );
          }
        }

        const existente = await documentosTecnicosService.obtenerPorSolicitud(fila.solicitud);
        const docPayload = {
          solicitud: fila.solicitud,
          cuadrantes: fila.cuadrantes,
          monto_contrato_base: fila.monto_contrato_base,
          tipo_adenda_anterior: fila.tipo_adenda_anterior,
          numero_adenda_anterior: fila.numero_adenda_anterior,
          numero_adenda_actual: fila.numero_adenda_actual,
          monto_adenda_anterior: fila.monto_adenda_anterior,
          tipo_adenda: fila.tipo_adenda,
          no_adenda_solicituda: fila.no_adenda_solicituda,
          monto_adenda_solicitada: fila.monto_adenda_solicitada,
          monto_total: fila.monto_total,
          observacion: fila.observacion,
          contratista_id,
          contrato_id,
          id_sigede: fila.id_sigede || [],
        };

        if (existente) {
          await documentosTecnicosService.actualizar(existente.id, docPayload);
          resultado.documentosActualizados += 1;
        } else {
          await documentosTecnicosService.crear(docPayload);
          resultado.documentosCreados += 1;
        }
        solicitudesRegistradas.add(fila.solicitud.trim().toLowerCase());
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        resultado.errores.push(`Documentos fila ${filaNum}: ${msg}`);
      }
    }

    const filasAdendas = payload.adendas || [];
    for (let i = 0; i < filasAdendas.length; i++) {
      const fila = filasAdendas[i];
      const filaNum = i + 2;
      try {
        const noContrato = fila.no_contrato.trim();
        const numeroAdenda = fila.numero_adenda.trim();
        if (!noContrato || !numeroAdenda) {
          resultado.errores.push(`Adendas fila ${filaNum}: número de contrato y código adenda son obligatorios`);
          continue;
        }
        if (!fila.estado || !['en_curso', 'anterior'].includes(fila.estado)) {
          resultado.errores.push(
            `Adendas fila ${filaNum}: estado inválido (use en_curso o anterior)`,
          );
          continue;
        }

        const contrato = await adendaService.resolverOCrearContrato({
          no_contrato: noContrato,
          crearSiFalta: true,
        });
        if (!contrato?.id) {
          resultado.errores.push(
            `Adendas fila ${filaNum}: no se pudo resolver el contrato "${noContrato}"`,
          );
          continue;
        }

        const existente = await adendaService.obtenerPorContratoYNumero(contrato.id, numeroAdenda);
        const adendaPayload = {
          contrato_id: contrato.id,
          numero_adenda: numeroAdenda,
          tipo_adenda: fila.tipo_adenda || null,
          monto: fila.monto ?? null,
          estado: fila.estado,
        };

        if (existente) {
          await adendaService.actualizar(existente.id, adendaPayload);
          resultado.adendasActualizadas += 1;
        } else {
          await adendaService.crear(adendaPayload);
          resultado.adendasCreadas += 1;
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        resultado.errores.push(`Adendas fila ${filaNum}: ${msg}`);
      }
    }

    for (let i = 0; i < payload.movimientos.length; i++) {
      const fila = payload.movimientos[i];
      const filaNum = i + 2;
      try {
        const solicitud = fila.solicitud.trim();
        if (!solicitud) {
          resultado.errores.push(`Movimientos fila ${filaNum}: solicitud vacía`);
          continue;
        }

        const docExiste =
          solicitudesRegistradas.has(solicitud.toLowerCase()) ||
          (await documentosTecnicosService.obtenerPorSolicitud(solicitud));

        if (!docExiste) {
          resultado.errores.push(
            `Movimientos fila ${filaNum}: no existe documento con solicitud "${solicitud}"`,
          );
          continue;
        }

        let departamentoId: string | null = null;
        if (fila.departamento?.trim()) {
          departamentoId =
            areaPorNombre.get(fila.departamento.trim().toLowerCase()) || null;
          if (!departamentoId) {
            resultado.errores.push(
              `Movimientos fila ${filaNum}: departamento "${fila.departamento}" no encontrado`,
            );
            continue;
          }
        }

        await documentosTecnicosService.crearMovimiento({
          solicitud,
          fecha_solicitud: fila.fecha_solicitud || null,
          fecha_entrada: fila.fecha_entrada || null,
          no_tramite: fila.no_tramite || null,
          oficio: fila.oficio || null,
          estatus: fila.estatus || null,
          departamento: departamentoId,
          fecha_salida: fila.fecha_salida || null,
          observaciones: fila.observaciones || null,
          usuario: 'Importación Excel',
        });
        resultado.movimientosCreados += 1;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        resultado.errores.push(`Movimientos fila ${filaNum}: ${msg}`);
      }
    }

    return resultado;
  },
};

const ADENDA_SELECT = '*, contrato:contrato_id(id, lote, no_contrato)';

function mapAdendaRow(row: Record<string, unknown>): Adenda {
  const contratoRaw = row.contrato;
  const contrato = (
    Array.isArray(contratoRaw) ? contratoRaw[0] : contratoRaw
  ) as Adenda['contrato'];
  const { contrato: _c, ...rest } = row;
  return {
    ...(rest as unknown as Adenda),
    estado: (rest.estado as EstadoAdenda) || 'anterior',
    numero_adenda: String(rest.numero_adenda || ''),
    contrato: contrato ?? null,
  };
}

async function demoteOtrasAdendasEnCurso(contratoId: string, exceptId?: string): Promise<void> {
  let query = supabase
    .from('adenda')
    .update({ estado: 'anterior', updated_at: new Date().toISOString() })
    .eq('contrato_id', contratoId)
    .eq('estado', 'en_curso');
  if (exceptId) query = query.neq('id', exceptId);
  const { error } = await query;
  if (error) throw error;
}

export const adendaService = {
  listarPorContrato: async (contratoId: string): Promise<Adenda[]> => {
    const { data, error } = await supabase
      .from('adenda')
      .select(ADENDA_SELECT)
      .eq('contrato_id', contratoId)
      .order('estado', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    const filas = (data || []).map((r) => mapAdendaRow(r as Record<string, unknown>));
    return filas.sort((a, b) => {
      if (a.estado !== b.estado) {
        if (a.estado === 'en_curso') return -1;
        if (b.estado === 'en_curso') return 1;
      }
      return (b.created_at || '').localeCompare(a.created_at || '');
    });
  },

  buscarContratos: async (search: string, limit = 8): Promise<ContratoTechado[]> => {
    return contratoObrasService.buscarContratos(search, limit);
  },

  buscarContratoPorNumero: async (
    noContrato: string,
    options?: { crearSiFalta?: boolean },
  ): Promise<ContratoTechado | null> => {
    return contratoObrasService.buscarContratoPorNumero(noContrato, options);
  },

  resolverOCrearContrato: async (options: {
    no_contrato: string;
    contratista_nombre?: string | null;
    crearSiFalta?: boolean;
  }): Promise<ContratoTechado | null> => {
    return contratoObrasService.resolverOCrearContrato(options);
  },

  listarPorContratoIds: async (contratoIds: string[]): Promise<Adenda[]> => {
    const ids = Array.from(new Set(contratoIds.filter(Boolean)));
    if (ids.length === 0) return [];
    const { data, error } = await supabase
      .from('adenda')
      .select(ADENDA_SELECT)
      .in('contrato_id', ids)
      .order('contrato_id', { ascending: true })
      .order('estado', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map((r) => mapAdendaRow(r as Record<string, unknown>));
  },

  obtenerPorContratoYNumero: async (
    contratoId: string,
    numeroAdenda: string,
  ): Promise<Adenda | null> => {
    const numero = parseCodigoAdenda(numeroAdenda) || numeroAdenda.trim();
    if (!contratoId || !numero) return null;
    const { data, error } = await supabase
      .from('adenda')
      .select(ADENDA_SELECT)
      .eq('contrato_id', contratoId)
      .eq('numero_adenda', numero)
      .maybeSingle();

    if (error) throw error;
    return data ? mapAdendaRow(data as Record<string, unknown>) : null;
  },

  obtenerContratoPorId: async (id: string): Promise<ContratoTechado | null> => {
    return contratoObrasService.obtenerContratoPorId(id);
  },

  crear: async (payload: {
    contrato_id: string;
    numero_adenda: string;
    tipo_adenda?: string | null;
    monto?: number | string | null;
    estado: EstadoAdenda;
  }): Promise<Adenda> => {
    const estado = payload.estado;
    if (estado === 'en_curso') {
      await demoteOtrasAdendasEnCurso(payload.contrato_id);
    }

    const row = {
      contrato_id: payload.contrato_id,
      numero_adenda: parseCodigoAdenda(payload.numero_adenda) || payload.numero_adenda.trim(),
      tipo_adenda: payload.tipo_adenda?.trim() || null,
      monto: parseMontoDocumento(payload.monto),
      estado,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('adenda')
      .insert(row)
      .select(ADENDA_SELECT)
      .single();

    if (error) throw error;
    return mapAdendaRow(data as Record<string, unknown>);
  },

  actualizar: async (
    id: string,
    payload: Partial<{
      numero_adenda: string;
      tipo_adenda: string | null;
      monto: number | string | null;
      estado: EstadoAdenda;
    }>,
  ): Promise<Adenda> => {
    const { data: actual, error: errActual } = await supabase
      .from('adenda')
      .select('contrato_id, estado')
      .eq('id', id)
      .maybeSingle();

    if (errActual) throw errActual;
    if (!actual) throw new Error('Adenda no encontrada');

    const nuevoEstado = payload.estado ?? (actual.estado as EstadoAdenda);
    if (nuevoEstado === 'en_curso') {
      await demoteOtrasAdendasEnCurso(actual.contrato_id as string, id);
    }

    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (payload.numero_adenda !== undefined) {
      updates.numero_adenda = parseCodigoAdenda(payload.numero_adenda) || payload.numero_adenda.trim();
    }
    if (payload.tipo_adenda !== undefined) updates.tipo_adenda = payload.tipo_adenda?.trim() || null;
    if (payload.monto !== undefined) updates.monto = parseMontoDocumento(payload.monto);
    if (payload.estado !== undefined) updates.estado = payload.estado;

    const { data, error } = await supabase
      .from('adenda')
      .update(updates)
      .eq('id', id)
      .select(ADENDA_SELECT)
      .single();

    if (error) throw error;
    return mapAdendaRow(data as Record<string, unknown>);
  },

  eliminar: async (id: string): Promise<void> => {
    const { error } = await supabase.from('adenda').delete().eq('id', id);
    if (error) throw error;
  },
};

// ============================================
// SERVICIO DE STORAGE (para archivos)
// ============================================

export const storageService = {
  /**
   * Subir un archivo a Supabase Storage
   */
  subirArchivo: async (file: File, bucket: string, path: string): Promise<string> => {
    try {
      // Algunos buckets no permiten MIME de Excel; subir como octet-stream para que acepte
      const excelMimes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      const fileToUpload =
        excelMimes.includes(file.type)
          ? new File([file], file.name, { type: 'application/octet-stream' })
          : file;

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, fileToUpload, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;
      if (!data) throw new Error('Error al subir archivo');

      // Obtener URL pública
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Error al subir archivo:', error);
      throw new Error(error.message || 'Error al subir archivo');
    }
  },

  /**
   * Obtener URL pública de un archivo
   */
  obtenerUrlPublica: (bucket: string, path: string): string => {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  /**
   * Eliminar un archivo
   */
  eliminarArchivo: async (bucket: string, path: string): Promise<void> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
    } catch (error: any) {
      console.error('Error al eliminar archivo:', error);
      throw new Error(error.message || 'Error al eliminar archivo');
    }
  },
};
