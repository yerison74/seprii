import React, { useEffect, useMemo, useState } from 'react';
import { BeachAccess as BeachIcon, Edit as EditIcon } from '@mui/icons-material';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
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
import { rrhhColaboradoresService, type RrhhColaborador } from '../../../services/rrhhColaboradores.service';
import {
  calcularDiasVacacion,
  esFechaPasada,
  fechaHoyLocal,
  rrhhVacacionesService,
  type RrhhVacacion,
  type RrhhVacacionEstado,
} from '../../../services/rrhhVacaciones.service';
import ModuloPageHeader from '../../ui/ModuloPageHeader';
import ColaboradorBuscador from './ColaboradorBuscador';

const INPUT = `w-full px-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 outline-none transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed ${SEPRI_FIELD_SHADOW}`;
const LABEL = 'text-xs font-medium text-stone-400';
const FIELD = 'flex flex-col gap-1.5 min-w-0';

export type VacacionFormMode = 'create' | 'edit' | 'view';

interface VacacionFormProps {
  mode?: VacacionFormMode;
  vacacionId?: string | null;
  onCancel: () => void;
  onSaved: (vacacion: RrhhVacacion) => void;
}

type FormState = {
  colaborador_id: string;
  fecha_inicio: string;
  fecha_fin: string;
  estado: RrhhVacacionEstado;
  observaciones: string;
};

const EMPTY: FormState = {
  colaborador_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  estado: 'Pendiente',
  observaciones: '',
};

const VacacionForm: React.FC<VacacionFormProps> = ({
  mode = 'create',
  vacacionId = null,
  onCancel,
  onSaved,
}) => {
  const { hasPermission } = useAuth();
  const puedeEditar =
    hasPermission(PERMISOS.EDITAR_RH_VACACIONES) || hasPermission(PERMISOS.EDITAR_RECURSO_HUMANO);
  const readOnly = mode === 'view' || !puedeEditar;
  const isCreate = mode === 'create';

  const [form, setForm] = useState<FormState>(EMPTY);
  const [colaboradores, setColaboradores] = useState<RrhhColaborador[]>([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const dias = useMemo(
    () => calcularDiasVacacion(form.fecha_inicio, form.fecha_fin),
    [form.fecha_inicio, form.fecha_fin],
  );
  const hoy = useMemo(() => fechaHoyLocal(), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingInit(true);
      setError(null);
      try {
        const cols = await rrhhColaboradoresService.listar();
        if (cancelled) return;
        setColaboradores(cols.filter((c) => c.estado !== 'Inactivo'));

        if (vacacionId) {
          const row = await rrhhVacacionesService.obtenerPorId(vacacionId);
          if (!row) throw new Error('Registro de vacaciones no encontrado.');
          if (cancelled) return;
          setForm({
            colaborador_id: row.colaborador_id,
            fecha_inicio: row.fecha_inicio,
            fecha_fin: row.fecha_fin,
            estado: row.estado,
            observaciones: row.observaciones || '',
          });
        } else {
          setForm(EMPTY);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError((err as { message?: string })?.message || 'No se pudo cargar el formulario.');
        }
      } finally {
        if (!cancelled) setLoadingInit(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [vacacionId]);

  const validar = (): string | null => {
    if (!form.colaborador_id) return 'Selecciona un colaborador.';
    if (!form.fecha_inicio) return 'La fecha de inicio es obligatoria.';
    if (!form.fecha_fin) return 'La fecha de fin es obligatoria.';
    if (esFechaPasada(form.fecha_inicio)) {
      return 'La fecha de inicio no puede ser una fecha pasada.';
    }
    if (esFechaPasada(form.fecha_fin)) {
      return 'La fecha de fin no puede ser una fecha pasada.';
    }
    if (dias <= 0) return 'La fecha de fin debe ser igual o posterior a la de inicio.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;
    const msg = validar();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        colaborador_id: form.colaborador_id,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        dias,
        estado: form.estado,
        observaciones: form.observaciones || null,
      };

      let saved: RrhhVacacion;
      if (isCreate) {
        saved = await rrhhVacacionesService.crear(payload);
      } else {
        if (!vacacionId) throw new Error('Registro inválido.');
        saved = await rrhhVacacionesService.actualizar(vacacionId, payload);
      }
      onSaved(saved);
    } catch (err: unknown) {
      setError((err as { message?: string })?.message || 'No se pudo guardar la vacación.');
    } finally {
      setSaving(false);
    }
  };

  const titulo =
    mode === 'view' ? 'Ver vacaciones' : isCreate ? 'Registrar vacaciones' : 'Editar vacaciones';

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
        icon={mode === 'create' ? <BeachIcon fontSize="small" /> : <EditIcon fontSize="small" />}
        title={titulo}
        description="Registra el período de vacaciones de un colaborador."
      >
        <button type="button" onClick={onCancel} className={BTN_SECONDARY_SM} disabled={saving}>
          <ArrowLeft size={15} strokeWidth={1.75} aria-hidden />
          Volver
        </button>
        {!readOnly && (
          <button type="submit" form="form-vacacion" className={BTN_PRIMARY} disabled={saving}>
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

      <form id="form-vacacion" onSubmit={handleSubmit} className={GT_STACK} noValidate>
        <section className={GT_BLOQUE_FORM}>
          <p className={GT_BLOQUE_TITULO}>Datos de la solicitud</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className={`${FIELD} sm:col-span-2`}>
              <label className={LABEL} htmlFor="vac-colaborador">
                Colaborador *
              </label>
              <ColaboradorBuscador
                id="vac-colaborador"
                colaboradores={colaboradores}
                value={form.colaborador_id}
                onChange={(id) => setField('colaborador_id', id)}
                disabled={readOnly}
              />
              <p className="text-[11px] text-stone-400">
                Escribe para buscar por nombre, cédula, área o cargo.
              </p>
            </div>

            <div className={FIELD}>
              <label className={LABEL} htmlFor="vac-inicio">
                Fecha inicio *
              </label>
              <input
                id="vac-inicio"
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setField('fecha_inicio', e.target.value)}
                className={INPUT}
                disabled={readOnly}
                min={hoy}
                required
              />
            </div>

            <div className={FIELD}>
              <label className={LABEL} htmlFor="vac-fin">
                Fecha fin *
              </label>
              <input
                id="vac-fin"
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setField('fecha_fin', e.target.value)}
                className={INPUT}
                disabled={readOnly}
                min={form.fecha_inicio && form.fecha_inicio > hoy ? form.fecha_inicio : hoy}
                required
              />
            </div>

            <div className={FIELD}>
              <label className={LABEL} htmlFor="vac-dias">
                Días
              </label>
              <input
                id="vac-dias"
                value={dias > 0 ? String(dias) : '—'}
                className={INPUT}
                disabled
                readOnly
              />
            </div>

            <div className={FIELD}>
              <label className={LABEL} htmlFor="vac-estado">
                Estado
              </label>
              <select
                id="vac-estado"
                value={form.estado}
                onChange={(e) => setField('estado', e.target.value as RrhhVacacionEstado)}
                className={INPUT}
                disabled={readOnly}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Aprobada">Aprobada</option>
                <option value="Rechazada">Rechazada</option>
              </select>
            </div>

            <div className={`${FIELD} sm:col-span-2`}>
              <label className={LABEL} htmlFor="vac-obs">
                Observaciones
              </label>
              <textarea
                id="vac-obs"
                value={form.observaciones}
                onChange={(e) => setField('observaciones', e.target.value)}
                className={`${INPUT} min-h-[5rem] resize-y`}
                disabled={readOnly}
                placeholder="Notas opcionales"
              />
            </div>
          </div>
        </section>

        {error && (
          <div className={GT_ALERTA_ERROR} role="alert">
            {error}
          </div>
        )}

        {!readOnly && (
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

export default VacacionForm;
