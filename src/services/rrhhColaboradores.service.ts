import { supabase } from '../lib/supabase';
import {
  cedulaSoloDigitos,
  esCedulaCompleta,
  formatearCedulaInput,
  normalizarCedula,
} from '../utils/cedula';

/**
 * Convención RRHH:
 * Toda tabla nueva del módulo debe iniciar con "rrhh_".
 * Ejemplo base de este submódulo: rrhh_colaboradores.
 */
export type RrhhColaboradorEstado = 'Activo' | 'Inactivo';

export type RrhhColaborador = {
  id: string;
  nombre: string;
  identificacion: string;
  cargo?: string | null;
  departamento?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  estado?: RrhhColaboradorEstado | null;
  usuario_app_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type RrhhColaboradorCreate = {
  nombre: string;
  identificacion: string;
  cargo?: string | null;
  departamento?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  estado?: RrhhColaboradorEstado;
  usuario_app_id?: string | null;
};

export type RrhhVinculoIdentificacion = {
  colaborador: RrhhColaborador | null;
  usuarioApp: {
    id: string;
    nombre?: string | null;
    apellido?: string | null;
    usuario?: string | null;
    cargo?: string | null;
    area?: string | null;
    activo?: boolean | null;
  } | null;
};

const TABLA_COLABORADORES = 'rrhh_colaboradores';

const SELECT_COLS =
  'id, nombre, identificacion, cargo, departamento, telefono, correo, direccion, estado, usuario_app_id, created_at, updated_at';

export type RrhhListaItem = {
  /** Clave estable para React. */
  key: string;
  colaboradorId: string | null;
  usuarioAppId: string | null;
  /** true si solo existe en usuarios_app (sin ficha RH). */
  soloUsuario: boolean;
  nombre: string;
  identificacion: string;
  cargo: string | null;
  departamento: string | null;
  correo: string | null;
  telefono: string | null;
  estado: RrhhColaboradorEstado;
};

type UsuarioAppRow = {
  id: string;
  usuario?: string | null;
  nombre?: string | null;
  apellido?: string | null;
  cargo?: string | null;
  area?: string | null;
  activo?: boolean | null;
  identificacion?: string | null;
};

function nombreDesdeUsuario(u: UsuarioAppRow): string {
  const full = [u.nombre, u.apellido].filter(Boolean).join(' ').trim();
  return full || u.usuario || 'Sin nombre';
}

async function buscarColaboradorPorIdentificacion(
  identificacion: string,
): Promise<RrhhColaborador | null> {
  const formatted = normalizarCedula(identificacion);
  const digits = cedulaSoloDigitos(identificacion);
  if (!digits) return null;

  const variants = Array.from(new Set([formatted, digits].filter(Boolean)));
  const { data, error } = await supabase
    .from(TABLA_COLABORADORES)
    .select(SELECT_COLS)
    .in('identificacion', variants)
    .limit(1);

  if (error) throw error;
  return ((data?.[0] as RrhhColaborador) || null);
}

async function buscarUsuarioPorIdentificacion(identificacion: string): Promise<UsuarioAppRow | null> {
  const formatted = normalizarCedula(identificacion);
  const digits = cedulaSoloDigitos(identificacion);
  if (!digits) return null;

  const variants = Array.from(new Set([formatted, digits].filter(Boolean)));
  const { data, error } = await supabase
    .from('usuarios_app')
    .select('id, nombre, apellido, usuario, cargo, area, activo, identificacion')
    .in('identificacion', variants)
    .limit(1);

  if (error) throw error;
  return ((data?.[0] as UsuarioAppRow) || null);
}

export const rrhhColaboradoresService = {
  listar: async (): Promise<RrhhColaborador[]> => {
    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .select(SELECT_COLS)
      .order('nombre', { ascending: true });

    if (error) throw error;
    return (data || []) as RrhhColaborador[];
  },

  /**
   * Lista unificada: todos los colaboradores + usuarios de app
   * que aún no tienen ficha en rrhh_colaboradores.
   */
  listarUnificados: async (): Promise<RrhhListaItem[]> => {
    const [colabsRes, usersRes] = await Promise.all([
      supabase.from(TABLA_COLABORADORES).select(SELECT_COLS).order('nombre', { ascending: true }),
      supabase
        .from('usuarios_app')
        .select('id, usuario, nombre, apellido, cargo, area, activo, identificacion')
        .order('nombre', { ascending: true }),
    ]);

    if (colabsRes.error) throw colabsRes.error;
    if (usersRes.error) throw usersRes.error;

    const colabs = (colabsRes.data || []) as RrhhColaborador[];
    const users = (usersRes.data || []) as UsuarioAppRow[];

    const linkedUserIds = new Set(
      colabs.map((c) => c.usuario_app_id).filter((id): id is string => Boolean(id)),
    );

    const items: RrhhListaItem[] = colabs.map((c) => ({
      key: `colab:${c.id}`,
      colaboradorId: c.id,
      usuarioAppId: c.usuario_app_id || null,
      soloUsuario: false,
      nombre: c.nombre,
      identificacion: c.identificacion || '',
      cargo: c.cargo || null,
      departamento: c.departamento || null,
      correo: c.correo || null,
      telefono: c.telefono || null,
      estado: c.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
    }));

    for (const u of users) {
      if (linkedUserIds.has(u.id)) continue;
      items.push({
        key: `user:${u.id}`,
        colaboradorId: null,
        usuarioAppId: u.id,
        soloUsuario: true,
        nombre: nombreDesdeUsuario(u),
        identificacion: u.identificacion || '',
        cargo: u.cargo || null,
        departamento: u.area || null,
        correo: u.usuario || null,
        telefono: null,
        estado: u.activo === false ? 'Inactivo' : 'Activo',
      });
    }

    items.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));
    return items;
  },

  buscar: async (search: string): Promise<RrhhColaborador[]> => {
    const term = (search || '').trim();
    if (!term) return rrhhColaboradoresService.listar();

    const esc = term.replace(/'/g, "''");
    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .select(SELECT_COLS)
      .or(`nombre.ilike.%${esc}%,identificacion.ilike.%${esc}%`)
      .order('nombre', { ascending: true })
      .limit(80);

    if (error) throw error;
    return (data || []) as RrhhColaborador[];
  },

  obtenerPorId: async (id: string): Promise<RrhhColaborador | null> => {
    const cid = (id || '').trim();
    if (!cid) return null;
    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .select(SELECT_COLS)
      .eq('id', cid)
      .maybeSingle();
    if (error) throw error;
    return (data as RrhhColaborador) || null;
  },

  obtenerPorUsuarioAppId: async (usuarioAppId: string): Promise<RrhhColaborador | null> => {
    const uid = (usuarioAppId || '').trim();
    if (!uid) return null;
    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .select(SELECT_COLS)
      .eq('usuario_app_id', uid)
      .maybeSingle();
    if (error) throw error;
    return (data as RrhhColaborador) || null;
  },

  crear: async (payload: RrhhColaboradorCreate): Promise<RrhhColaborador> => {
    const cedula = normalizarCedula(payload.identificacion);
    if (!esCedulaCompleta(cedula)) {
      throw new Error('La cédula debe tener 11 dígitos (formato 000-0000000-0).');
    }

    const row = {
      nombre: payload.nombre.trim(),
      identificacion: cedula,
      cargo: payload.cargo?.trim() || null,
      departamento: payload.departamento?.trim() || null,
      telefono: payload.telefono?.trim() || null,
      correo: payload.correo?.trim() || null,
      direccion: payload.direccion?.trim() || null,
      estado: payload.estado || 'Activo',
      usuario_app_id: payload.usuario_app_id || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .insert(row)
      .select(SELECT_COLS)
      .single();

    if (error) throw error;
    return data as RrhhColaborador;
  },

  actualizar: async (
    id: string,
    payload: Partial<RrhhColaboradorCreate>,
  ): Promise<RrhhColaborador> => {
    const row: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (payload.nombre !== undefined) row.nombre = payload.nombre.trim();
    if (payload.identificacion !== undefined) {
      const cedula = normalizarCedula(payload.identificacion);
      if (!esCedulaCompleta(cedula)) {
        throw new Error('La cédula debe tener 11 dígitos (formato 000-0000000-0).');
      }
      row.identificacion = cedula;
    }
    if (payload.cargo !== undefined) row.cargo = payload.cargo?.trim() || null;
    if (payload.departamento !== undefined) row.departamento = payload.departamento?.trim() || null;
    if (payload.telefono !== undefined) row.telefono = payload.telefono?.trim() || null;
    if (payload.correo !== undefined) row.correo = payload.correo?.trim() || null;
    if (payload.direccion !== undefined) row.direccion = payload.direccion?.trim() || null;
    if (payload.estado !== undefined) row.estado = payload.estado;
    if (payload.usuario_app_id !== undefined) row.usuario_app_id = payload.usuario_app_id || null;

    const { data, error } = await supabase
      .from(TABLA_COLABORADORES)
      .update(row)
      .eq('id', id)
      .select(SELECT_COLS)
      .single();

    if (error) throw error;
    return data as RrhhColaborador;
  },

  /**
   * Si el usuario tiene cédula completa, crea o vincula su ficha de colaborador.
   * Regla: todo usuario con cédula es colaborador; no todo colaborador es usuario.
   */
  asegurarDesdeUsuario: async (params: {
    usuarioAppId: string;
    identificacion: string;
    nombre: string;
    apellido?: string | null;
    cargo?: string | null;
    area?: string | null;
    correo?: string | null;
    activo?: boolean;
  }): Promise<RrhhColaborador> => {
    const cedula = normalizarCedula(params.identificacion);
    if (!esCedulaCompleta(cedula)) {
      throw new Error('La cédula debe tener 11 dígitos (formato 000-0000000-0).');
    }

    const nombreCompleto =
      [params.nombre, params.apellido].filter(Boolean).join(' ').trim() ||
      params.correo ||
      'Sin nombre';

    const [porCedula, porUsuario] = await Promise.all([
      buscarColaboradorPorIdentificacion(cedula),
      rrhhColaboradoresService.obtenerPorUsuarioAppId(params.usuarioAppId),
    ]);

    if (porCedula && porUsuario && porCedula.id !== porUsuario.id) {
      throw new Error(
        'Conflicto: esta cédula pertenece a otro colaborador y el usuario ya tiene una ficha distinta.',
      );
    }

    const target = porCedula || porUsuario;
    if (target) {
      if (target.usuario_app_id && target.usuario_app_id !== params.usuarioAppId) {
        throw new Error('Esta cédula ya está asignada a otro usuario de la aplicación.');
      }

      return rrhhColaboradoresService.actualizar(target.id, {
        nombre: nombreCompleto,
        identificacion: cedula,
        cargo: params.cargo || target.cargo || null,
        departamento:
          params.area && params.area !== 'Ninguna' ? params.area : target.departamento || null,
        correo: params.correo || target.correo || null,
        estado: params.activo === false ? 'Inactivo' : 'Activo',
        usuario_app_id: params.usuarioAppId,
      });
    }

    return rrhhColaboradoresService.crear({
      nombre: nombreCompleto,
      identificacion: cedula,
      cargo: params.cargo || null,
      departamento: params.area && params.area !== 'Ninguna' ? params.area : null,
      correo: params.correo || null,
      estado: params.activo === false ? 'Inactivo' : 'Activo',
      usuario_app_id: params.usuarioAppId,
    });
  },

  /**
   * Para formularios de Usuario/Colaborador:
   * al digitar identificación, devuelve coincidencias cruzadas.
   */
  buscarRelacionPorIdentificacion: async (
    identificacion: string,
  ): Promise<RrhhVinculoIdentificacion> => {
    const digits = cedulaSoloDigitos(identificacion);
    if (!digits) return { colaborador: null, usuarioApp: null };

    const [colab, usuario] = await Promise.all([
      buscarColaboradorPorIdentificacion(digits),
      buscarUsuarioPorIdentificacion(digits),
    ]);

    let usuarioApp: RrhhVinculoIdentificacion['usuarioApp'] = null;
    if (usuario) {
      usuarioApp = {
        id: usuario.id,
        nombre: usuario.nombre || null,
        apellido: usuario.apellido || null,
        usuario: usuario.usuario || null,
        cargo: usuario.cargo || null,
        area: usuario.area || null,
        activo: usuario.activo ?? null,
      };
    }

    return {
      colaborador: colab,
      usuarioApp,
    };
  },
};

export { formatearCedulaInput, esCedulaCompleta, normalizarCedula };
