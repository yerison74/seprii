import React, { useEffect, useState } from 'react';
import { ArrowBack, Roofing, Save, CheckCircle, Info } from '@mui/icons-material';
import ObraFormulario from './ObraFormulario';
import ModuloPageHeader from './ui/ModuloPageHeader';
import { obrasService, contratistasService } from '../services/supabaseService';
import { uploadAPI, statsAPI } from '../services/api';
import {
  obraToFormState,
  formStateToObraUpdates,
  formStateToContratistaUpdates,
  type ObraFormState,
} from '../utils/obraFormulario';
import { TECHADO_MODULO } from '../constants/techadoModulo';
import { SEPRI_INSET } from '../constants/sepriSurfaces';
import { BTN_PRIMARY, BTN_SECONDARY } from '../constants/buttonStyles';
import { CA_ALERTA_OK, CA_ALERTA_ERROR } from '../constants/cargaArchivosUi';

interface TechadoObraEditorProps {
  obraId: string;
  obraNombre?: string;
  soloLectura?: boolean;
  onVolver: () => void;
  onGuardado?: () => void;
}

const TechadoObraEditor: React.FC<TechadoObraEditorProps> = ({
  obraId,
  obraNombre,
  soloLectura = false,
  onVolver,
  onGuardado,
}) => {
  const [form, setForm] = useState<ObraFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [estadosDisponibles, setEstadosDisponibles] = useState<string[]>([]);
  const [responsableSugerencias, setResponsableSugerencias] = useState<string[]>([]);
  const [loadingResponsable, setLoadingResponsable] = useState(false);

  useEffect(() => {
    let activo = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const obra = await obrasService.obtenerObraPorIdObra(obraId);
        if (!activo) return;
        if (!obra) {
          setError('No se pudo cargar la obra seleccionada.');
          setForm(null);
          return;
        }
        setForm(obraToFormState(obra));
      } catch (err: unknown) {
        if (!activo) return;
        setError(err instanceof Error ? err.message : 'Error al cargar la obra');
        setForm(null);
      } finally {
        if (activo) setLoading(false);
      }
    })();
    return () => {
      activo = false;
    };
  }, [obraId]);

  useEffect(() => {
    (async () => {
      try {
        const res = await statsAPI.obtenerResumenDashboard();
        const porEstado = res?.data?.data?.estadisticas?.porEstado;
        if (Array.isArray(porEstado)) {
          setEstadosDisponibles(porEstado.map((e: { estado: string }) => e.estado));
        }
      } catch {
        setEstadosDisponibles([]);
      }
    })();
  }, []);

  useEffect(() => {
    if (!form) return;
    const term = form.contratista.responsable.trim();
    if (term.length < 2) {
      setResponsableSugerencias([]);
      setLoadingResponsable(false);
      return;
    }
    const timer = window.setTimeout(async () => {
      setLoadingResponsable(true);
      try {
        const resp = await uploadAPI.obtenerSugerenciasResponsable(term, 8);
        setResponsableSugerencias(resp.data.data || []);
      } catch {
        setResponsableSugerencias([]);
      } finally {
        setLoadingResponsable(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [form?.contratista.responsable]);

  const handleGuardar = async () => {
    if (!form || soloLectura) return;
    if (!form.obra.nombre?.trim() || !form.obra.estado?.trim()) {
      setMessage({ type: 'error', text: 'Los campos Nombre y Estado son obligatorios.' });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);
      const updates = formStateToObraUpdates(form);
      const obraActualizada = await obrasService.actualizarObra(obraId, updates);

      const contratistaUpdates = formStateToContratistaUpdates(form);
      const contratistaId = obraActualizada.contratista_id;
      if (contratistaUpdates && contratistaId) {
        await contratistasService.actualizar(contratistaId, contratistaUpdates);
      }

      const refreshed = await obrasService.obtenerObraPorIdObra(obraId);
      if (refreshed) setForm(obraToFormState(refreshed));
      setMessage({ type: 'success', text: 'Obra actualizada correctamente.' });
      onGuardado?.();
    } catch (err: unknown) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Error al guardar la obra',
      });
    } finally {
      setSaving(false);
    }
  };

  const titulo = form?.obra.nombre || obraNombre || 'Editar obra';

  return (
    <div className="flex flex-col min-h-0">
      <ModuloPageHeader
        icon={<Roofing />}
        title={titulo}
        description={`${TECHADO_MODULO.label} — edición de campos del programa`}
      >
        <button type="button" onClick={onVolver} className={BTN_SECONDARY}>
          <ArrowBack fontSize="small" className="mr-1.5" />
          Volver al listado
        </button>
      </ModuloPageHeader>

      <div className="px-4 sm:px-6 pb-6">
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-light border-t-primary" />
          </div>
        )}

        {error && !loading && (
          <div className={`${CA_ALERTA_ERROR} mb-4`}>
            <Info className="shrink-0" fontSize="small" />
            <span>{error}</span>
          </div>
        )}

        {form && !loading && (
          <div className="space-y-5">
            {message && (
              <div className={message.type === 'success' ? CA_ALERTA_OK : CA_ALERTA_ERROR}>
                {message.type === 'success' ? (
                  <CheckCircle className="shrink-0" fontSize="small" />
                ) : (
                  <Info className="shrink-0" fontSize="small" />
                )}
                <span>{message.text}</span>
              </div>
            )}

            <ObraFormulario
              form={form}
              onChange={setForm}
              estadosDisponibles={estadosDisponibles}
              responsableSugerencias={responsableSugerencias}
              loadingResponsableSugerencias={loadingResponsable}
              readOnly={soloLectura}
              areasIds={TECHADO_MODULO.areasFormulario}
            />

            {!soloLectura && (
              <div
                className={`${SEPRI_INSET} flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4`}
              >
                <div>
                  <p className="text-sm font-semibold text-stone-700">Guardar cambios</p>
                  <p className="text-xs text-stone-400 mt-0.5">
                    Revise las áreas del programa antes de actualizar.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleGuardar}
                  disabled={saving}
                  className={BTN_PRIMARY}
                >
                  <Save className="mr-2" fontSize="small" />
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TechadoObraEditor;
