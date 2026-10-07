import React, { useEffect, useMemo, useState } from 'react';
import { AdminPanelSettings as AdminIcon } from '@mui/icons-material';
import { ArrowLeft, Loader2, Plus, Save, Search, Trash2 } from 'lucide-react';
import { CARGOS } from '../constants/cargos';
import {
  aplicarPermisosAdmin,
  cambiarPermisoModuloEnMapa,
  MODULOS_PERMISOS_VISIBLES,
} from '../constants/modulosPermisos';
import { PERMISOS } from '../constants/permisos';
import {
  BTN_DANGER,
  BTN_GHOST,
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
} from '../constants/buttonStyles';
import {
  GT_ALERTA_ERROR,
  GT_ALERTA_INFO,
  GT_ALERTA_OK,
  GT_BLOQUE_FORM,
  GT_BLOQUE_TITULO,
  GT_PAGE,
  GT_STACK,
  GT_TABLA,
  GT_TABLA_HEAD,
  GT_TABLA_TD,
  GT_TABLA_TH,
  GT_TABLA_WRAP,
  GT_VACIO,
  SEPRI_CARD,
  SEPRI_FIELD_SHADOW,
} from '../constants/gestionTecnicaDocumentoUi';
import { useAuth } from '../context/AuthContext';
import { useAreas } from '../hooks/useAreas';
import {
  actualizarUsuario,
  crearUsuario,
  eliminarUsuario,
  obtenerUsuarios,
} from '../services/usuarios.service';
import { rrhhColaboradoresService } from '../services/rrhhColaboradores.service';
import {
  cedulaSoloDigitos,
  esCedulaCompleta,
  formatearCedulaInput,
  mensajeCedulaInvalida,
  normalizarCedula,
} from '../utils/cedula';
import ModuloPageHeader from './ui/ModuloPageHeader';

const INPUT = `w-full px-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 outline-none transition-all duration-150 disabled:opacity-60 ${SEPRI_FIELD_SHADOW}`;
const LABEL = 'text-xs font-medium text-stone-400';
const FIELD = 'flex flex-col gap-1.5 min-w-0';

type Vista = 'lista' | 'formulario';

type UsuarioFormState = {
  usuario: string;
  password: string;
  nombre: string;
  apellido: string;
  cargo: string;
  area: string;
  rol: string;
  activo: boolean;
  identificacion: string;
  permisos: Record<string, boolean>;
};

const EMPTY_FORM: UsuarioFormState = {
  usuario: '',
  password: '',
  nombre: '',
  apellido: '',
  cargo: '',
  area: 'Ninguna',
  rol: 'usuario',
  activo: true,
  identificacion: '',
  permisos: {},
};

function rolLabel(rol: string) {
  if (rol === 'admin') return 'Administrador';
  if (rol === 'supervision') return 'Supervisión';
  return 'Usuario';
}

const AVATAR_COLORS = [
  'bg-[#42A5F5]',
  'bg-sky-500',
  'bg-violet-500',
  'bg-teal-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-emerald-500',
  'bg-slate-500',
];

function inicialesUsuario(nombre?: string | null, apellido?: string | null, usuario?: string | null): string {
  const n = (nombre || '').trim();
  const a = (apellido || '').trim();
  if (n && a) return `${n[0] || ''}${a[0] || ''}`.toUpperCase();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
    return n.slice(0, 2).toUpperCase();
  }
  const u = (usuario || '').trim();
  return u ? u.slice(0, 2).toUpperCase() : '?';
}

function avatarClassForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) hash = (hash + id.charCodeAt(i) * (i + 1)) % 997;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const Administracion: React.FC = () => {
  const { hasPermission } = useAuth();
  const { areas, loadingAreas } = useAreas();

  const canCrear = hasPermission(PERMISOS.CREAR_USUARIOS);
  const canEditar =
    hasPermission(PERMISOS.EDITAR_USUARIOS) || hasPermission(PERMISOS.EDITAR_CONFIGURACION);
  const canGestionar = canCrear || canEditar;

  const [vista, setVista] = useState<Vista>('lista');
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<UsuarioFormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  const setField = <K extends keyof UsuarioFormState>(key: K, value: UsuarioFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerUsuarios();
      setUsers(data || []);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'No se pudieron cargar los usuarios.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const filtrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return users;
    return users.filter((u) => {
      const nombre = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
      return (
        nombre.includes(term) ||
        String(u.usuario || '')
          .toLowerCase()
          .includes(term) ||
        String(u.cargo || '')
          .toLowerCase()
          .includes(term) ||
        String(u.area || '')
          .toLowerCase()
          .includes(term)
      );
    });
  }, [users, search]);

  const activos = users.filter((u) => u.activo).length;
  const inactivos = users.length - activos;

  const permisosSeleccionados = MODULOS_PERMISOS_VISIBLES.flatMap((m) => [
    m.verKey,
    m.editarKey,
  ]).filter((k) => form.permisos?.[k]).length;
  const totalPermisos = MODULOS_PERMISOS_VISIBLES.length * 2;

  const abrirNuevo = () => {
    if (!canCrear && !canEditar) return;
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
    setVista('formulario');
  };

  const abrirEditar = (u: any) => {
    setEditId(u.id);
    setForm({
      usuario: u.usuario || '',
      password: '',
      nombre: u.nombre || '',
      apellido: u.apellido || '',
      cargo: u.cargo || '',
      area: u.area || 'Ninguna',
      rol: u.rol || 'usuario',
      activo: u.activo !== false,
      identificacion: formatearCedulaInput(u.identificacion || ''),
      permisos: u?.rol === 'admin' ? aplicarPermisosAdmin(u?.permisos) : u?.permisos || {},
    });
    setError(null);
    setVista('formulario');
  };

  const volverLista = () => {
    setVista('lista');
    setEditId(null);
    setForm(EMPTY_FORM);
    setError(null);
  };

  const validar = (): string | null => {
    if (!form.usuario.trim()) return 'El usuario (correo) es obligatorio.';
    if (!form.nombre.trim()) return 'El nombre es obligatorio.';
    if (!editId && !form.password.trim()) return 'La contraseña es obligatoria al crear el usuario.';
    const cedulaMsg = mensajeCedulaInvalida(form.identificacion);
    if (cedulaMsg) return cedulaMsg;
    return null;
  };

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId && !canEditar) {
      setError('No tienes permiso para editar usuarios.');
      return;
    }
    if (!editId && !canCrear && !canEditar) {
      setError('No tienes permiso para crear usuarios.');
      return;
    }

    const msg = validar();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const cedula = cedulaSoloDigitos(form.identificacion)
        ? normalizarCedula(form.identificacion)
        : null;

      const payload: Record<string, unknown> = {
        usuario: form.usuario.trim(),
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        cargo: form.cargo || null,
        area: form.area || 'Ninguna',
        rol: form.rol,
        activo: form.activo,
        identificacion: cedula,
        permisos: form.rol === 'admin' ? aplicarPermisosAdmin(form.permisos) : form.permisos || {},
      };
      if (form.password.trim()) payload.password = form.password;

      let userId = editId;
      if (editId) {
        await actualizarUsuario(editId, payload);
        setToast({ message: 'Usuario actualizado.', ok: true });
      } else {
        const created = await crearUsuario(payload);
        userId = created.id;
        setToast({ message: 'Usuario creado.', ok: true });
      }

      // Usuario con cédula → pasa a ser colaborador (crear o vincular por cédula)
      if (userId && cedula && esCedulaCompleta(cedula)) {
        await rrhhColaboradoresService.asegurarDesdeUsuario({
          usuarioAppId: userId,
          identificacion: cedula,
          nombre: form.nombre.trim(),
          apellido: form.apellido.trim(),
          cargo: form.cargo || null,
          area: form.area || null,
          correo: form.usuario.trim(),
          activo: form.activo,
        });
      }

      await cargar();
      volverLista();
    } catch (err: unknown) {
      const anyErr = err as { message?: string; code?: string };
      if (anyErr?.code === '23505' || /duplicate|unique/i.test(anyErr?.message || '')) {
        setError('Ya existe un usuario o colaborador con ese correo o cédula.');
      } else {
        setError(anyErr?.message || 'No se pudo guardar el usuario.');
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmarEliminar = async () => {
    if (!deleteTarget || !canEditar) return;
    setSaving(true);
    try {
      await eliminarUsuario(deleteTarget.id);
      setToast({ message: 'Usuario eliminado.', ok: true });
      setDeleteTarget(null);
      await cargar();
    } catch (err: unknown) {
      setToast({
        message: (err as { message?: string })?.message || 'No se pudo eliminar.',
        ok: false,
      });
    } finally {
      setSaving(false);
    }
  };

  if (vista === 'formulario') {
    const isEdit = Boolean(editId);
    return (
      <div className={GT_PAGE}>
        <ModuloPageHeader
          icon={<AdminIcon fontSize="small" />}
          title={isEdit ? 'Editar usuario' : 'Nuevo usuario'}
          description="Gestiona el acceso a la aplicación, rol y permisos del sistema."
        >
          <button type="button" onClick={volverLista} className={BTN_SECONDARY_SM} disabled={saving}>
            <ArrowLeft size={15} strokeWidth={1.75} />
            Volver
          </button>
          {canGestionar && (
            <button type="submit" form="form-admin-usuario" className={BTN_PRIMARY} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Guardando…
                </>
              ) : (
                <>
                  <Save size={15} strokeWidth={1.75} />
                  Guardar
                </>
              )}
            </button>
          )}
        </ModuloPageHeader>

        <form id="form-admin-usuario" onSubmit={guardar} className={GT_STACK} noValidate>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
            <section className={GT_BLOQUE_FORM}>
              <p className={GT_BLOQUE_TITULO}>Credenciales</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className={`${FIELD} sm:col-span-2`}>
                  <label className={LABEL} htmlFor="adm-usuario">
                    Usuario (correo) *
                  </label>
                  <input
                    id="adm-usuario"
                    type="email"
                    value={form.usuario}
                    onChange={(e) => setField('usuario', e.target.value)}
                    className={INPUT}
                    disabled={isEdit || !canGestionar}
                    placeholder="correo@empresa.com"
                    required
                  />
                  <p className="text-[11px] text-stone-400">El correo es el usuario de acceso.</p>
                </div>
                <div className={`${FIELD} sm:col-span-2`}>
                  <label className={LABEL} htmlFor="adm-password">
                    {isEdit ? 'Nueva contraseña (opcional)' : 'Contraseña *'}
                  </label>
                  <input
                    id="adm-password"
                    type="password"
                    value={form.password}
                    onChange={(e) => setField('password', e.target.value)}
                    className={INPUT}
                    disabled={!canGestionar}
                    autoComplete="new-password"
                  />
                </div>
              </div>
            </section>

            <section className={GT_BLOQUE_FORM}>
              <p className={GT_BLOQUE_TITULO}>Datos personales</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="adm-nombre">
                    Nombre *
                  </label>
                  <input
                    id="adm-nombre"
                    value={form.nombre}
                    onChange={(e) => setField('nombre', e.target.value)}
                    className={INPUT}
                    disabled={!canGestionar}
                    required
                  />
                </div>
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="adm-apellido">
                    Apellido
                  </label>
                  <input
                    id="adm-apellido"
                    value={form.apellido}
                    onChange={(e) => setField('apellido', e.target.value)}
                    className={INPUT}
                    disabled={!canGestionar}
                  />
                </div>
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="adm-identificacion">
                    Cédula
                  </label>
                  <input
                    id="adm-identificacion"
                    value={form.identificacion}
                    onChange={(e) => setField('identificacion', formatearCedulaInput(e.target.value))}
                    className={INPUT}
                    disabled={!canGestionar}
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={13}
                    placeholder="000-0000000-0"
                  />
                  <p className="text-[11px] text-stone-400">
                    Con cédula el usuario pasa a ser colaborador. Formato 000-0000000-0.
                  </p>
                </div>
              </div>
            </section>

            <section className={GT_BLOQUE_FORM}>
              <p className={GT_BLOQUE_TITULO}>Datos laborales</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="adm-cargo">
                    Cargo
                  </label>
                  <select
                    id="adm-cargo"
                    value={form.cargo}
                    onChange={(e) => setField('cargo', e.target.value)}
                    className={INPUT}
                    disabled={!canGestionar}
                  >
                    <option value="">Seleccionar cargo</option>
                    {CARGOS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="adm-area">
                    Área
                  </label>
                  <select
                    id="adm-area"
                    value={form.area}
                    onChange={(e) => setField('area', e.target.value)}
                    className={INPUT}
                    disabled={!canGestionar || loadingAreas}
                  >
                    <option value="Ninguna">Ninguna</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.area}>
                        {a.area}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className={GT_BLOQUE_FORM}>
              <p className={GT_BLOQUE_TITULO}>Rol y estado</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="adm-rol">
                    Rol
                  </label>
                  <select
                    id="adm-rol"
                    value={form.rol}
                    onChange={(e) => {
                      const rol = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        rol,
                        permisos:
                          rol === 'admin' ? aplicarPermisosAdmin(prev.permisos) : prev.permisos,
                      }));
                    }}
                    className={INPUT}
                    disabled={!canGestionar}
                  >
                    <option value="admin">Administrador</option>
                    <option value="supervision">Supervisión</option>
                    <option value="usuario">Usuario</option>
                  </select>
                </div>
                <div className={FIELD}>
                  <label className={LABEL} htmlFor="adm-activo">
                    Estado
                  </label>
                  <select
                    id="adm-activo"
                    value={form.activo ? '1' : '0'}
                    onChange={(e) => setField('activo', e.target.value === '1')}
                    className={INPUT}
                    disabled={!canGestionar}
                  >
                    <option value="1">Activo</option>
                    <option value="0">Inactivo</option>
                  </select>
                </div>
              </div>
            </section>
          </div>

          <section className={`${GT_BLOQUE_FORM} w-full`}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className={GT_BLOQUE_TITULO}>
                Permisos del sistema ({permisosSeleccionados}/{totalPermisos})
              </p>
              {canGestionar && (
                <button
                  type="button"
                  className={BTN_GHOST}
                  onClick={() => {
                    const allOn = permisosSeleccionados === totalPermisos;
                    const next: Record<string, boolean> = {};
                    MODULOS_PERMISOS_VISIBLES.forEach((m) => {
                      next[m.verKey] = !allOn;
                      next[m.editarKey] = !allOn;
                    });
                    setField('permisos', next);
                  }}
                >
                  {permisosSeleccionados === totalPermisos
                    ? 'Deseleccionar todo'
                    : 'Seleccionar todo'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {MODULOS_PERMISOS_VISIBLES.map((m) => {
                const canView = !!form.permisos?.[m.verKey];
                const canEditMod = !!form.permisos?.[m.editarKey];
                return (
                  <div
                    key={m.id}
                    className={`${SEPRI_CARD} px-3 py-2.5 flex items-center justify-between gap-3`}
                  >
                    <span className="text-sm font-medium text-stone-700 truncate">
                      {m.icon} {m.label}
                    </span>
                    <div className="flex items-center gap-3 shrink-0 text-xs text-stone-500">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canView}
                          disabled={!canGestionar}
                          onChange={(e) =>
                            setField(
                              'permisos',
                              cambiarPermisoModuloEnMapa(
                                form.permisos,
                                m.verKey,
                                m.editarKey,
                                'ver',
                                e.target.checked,
                              ),
                            )
                          }
                        />
                        Ver
                      </label>
                      <label className="inline-flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={canEditMod}
                          disabled={!canGestionar}
                          onChange={(e) =>
                            setField(
                              'permisos',
                              cambiarPermisoModuloEnMapa(
                                form.permisos,
                                m.verKey,
                                m.editarKey,
                                'editar',
                                e.target.checked,
                              ),
                            )
                          }
                        />
                        Editar
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {error && (
            <div className={GT_ALERTA_ERROR} role="alert">
              {error}
            </div>
          )}

          {canGestionar && (
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
              <button type="button" onClick={volverLista} className={BTN_SECONDARY} disabled={saving}>
                Cancelar
              </button>
              <button type="submit" className={BTN_PRIMARY} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Guardando…
                  </>
                ) : (
                  <>
                    <Save size={15} strokeWidth={1.75} />
                    Guardar usuario
                  </>
                )}
              </button>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className={GT_PAGE}>
      <ModuloPageHeader
        icon={<AdminIcon fontSize="small" />}
        title="Administración"
        description="Gestiona los usuarios de acceso a la aplicación, roles y permisos."
      >
        <div className="relative min-w-[200px] sm:min-w-[240px] w-full sm:w-auto">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            aria-hidden
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar usuario…"
            className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 outline-none ${SEPRI_FIELD_SHADOW}`}
          />
        </div>
        {(canCrear || canEditar) && (
          <button type="button" onClick={abrirNuevo} className={BTN_PRIMARY}>
            <Plus size={15} strokeWidth={2} />
            Nuevo usuario
          </button>
        )}
      </ModuloPageHeader>

      <div className="flex flex-wrap gap-2">
        <span className="text-[11px] font-semibold text-stone-500 bg-warm-100/90 px-2.5 py-1 rounded-full shadow-soft tabular-nums">
          Total: {users.length}
        </span>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-full shadow-soft tabular-nums">
          Activos: {activos}
        </span>
        <span className="text-[11px] font-semibold text-stone-500 bg-warm-100/90 px-2.5 py-1 rounded-full shadow-soft tabular-nums">
          Inactivos: {inactivos}
        </span>
      </div>

      {toast && (
        <div className={toast.ok ? GT_ALERTA_OK : GT_ALERTA_ERROR} role="status">
          {toast.message}
        </div>
      )}

      {error && (
        <div className={GT_ALERTA_ERROR} role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-stone-400">Cargando usuarios…</p>
      ) : filtrados.length === 0 ? (
        <div className={GT_VACIO}>
          <p className="text-sm text-stone-500">No hay usuarios con los filtros actuales.</p>
        </div>
      ) : (
        <div className={GT_TABLA_WRAP}>
          <div className="overflow-x-auto">
            <table className={GT_TABLA}>
              <thead className={GT_TABLA_HEAD}>
                <tr>
                  <th className={`${GT_TABLA_TH} w-12`}>Foto</th>
                  <th className={GT_TABLA_TH}>Usuario</th>
                  <th className={GT_TABLA_TH}>Nombre</th>
                  <th className={GT_TABLA_TH}>Cargo</th>
                  <th className={GT_TABLA_TH}>Área</th>
                  <th className={GT_TABLA_TH}>Rol</th>
                  <th className={GT_TABLA_TH}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((u) => (
                  <tr
                    key={u.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => abrirEditar(u)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        abrirEditar(u);
                      }
                    }}
                    className="border-b border-warm-100/80 last:border-b-0 hover:bg-primary-light/30 cursor-pointer transition-colors"
                  >
                    <td className={GT_TABLA_TD}>
                      <span
                        className={[
                          'inline-flex h-9 w-9 items-center justify-center rounded-full text-white text-xs font-semibold shadow-soft',
                          avatarClassForId(String(u.id || u.usuario || '')),
                        ].join(' ')}
                      >
                        {inicialesUsuario(u.nombre, u.apellido, u.usuario)}
                      </span>
                    </td>
                    <td className={`${GT_TABLA_TD} font-medium text-stone-800 whitespace-nowrap`}>
                      {u.usuario}
                    </td>
                    <td className={`${GT_TABLA_TD} whitespace-nowrap`}>
                      {[u.nombre, u.apellido].filter(Boolean).join(' ') || '—'}
                    </td>
                    <td className={`${GT_TABLA_TD} whitespace-nowrap`}>{u.cargo || '—'}</td>
                    <td className={`${GT_TABLA_TD} whitespace-nowrap`}>
                      {!u.area || u.area === 'Ninguna' ? '—' : u.area}
                    </td>
                    <td className={GT_TABLA_TD}>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary-light/60 text-[#1E88E5] shadow-soft">
                        {rolLabel(u.rol)}
                      </span>
                    </td>
                    <td className={GT_TABLA_TD}>
                      <span
                        className={[
                          'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold shadow-soft',
                          u.activo
                            ? 'bg-emerald-50/80 text-emerald-700'
                            : 'bg-warm-100/90 text-stone-500',
                        ].join(' ')}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40">
          <div className={`${SEPRI_CARD} w-full max-w-md p-5 space-y-4`}>
            <h3 className="text-base font-semibold text-stone-800">Eliminar usuario</h3>
            <p className="text-sm text-stone-500">
              ¿Eliminar a{' '}
              <span className="font-medium text-stone-700">
                {deleteTarget.nombre} {deleteTarget.apellido}
              </span>{' '}
              ({deleteTarget.usuario})? Esta acción no se puede deshacer.
            </p>
            <div className={GT_ALERTA_INFO}>Se eliminará permanentemente el acceso a la aplicación.</div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={BTN_SECONDARY}
                onClick={() => setDeleteTarget(null)}
                disabled={saving}
              >
                Cancelar
              </button>
              <button type="button" className={BTN_DANGER} onClick={confirmarEliminar} disabled={saving}>
                <Trash2 size={15} />
                {saving ? 'Eliminando…' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Administracion;
