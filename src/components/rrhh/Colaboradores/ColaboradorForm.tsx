import React, { useEffect, useRef, useState } from 'react';
import { PersonAdd as PersonAddIcon, Edit as EditIcon } from '@mui/icons-material';
import { ArrowLeft, Link2, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { CARGOS } from '../../../constants/cargos';
import { PERMISOS } from '../../../constants/permisos';
import {
  GT_ALERTA_ERROR,
  GT_ALERTA_INFO,
  GT_BLOQUE_FORM,
  GT_BLOQUE_TITULO,
  GT_PAGE,
  GT_STACK,
  GT_TABLA,
  GT_TABLA_HEAD,
  GT_TABLA_TD,
  GT_TABLA_TH,
  GT_TABLA_WRAP,
  SEPRI_FIELD_SHADOW,
} from '../../../constants/gestionTecnicaDocumentoUi';
import {
  BTN_GHOST,
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
  NIVELES_FORMACION,
  rrhhFormacionAcademicaService,
} from '../../../services/rrhhFormacionAcademica.service';
import { obtenerUsuarioPorId } from '../../../services/usuarios.service';
import {
  esCedulaCompleta,
  formatearCedulaInput,
  mensajeCedulaInvalida,
  normalizarCedula,
} from '../../../utils/cedula';
import ModuloPageHeader from '../../ui/ModuloPageHeader';

const INPUT = `w-full px-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 outline-none transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${SEPRI_FIELD_SHADOW}`;
const INPUT_SM = `w-full min-w-[7rem] px-2.5 py-1.5 rounded-lg text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 outline-none transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${SEPRI_FIELD_SHADOW}`;
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
  fecha_ingreso: string;
  salario: string;
  completivo_salarial: string;
  telefono: string;
  correo: string;
  direccion: string;
  estado: RrhhColaboradorEstado;
  usuario_app_id: string | null;
  /** Nombre de usuario de app (usuarios_app.usuario); solo lectura / vínculo. */
  usuario: string;
};

const EMPTY: FormState = {
  nombre: '',
  identificacion: '',
  cargo: '',
  departamento: '',
  fecha_ingreso: '',
  salario: '',
  completivo_salarial: '',
  telefono: '',
  correo: '',
  direccion: '',
  estado: 'Activo',
  usuario_app_id: null,
  usuario: '',
};

/** Parsea montos con comas de miles (ej. 1,250,000.50). */
function parseSalario(value: string): number | null {
  const raw = value.trim().replace(/[^\d.]/g, '');
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

/** Formato tradicional RD$: 1,250,000.00 */
function formatearSalarioInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, '');
  if (!cleaned) return '';

  const parts = cleaned.split('.');
  const enteros = parts[0] || '0';
  const decimales = parts.length > 1 ? parts.slice(1).join('').slice(0, 2) : null;

  const enterosFmt = enteros.replace(/^0+(?=\d)/, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (decimales !== null) return `${enterosFmt || '0'}.${decimales}`;
  // Conserva el punto si el usuario lo acaba de escribir
  if (cleaned.endsWith('.') && parts.length === 2) return `${enterosFmt || '0'}.`;
  return enterosFmt;
}

function formatearSalarioDesdeNumero(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

type FormacionFormItem = {
  key: string;
  id: string | null;
  nivel: string;
  institucion: string;
  fecha_inicio: string;
  fecha_fin: string;
};

function nuevaFormacionItem(): FormacionFormItem {
  return {
    key: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    nivel: '',
    institucion: '',
    fecha_inicio: '',
    fecha_fin: '',
  };
}

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
  const [formaciones, setFormaciones] = useState<FormacionFormItem[]>([]);
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

  const setFormacionField = <K extends keyof FormacionFormItem>(
    keyItem: string,
    field: K,
    value: FormacionFormItem[K],
  ) => {
    setFormaciones((prev) =>
      prev.map((f) => (f.key === keyItem ? { ...f, [field]: value } : f)),
    );
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

        let usuarioLogin = '';
        if (colab.usuario_app_id) {
          const u = await obtenerUsuarioPorId(colab.usuario_app_id);
          if (cancelled) return;
          usuarioLogin = u?.usuario || '';
        }

        const formacionesDb = await rrhhFormacionAcademicaService.listarPorColaborador(colaboradorId);
        if (cancelled) return;

        setForm({
          nombre: colab.nombre || '',
          identificacion: formatearCedulaInput(colab.identificacion || ''),
          cargo: colab.cargo || '',
          departamento: colab.departamento || '',
          fecha_ingreso: colab.fecha_ingreso || '',
          salario: formatearSalarioDesdeNumero(colab.salario),
          completivo_salarial: formatearSalarioDesdeNumero(colab.completivo_salarial),
          telefono: colab.telefono || '',
          correo: colab.correo || '',
          usuario: usuarioLogin,
          direccion: colab.direccion || '',
          estado: colab.estado === 'Inactivo' ? 'Inactivo' : 'Activo',
          usuario_app_id: colab.usuario_app_id || null,
        });
        setFormaciones(
          formacionesDb.map((f) => ({
            key: f.id,
            id: f.id,
            nivel: f.nivel || '',
            institucion: f.institucion || '',
            fecha_inicio: (f.fecha_inicio || '').slice(0, 7),
            fecha_fin: (f.fecha_fin || '').slice(0, 7),
          })),
        );
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
      setForm((prev) =>
        prev.usuario_app_id || prev.usuario
          ? { ...prev, usuario_app_id: null, usuario: '' }
          : prev,
      );
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setBuscandoVinculo(true);
      try {
        const res = await rrhhColaboradoresService.buscarRelacionPorIdentificacion(doc);
        setVinculo(res);

        if (res.colaborador) {
          setError('Ya existe un colaborador con esta cédula.');
          setForm((prev) => ({ ...prev, usuario_app_id: null, usuario: '' }));
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
            usuario: res.usuarioApp?.usuario || '',
            correo: prev.correo.trim() ? prev.correo : res.usuarioApp?.correo || '',
            nombre: prev.nombre.trim() ? prev.nombre : nombreUsuario,
            cargo: prev.cargo.trim() ? prev.cargo : res.usuarioApp?.cargo || '',
            departamento: prev.departamento.trim() ? prev.departamento : res.usuarioApp?.area || '',
          }));
        } else {
          setForm((prev) => ({ ...prev, usuario_app_id: null, usuario: '' }));
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
    const salario = parseSalario(form.salario);
    if (form.salario.trim() && Number.isNaN(salario)) {
      return 'El salario debe ser un número válido.';
    }
    if (salario !== null && !Number.isNaN(salario) && salario < 0) {
      return 'El salario no puede ser negativo.';
    }
    const completivo = parseSalario(form.completivo_salarial);
    if (form.completivo_salarial.trim() && Number.isNaN(completivo)) {
      return 'El completivo salarial debe ser un número válido.';
    }
    if (completivo !== null && !Number.isNaN(completivo) && completivo < 0) {
      return 'El completivo salarial no puede ser negativo.';
    }

    for (let i = 0; i < formaciones.length; i += 1) {
      const f = formaciones[i];
      const tieneAlgo = Boolean(
        f.nivel.trim() || f.institucion.trim() || f.fecha_inicio || f.fecha_fin,
      );
      if (!tieneAlgo) continue;
      if (!f.nivel.trim() || !f.institucion.trim()) {
        return `Formación académica #${i + 1}: nivel e institución son obligatorios.`;
      }
      if (f.fecha_inicio && f.fecha_fin && f.fecha_fin < f.fecha_inicio) {
        return `Formación académica #${i + 1}: el mes/año de fin no puede ser anterior al de inicio.`;
      }
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
        fecha_ingreso: form.fecha_ingreso || null,
        salario: parseSalario(form.salario),
        completivo_salarial: parseSalario(form.completivo_salarial),
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

      const formacionesPayload = formaciones
        .filter((f) => f.nivel.trim() || f.institucion.trim() || f.fecha_inicio || f.fecha_fin)
        .map((f) => ({
          id: f.id,
          nivel: f.nivel.trim(),
          institucion: f.institucion.trim(),
          fecha_inicio: f.fecha_inicio || null,
          fecha_fin: f.fecha_fin || null,
        }));

      await rrhhFormacionAcademicaService.sincronizarParaColaborador(saved.id, formacionesPayload);

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

              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-usuario">
                  Nombre de usuario
                </label>
                <input
                  id="colab-usuario"
                  value={form.usuario}
                  className={INPUT}
                  disabled
                  readOnly
                  placeholder="Sin usuario de aplicación"
                  aria-readonly="true"
                />
                <p className="text-[11px] text-stone-400">
                  {form.usuario
                    ? 'Identificador de acceso a la app (no es el correo de contacto).'
                    : 'Se mostrará cuando el colaborador tenga un usuario en Administración.'}
                </p>
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
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-fecha-ingreso">
                  Fecha de ingreso
                </label>
                <input
                  id="colab-fecha-ingreso"
                  type="date"
                  value={form.fecha_ingreso}
                  onChange={(e) => setField('fecha_ingreso', e.target.value)}
                  className={INPUT}
                  disabled={readOnlyColab}
                />
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-salario">
                  Salario (RD$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 pointer-events-none">
                    RD$
                  </span>
                  <input
                    id="colab-salario"
                    type="text"
                    inputMode="decimal"
                    value={form.salario}
                    onChange={(e) => setField('salario', formatearSalarioInput(e.target.value))}
                    onBlur={() => {
                      const n = parseSalario(form.salario);
                      if (n !== null && !Number.isNaN(n)) {
                        setField('salario', formatearSalarioDesdeNumero(n));
                      }
                    }}
                    className={`${INPUT} pl-12`}
                    disabled={readOnlyColab}
                    placeholder="0.00"
                    autoComplete="off"
                  />
                </div>
                <p className="text-[11px] text-stone-400">
                  Pesos dominicanos. Usa coma cada tres dígitos (ej. 45,000.00).
                </p>
              </div>
              <div className={FIELD}>
                <label className={LABEL} htmlFor="colab-completivo">
                  Completivo salarial (RD$)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400 pointer-events-none">
                    RD$
                  </span>
                  <input
                    id="colab-completivo"
                    type="text"
                    inputMode="decimal"
                    value={form.completivo_salarial}
                    onChange={(e) =>
                      setField('completivo_salarial', formatearSalarioInput(e.target.value))
                    }
                    onBlur={() => {
                      const n = parseSalario(form.completivo_salarial);
                      if (n !== null && !Number.isNaN(n)) {
                        setField('completivo_salarial', formatearSalarioDesdeNumero(n));
                      }
                    }}
                    className={`${INPUT} pl-12`}
                    disabled={readOnlyColab}
                    placeholder="0.00"
                    autoComplete="off"
                  />
                </div>
                <p className="text-[11px] text-stone-400">
                  Pesos dominicanos. Usa coma cada tres dígitos (ej. 45,000.00).
                </p>
              </div>
            </div>
          </section>

          <section className={`${GT_BLOQUE_FORM} xl:col-span-2`}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <p className={GT_BLOQUE_TITULO}>Formación académica</p>
                <p className="text-[11px] text-stone-400 mt-1">
                  Registra los estudios del colaborador: nivel, institución y fechas.
                </p>
              </div>
              {!readOnlyColab && (
                <button
                  type="button"
                  className={BTN_GHOST}
                  onClick={() => setFormaciones((prev) => [...prev, nuevaFormacionItem()])}
                >
                  <Plus size={15} strokeWidth={1.75} aria-hidden />
                  Agregar formación
                </button>
              )}
            </div>

            {formaciones.length === 0 ? (
              <div className={GT_ALERTA_INFO}>
                {readOnlyColab
                  ? 'No hay formaciones académicas registradas.'
                  : 'Aún no hay formaciones. Usa “Agregar formación” para registrar una.'}
              </div>
            ) : (
              <div className={GT_TABLA_WRAP}>
                <div className="overflow-x-auto">
                  <table className={GT_TABLA}>
                    <thead className={GT_TABLA_HEAD}>
                      <tr>
                        <th className={GT_TABLA_TH}>Nivel</th>
                        <th className={GT_TABLA_TH}>Institución</th>
                        <th className={GT_TABLA_TH}>Inicio (mes/año)</th>
                        <th className={GT_TABLA_TH}>Fin (mes/año)</th>
                        {!readOnlyColab && <th className={`${GT_TABLA_TH} w-16`}> </th>}
                      </tr>
                    </thead>
                    <tbody>
                      {formaciones.map((f, idx) => (
                        <tr
                          key={f.key}
                          className="border-b border-warm-100/80 last:border-b-0"
                        >
                          <td className={GT_TABLA_TD}>
                            <select
                              aria-label={`Nivel formación ${idx + 1}`}
                              value={f.nivel}
                              onChange={(e) => setFormacionField(f.key, 'nivel', e.target.value)}
                              className={INPUT_SM}
                              disabled={readOnlyColab}
                            >
                              <option value="">Seleccionar</option>
                              {NIVELES_FORMACION.map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className={GT_TABLA_TD}>
                            <input
                              aria-label={`Institución formación ${idx + 1}`}
                              value={f.institucion}
                              onChange={(e) =>
                                setFormacionField(f.key, 'institucion', e.target.value)
                              }
                              className={`${INPUT_SM} min-w-[12rem]`}
                              disabled={readOnlyColab}
                              placeholder="Institución"
                            />
                          </td>
                          <td className={GT_TABLA_TD}>
                            <input
                              aria-label={`Mes y año de inicio formación ${idx + 1}`}
                              type="month"
                              value={f.fecha_inicio}
                              onChange={(e) =>
                                setFormacionField(f.key, 'fecha_inicio', e.target.value)
                              }
                              className={INPUT_SM}
                              disabled={readOnlyColab}
                            />
                          </td>
                          <td className={GT_TABLA_TD}>
                            <input
                              aria-label={`Mes y año de fin formación ${idx + 1}`}
                              type="month"
                              value={f.fecha_fin}
                              onChange={(e) =>
                                setFormacionField(f.key, 'fecha_fin', e.target.value)
                              }
                              className={INPUT_SM}
                              disabled={readOnlyColab}
                              min={f.fecha_inicio || undefined}
                            />
                          </td>
                          {!readOnlyColab && (
                            <td className={GT_TABLA_TD}>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center p-1.5 rounded-lg text-stone-400 hover:text-red-600 hover:bg-red-50 border-0 bg-transparent transition-colors"
                                onClick={() =>
                                  setFormaciones((prev) => prev.filter((x) => x.key !== f.key))
                                }
                                aria-label={`Eliminar formación ${idx + 1}`}
                              >
                                <Trash2 size={15} strokeWidth={1.75} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
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
                <p className="text-[11px] text-stone-400">Dato de contacto. Independiente del nombre de usuario.</p>
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
