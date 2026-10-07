import React, { useEffect, useRef, useState } from 'react';
import { PersonAdd as PersonAddIcon, Edit as EditIcon } from '@mui/icons-material';
import { ArrowLeft, Link2, Loader2, Save } from 'lucide-react';
import { CARGOS } from '../../../constants/cargos';
import { PERMISOS } from '../../../constants/permisos';
import {
  GT_ALERTA_ERROR,
  GT_BLOQUE_FORM,
  GT_BLOQUE_TITULO,
  GT_PAGE,
  GT_STACK,
  SEPRI_FIELD_SHADOW,
} from '../../../constants/gestionTecnicaDocumentoUi';
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  BTN_SECONDARY_SM,
} from '../../../constants/buttonStyles';
import { useAuth } from '../../../context/AuthContext';
import { useAreas } from '../../../hooks/useAreas';
import {
  rrhhColaboradoresService,
  type RrhhColaborador,
  type RrhhColaboradorEstado,
  type RrhhVinculoIdentificacion,
} from '../../../services/rrhhColaboradores.service';
import {
  esCedulaCompleta,
  formatearCedulaInput,
  mensajeCedulaInvalida,
  normalizarCedula,
} from '../../../utils/cedula';
import ModuloPageHeader from '../../ui/ModuloPageHeader';

const INPUT = `w-full px-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 outline-none transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${SEPRI_FIELD_SHADOW}`;
const LABEL = 'text-xs font-medium text-stone-400';
const FIELD = 'flex flex-col gap-1.5 min-w-0';

export type ColaboradorFormMode = 'create' | 'edit' | 'view';

interface ColaboradorFormProps {
  mode?: ColaboradorFormMode;
  colaboradorId?: string | null;
  onCancel: () => void;
  onSaved: (colaborador: RrhhColaborador) => void;
}

type FormState = {
  nombre: string;
  identificacion: string;
  cargo: string;
  departamento: string;
  telefono: string;
  correo: string;
  direccion: string;
  estado: RrhhColaboradorEstado;
  usuario_app_id: string | null;
};

const EMPTY: FormState = {
  nombre: '',
  identificacion: '',
  cargo: '',
  departamento: '',
  telefono: '',
  correo: '',
  direccion: '',
  estado: 'Activo',
  usuario_app_id: null,
};

const ColaboradorForm: React.FC<ColaboradorFormProps> = ({
  mode = 'create',
  colaboradorId = null,
  onCancel,
  onSaved,
}) => {
  const { hasPermission } = useAuth();
  const { areas, loadingAreas } = useAreas();

  const puedeEditarColab =
    hasPermission(PERMISOS.EDITAR_RH_PERSONAL) || hasPermission(PERMISOS.EDITAR_RECURSO_HUMANO);

  const readOnlyColab =
    mode === 'view' || (mode === 'edit' && !puedeEditarColab) || (mode === 'create' && !puedeEditarColab);
  const isCreate = mode === 'create';

  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [loadingInit, setLoadingInit] = useState(Boolean(colaboradorId));
  const [buscandoVinculo, setBuscandoVinculo] = useState(false);
  const [vinculo, setVinculo] = useState<RrhhVinculoIdentificacion | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipLookupRef = useRef(false);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  useEffect(() => {
    if (!colaboradorId) return;
    let cancelled = false;

    (async () => {
      setLoadingInit(true);
      setError(null);
      try {
        skipLookupRef.current = true;
        const colab = await rrhhColaboradoresService.obtenerPorId(colaboradorId);
        if (!colab) throw new Error('Colaborador no encontrado.');
        if (cancelled) return;

        setForm({
          nombre: colab.nombre || '',
          identificacion: formatearCedulaInput(colab.identificacion || ''),
          cargo: colab.cargo || '',
          departamento: colab.departamento || '',
          telefono: colab.telefono || '',
          correo: colab.correo || '',
          direccion: colab.direccion || '',
          estado: colab.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
          usuario_app_id: colab.usuario_app_id || null,
        });
      } catch (err: unknown) {
        if (!cancelled) {
          setError((err as { message?: string })?.message || 'No se pudo cargar el colaborador.');
        }
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [colaboradorId]);

  useEffect(() => {
    if (!isCreate || readOnlyColab) return;
    if (skipLookupRef.current) {
      skipLookupRef.current = false;
      return;
    }

    const doc = form.identificacion.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!esCedulaCompleta(doc)) {
      setVinculo(null);
      setForm((prev) => (prev.usuario_app_id ? { ...prev, usuario_app_id: null } : prev));
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setBuscandoVinculo(true);
      try {
        const res = await rrhhColaboradoresService.buscarRelacionPorIdentificacion(doc);
        setVinculo(res);

        if (res.colaborador) {
          setError('Ya existe un colaborador con esta cédula.');
          setForm((prev) => ({ ...prev, usuario_app_id: null }));
          return;
        }

        setError(null);
        if (res.usuarioApp?.id) {
          const nombreUsuario = [res.usuarioApp.nombre, res.usuarioApp.apellido]
            .filter(Boolean)
            .join(' ')
            .trim();
          setForm((prev) => ({
            ...prev,
            usuario_app_id: res.usuarioApp!.id,
            nombre: prev.nombre.trim() ? prev.nombre : nombreUsuario,
            cargo: prev.cargo.trim() ? prev.cargo : res.usuarioApp?.cargo || '',
            departamento: prev.departamento.trim() ? prev.departamento : res.usuarioApp?.area || '',
            correo: prev.correo.trim() ? prev.correo : res.usuarioApp?.usuario || '',
          }));
        } else {
          setForm((prev) => ({ ...prev, usuario_app_id: null }));
        }
      } catch {
        setVinculo(null);
      } finally {
        setBuscandoVinculo(false);
      }
    }, 400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [form.identificacion, isCreate, readOnlyColab]);

  const validar = (): string | null => {
    if (!form.nombre.trim()) return 'El nombre es obligatorio.';
    if (!form.identificacion.trim()) return 'La cédula es obligatoria.';
    const cedulaMsg = mensajeCedulaInvalida(form.identificacion);
    if (cedulaMsg) return cedulaMsg;
    if (isCreate && vinculo?.colaborador) {
      return 'Ya existe un colaborador con esta cédula.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnlyColab) return;

    const msg = validar();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const colabPayload = {
        nombre: form.nombre,
        identificacion: normalizarCedula(form.identificacion),
        cargo: form.cargo || null,
        departamento: form.departamento || null,
        telefono: form.telefono || null,
        correo: form.correo || null,
        direccion: form.direccion || null,
        estado: form.estado,
        usuario_app_id: form.usuario_app_id,
      };

      let saved: RrhhColaborador;
      if (isCreate) {
        if (!puedeEditarColab) throw new Error('No tienes permiso para crear colaboradores.');
        saved = await rrhhColaboradoresService.crear(colabPayload);
      } else {
        if (!colaboradorId) throw new Error('Colaborador inválido.');
        if (!puedeEditarColab) throw new Error('No tienes permiso para editar colaboradores.');
        saved = await rrhhColaboradoresService.actualizar(colaboradorId, colabPayload);
      }

      onSaved(saved);
    } catch (err: unknown) {
      const anyErr = err as { message?: string; code?: string };
      if (anyErr?.code === '23505' || /duplicate|unique/i.test(anyErr?.message || '')) {
        setError('Conflicto de datos únicos (identificación o vínculo).');
      } else {
        setError(anyErr?.message || 'No se pudo guardar.');
      }
    } finally {
      setSaving(false);
    }
  };

  const titulo =
    mode === 'view' ? 'Ver colaborador' : isCreate ? 'Nuevo colaborador' : 'Editar colaborador';

  if (loadingInit) {
    return (
      <div className={`${GT_PAGE} items-center justify-center py-16`}>
        <Loader2 className="animate-spin text-stone-400" size={28} />
      </div>
    );
  }

  return (
    <div className={`${GT_PAGE} p-2 sm:p-0`}>
      <ModuloPageHeader
        icon={mode === 'create' ? <PersonAddIcon fontSize="small" /> : <EditIcon fontSize="small" />}
        title={titulo}
        description="Ficha de personal. Los accesos y permisos de la aplicación se gestionan en Administración."
      >
        <button type="button" onClick={onCancel} className={BTN_SECONDARY_SM} disabled={saving}>
          <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
          Volver
        </button>
        {!readOnlyColab && (
          <button type="submit" form="form-colaborador" className={BTN_PRIMARY} disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={15} className="animate-spin" aria-hidden />
                Guardando…
              </>
            ) : (
              <>
                <Save size={15} strokeWidth={1.75} aria-hidden />
                Guardar
              </>
            )}
          </button>
        )}
      </ModuloPageHeader>

      <form id="form-colaborador" onSubmit={handleSubmit} className={GT_STACK} noValidate>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 w-full">
          <section className={GT_BLOQUE_FORM}>
            <p className={GT_BLOQUE_TITULO}>Identificación y datos personales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className={`${FIELD} sm:col-span-2`}>
                <label className={LABEL} htmlFor="colab-identificacion">
                  Cédula *
                </label>
                <div className="relative">
                  <input
                    id="colab-identificacion"
                    value={form.identificacion}
                    onChange={(e) => setField('identificacion', formatearCedulaInput(e.target.value))}
                    className={INPUT}
                    placeholder="000-0000000-0"
                    inputMode="numeric"
                    autoComplete="off"
                    maxLength={13}
                    disabled={readOnlyColab || mode !== 'create'}
                    required
                  />
                  {buscandoVinculo && (
                    <Loader2
                      size={15}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 animate-spin"
                    />
                  )}
                </div>
                {form.usuario_app_id && (
                  <p
                    className="inline-flex items-center gap-1.5 text-xs text-[#1E88E5] bg-primary-light/50 rounded-xl px-2.5 py-1.5"
                    role="status"
                  >
                    <Link2 size={13} strokeWidth={1.75} />
                    Vinculado a un usuario de la aplicación (misma cédula)
                  </p>
                )}
              </div>

              <div className={`${FIELD} sm:col-span-2`}>
                <label className={LABEL} htmlFor="colab-nombre">
                  Nombre completo *
                </label>
                <input
                  id="colab-nombre"
                  value={form.nombre}
                  onChange={(e) => setField('nombre', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
                  required
                />
              </div>

              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-estado">
                  Estado
                </label>
                <select
                  id="colab-estado"
                  value={form.estado}
                  onChange={(e) => setField('estado', e.target.value as RrhhColaboradorEstado)}
                  className={INPUT}
                  disabled={readOnlyColab}
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>
            </div>
          </section>

          <section className={GT_BLOQUE_FORM}>
            <p className={GT_BLOQUE_TITULO}>Datos laborales</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-cargo">
                  Cargo
                </label>
                <select
                  id="colab-cargo"
                  value={form.cargo}
                  onChange={(e) => setField('cargo', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
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
                <label className={LABEL} htmlFor="colab-area">
                  Área
                </label>
                <select
                  id="colab-area"
                  value={form.departamento}
                  onChange={(e) => setField('departamento', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab || loadingAreas}
                >
                  <option value="">{loadingAreas ? 'Cargando…' : 'Seleccionar área'}</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.area}>
                      {a.area}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className={`${GT_BLOQUE_FORM} xl:col-span-2`}>
            <p className={GT_BLOQUE_TITULO}>Contacto</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-telefono">
                  Teléfono
                </label>
                <input
                  id="colab-telefono"
                  value={form.telefono}
                  onChange={(e) => setField('telefono', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
                />
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-correo">
                  Correo
                </label>
                <input
                  id="colab-correo"
                  type="email"
                  value={form.correo}
                  onChange={(e) => setField('correo', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
                  placeholder="correo@empresa.com"
                />
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-direccion">
                  Dirección
                </label>
                <input
                  id="colab-direccion"
                  value={form.direccion}
                  onChange={(e) => setField('direccion', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
                />
              </div>
            </div>
          </section>
        </div>

        {error && (
          <div className={GT_ALERTA_ERROR} role="alert">
            {error}
          </div>
        )}

        {!readOnlyColab && (
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 w-full">
            <button type="button" onClick={onCancel} className={BTN_SECONDARY} disabled={saving}>
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
                  Guardar
                </>
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default ColaboradorForm;
