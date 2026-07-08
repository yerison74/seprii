import React, { useEffect, useState } from 'react';
import { ArrowBack, Roofing, Save, OpenInNew, Link as LinkIcon, LinkOff } from '@mui/icons-material';
import ModuloPageHeader from './ui/ModuloPageHeader';
import ObraEdicionBuscador from './ObraEdicionBuscador';
import { techadoAPI, statsAPI } from '../services/api';
import { obrasService } from '../services/supabaseService';
import type {
  ContratoTechado,
  MatrizGeneralDetalle,
  MatrizGeneralTechado,
  ObraEdicionOpcion,
} from '../types/database';
import { idSigedeObra } from '../utils/obraSigede';
import { SEPRI_INSET, SEPRI_CARD } from '../constants/sepriSurfaces';
import { CA_LABEL, CA_FIELD, CA_BLOQUE_TITULO } from '../constants/cargaArchivosUi';
import { BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER } from '../constants/buttonStyles';

interface TechadoMatrizEditorProps {
  matrizId: string;
  soloLectura?: boolean;
  onVolver: () => void;
  onAbrirObra?: (obraId: string, nombre?: string) => void;
  onGuardado?: () => void;
}

const Field: React.FC<{
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
  readOnly?: boolean;
  type?: string;
  colSpan?: boolean;
}> = ({ label, value, onChange, readOnly, type = 'text', colSpan }) => (
  <div className={colSpan ? 'md:col-span-2' : ''}>
    <label className={CA_LABEL}>{label}</label>
    <input
      type={type}
      value={value ?? ''}
      readOnly={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      className={CA_FIELD}
    />
  </div>
);

const TextArea: React.FC<{
  label: string;
  value: string;
  onChange?: (v: string) => void;
  readOnly?: boolean;
}> = ({ label, value, onChange, readOnly }) => (
  <div className="md:col-span-2">
    <label className={CA_LABEL}>{label}</label>
    <textarea
      value={value ?? ''}
      readOnly={readOnly}
      rows={3}
      onChange={(e) => onChange?.(e.target.value)}
      className={`${CA_FIELD} resize-y min-h-[80px]`}
    />
  </div>
);

const SelectField: React.FC<{
  label: string;
  value: string;
  options: string[];
  onChange?: (v: string) => void;
  readOnly?: boolean;
}> = ({ label, value, options, onChange, readOnly }) => (
  <div>
    <label className={CA_LABEL}>{label}</label>
    <select
      value={value ?? ''}
      disabled={readOnly}
      onChange={(e) => onChange?.(e.target.value)}
      className={CA_FIELD}
    >
      <option value="">Seleccione un estado</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
      {value && !options.includes(value) && (
        <option value={value}>{value}</option>
      )}
    </select>
  </div>
);

const TechadoMatrizEditor: React.FC<TechadoMatrizEditorProps> = ({
  matrizId,
  soloLectura = false,
  onVolver,
  onAbrirObra,
  onGuardado,
}) => {
  const [detalle, setDetalle] = useState<MatrizGeneralDetalle | null>(null);
  const [matriz, setMatriz] = useState<MatrizGeneralTechado | null>(null);
  const [contrato, setContrato] = useState<ContratoTechado | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busquedaSigede, setBusquedaSigede] = useState('');
  const [vinculandoObra, setVinculandoObra] = useState(false);
  const [estadosDisponibles, setEstadosDisponibles] = useState<string[]>([]);

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
    (async () => {
      try {
        setLoading(true);
        const res = await techadoAPI.obtenerDetalle(matrizId);
        const d = res.data.data;
        setDetalle(d);
        setMatriz(d.matriz);
        setContrato(d.contrato);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al cargar registro');
      } finally {
        setLoading(false);
      }
    })();
  }, [matrizId]);

  const setM = (patch: Partial<MatrizGeneralTechado>) =>
    setMatriz((prev) => (prev ? { ...prev, ...patch } : prev));
  const setC = (patch: Partial<ContratoTechado>) =>
    setContrato((prev) => (prev ? { ...prev, ...patch } : prev));

  const handleGuardar = async () => {
    if (!matriz || !contrato || soloLectura) return;
    try {
      setSaving(true);
      setMessage(null);
      const { obra_id, ...restoMatriz } = matriz;
      await techadoAPI.actualizarMatriz(matriz.id, { ...restoMatriz, obra_id: obra_id ?? null });
      await techadoAPI.actualizarContrato(contrato.id, contrato);
      setMessage('Cambios guardados correctamente.');
      onGuardado?.();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const aplicarObraVinculada = async (opcion: ObraEdicionOpcion) => {
    setVinculandoObra(true);
    try {
      const obra = await obrasService.obtenerObraPorIdObra(opcion.id);
      const estatusObra = obra?.estado?.trim() || '';
      setM({ obra_id: opcion.id, ...(estatusObra ? { estatus: estatusObra } : {}) });
      setBusquedaSigede('');
      setDetalle((prev) => (prev ? { ...prev, obra: obra ?? null } : prev));
    } catch {
      setM({ obra_id: opcion.id });
      setBusquedaSigede('');
      setDetalle((prev) =>
        prev
          ? {
              ...prev,
              obra: {
                id: opcion.id,
                nombre: opcion.nombre,
                codigo: opcion.codigo ?? opcion.sigede,
                distrito_minerd_sigede: opcion.distrito_minerd_sigede,
                estado: '',
              },
            }
          : prev,
      );
    } finally {
      setVinculandoObra(false);
    }
    setMessage('Obra SIGEDE seleccionada. Pulse «Guardar cambios» para confirmar la vinculación.');
  };

  const handleDesvincularObra = () => {
    setM({ obra_id: null });
    setDetalle((prev) => (prev ? { ...prev, obra: null } : prev));
    setBusquedaSigede('');
    setMessage('Vinculación removida. Pulse «Guardar cambios» para aplicar.');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary-light border-t-primary" />
      </div>
    );
  }

  if (error || !matriz || !contrato) {
    return (
      <div className="p-6">
        <p className="text-red-600">{error || 'Registro no encontrado'}</p>
        <button type="button" onClick={onVolver} className={`${BTN_SECONDARY} mt-4`}>Volver</button>
      </div>
    );
  }

  const ro = soloLectura;
  const obraVinculada = detalle?.obra;
  const idSigede = obraVinculada ? idSigedeObra(obraVinculada) : null;
  const distritoRegional =
    matriz.reg_dist ||
    obraVinculada?.distrito_minerd_sigede ||
    null;

  return (
    <div className="flex flex-col min-h-0">
      <ModuloPageHeader
        icon={<Roofing />}
        title={matriz.plantel}
        description={`Lote ${matriz.lote} · Contrato ${contrato.no_contrato} · REG-DIST ${matriz.reg_dist || '—'}`}
      >
        <button type="button" onClick={onVolver} className={BTN_SECONDARY}>
          <ArrowBack fontSize="small" className="mr-1" /> Volver
        </button>
        {matriz.obra_id && onAbrirObra && (
          <button
            type="button"
            onClick={() => onAbrirObra(matriz.obra_id!, detalle?.obra?.nombre || matriz.plantel)}
            className={BTN_SECONDARY}
          >
            <OpenInNew fontSize="small" className="mr-1" /> Editar obra SIGEDE
          </button>
        )}
        {!matriz.obra_id && (
          <span className={`${SEPRI_INSET} text-xs text-amber-700 px-3 py-2`}>
            Sin obra vinculada en catálogo obras
          </span>
        )}
      </ModuloPageHeader>

      <div className="px-4 sm:px-6 pb-8 space-y-4">
        {matriz.obra_id && obraVinculada && (
          <div className={`${SEPRI_INSET} px-4 py-3 text-sm flex flex-wrap items-center gap-x-2 gap-y-1 text-green-800`}>
            <LinkIcon fontSize="small" className="shrink-0" />
            <span>
              Vinculado a obra <strong>{obraVinculada.nombre}</strong>
            </span>
            {idSigede && (
              <span className="text-stone-600">
                · ID SIGEDE <span className="font-mono font-semibold">{idSigede}</span>
              </span>
            )}
            {distritoRegional && (
              <span className="text-stone-500">
                · Distrito regional <span className="font-mono">{distritoRegional}</span>
              </span>
            )}
          </div>
        )}

        {!ro && (
          <section className={`p-4 sm:p-5 ${SEPRI_CARD}`}>
            <h3 className={`${CA_BLOQUE_TITULO} mb-1`}>Vinculación con obra SIGEDE</h3>
            <p className="text-xs text-stone-500 mb-4">
              Si la carga automática no encontró la obra, o debe cambiarse, busque por ID SIGEDE y
              seleccione el plantel correcto del catálogo.
            </p>

            {matriz.obra_id && obraVinculada && (
              <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <div className={CA_LABEL}>ID SIGEDE actual</div>
                  <div className="font-mono font-semibold text-primary">{idSigede || '—'}</div>
                </div>
                <div>
                  <div className={CA_LABEL}>Distrito regional (REG-DIST)</div>
                  <div className="font-mono text-stone-700">{distritoRegional || '—'}</div>
                </div>
              </div>
            )}

            <ObraEdicionBuscador
              busqueda={busquedaSigede}
              onBusquedaChange={setBusquedaSigede}
              onSeleccionar={aplicarObraVinculada}
              onBuscar={() => undefined}
              loading={vinculandoObra}
              disabled={ro}
              label={matriz.obra_id ? 'Cambiar obra SIGEDE' : 'Buscar ID SIGEDE'}
              placeholder="ID SIGEDE, contrato, plantel, provincia o municipio…"
              helpText="Escriba al menos un carácter para ver sugerencias. El ID SIGEDE es el código del plantel, no el distrito regional."
            />

            {matriz.obra_id && (
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={handleDesvincularObra} className={`${BTN_DANGER} text-sm`}>
                  <LinkOff fontSize="small" className="mr-1" /> Desvincular obra
                </button>
              </div>
            )}
          </section>
        )}

        {message && (
          <div className={`${SEPRI_INSET} px-4 py-2 text-sm ${message.includes('Error') ? 'text-red-700' : 'text-green-700'}`}>
            {message}
          </div>
        )}

        <section className={`p-4 sm:p-5 ${SEPRI_CARD}`}>
          <h3 className={`${CA_BLOQUE_TITULO} mb-4`}>Plantel y ubicación</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Plantel" value={matriz.plantel} onChange={(v) => setM({ plantel: v })} readOnly={ro} colSpan />
            <Field label="Provincia" value={matriz.provincia || ''} onChange={(v) => setM({ provincia: v })} readOnly={ro} />
            <Field label="Municipio" value={matriz.municipio || ''} onChange={(v) => setM({ municipio: v })} readOnly={ro} />
            <Field label="REG-DIST (distrito regional)" value={matriz.reg_dist || ''} onChange={(v) => setM({ reg_dist: v })} readOnly={ro} />
            <SelectField
              label="Estado (obra vinculada)"
              value={matriz.estatus || ''}
              options={estadosDisponibles}
              onChange={(v) => setM({ estatus: v })}
              readOnly={ro}
            />
            <Field label="% Ejecución" value={matriz.porcentaje_ejecucion ?? ''} type="number" onChange={(v) => setM({ porcentaje_ejecucion: v ? Number(v) : null })} readOnly={ro} />
            <TextArea label="Ejecución actual" value={matriz.ejecucion_actual || ''} onChange={(v) => setM({ ejecucion_actual: v })} readOnly={ro} />
            <TextArea label="Observaciones" value={matriz.observaciones || ''} onChange={(v) => setM({ observaciones: v })} readOnly={ro} />
          </div>
        </section>

        <section className={`p-4 sm:p-5 ${SEPRI_CARD}`}>
          <h3 className={`${CA_BLOQUE_TITULO} mb-4`}>Contrato y presupuesto</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="No. contrato" value={contrato.no_contrato} readOnly />
            <Field label="Contratista" value={contrato.contratista_nombre || ''} onChange={(v) => setC({ contratista_nombre: v })} readOnly={ro} colSpan />
            <Field label="Presupuesto centro" value={contrato.presupuesto_centro ?? ''} type="number" onChange={(v) => setC({ presupuesto_centro: v ? Number(v) : null })} readOnly={ro} />
            <Field label="Monto total contrato" value={contrato.monto_total_contrato ?? ''} type="number" onChange={(v) => setC({ monto_total_contrato: v ? Number(v) : null })} readOnly={ro} />
            <Field label="Monto total inversión" value={contrato.monto_total_inversion ?? ''} type="number" onChange={(v) => setC({ monto_total_inversion: v ? Number(v) : null })} readOnly={ro} />
            <Field label="Avance 20%" value={contrato.avance_20_porciento ?? ''} type="number" onChange={(v) => setC({ avance_20_porciento: v ? Number(v) : null })} readOnly={ro} />
            <Field label="Estatus contrato" value={contrato.estatus_contrato || ''} onChange={(v) => setC({ estatus_contrato: v })} readOnly={ro} />
            <Field label="Certificación" value={contrato.certificacion || ''} onChange={(v) => setC({ certificacion: v })} readOnly={ro} colSpan />
            <TextArea label="Observaciones contrato" value={contrato.observaciones || ''} onChange={(v) => setC({ observaciones: v })} readOnly={ro} />
          </div>
        </section>

        <section className={`p-4 sm:p-5 ${SEPRI_CARD}`}>
          <h3 className={`${CA_BLOQUE_TITULO} mb-4`}>Cubicación y pagos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Monto contratado centro" value={matriz.monto_contratado_centro ?? ''} type="number" onChange={(v) => setM({ monto_contratado_centro: v ? Number(v) : null })} readOnly={ro} />
            <Field label="Monto cubicado centro" value={matriz.monto_cubicado_centro ?? ''} type="number" onChange={(v) => setM({ monto_cubicado_centro: v ? Number(v) : null })} readOnly={ro} />
            <Field label="% cubicado centro" value={matriz.porcentaje_cubicado_centro ?? ''} type="number" onChange={(v) => setM({ porcentaje_cubicado_centro: v ? Number(v) : null })} readOnly={ro} />
            <Field label="Monto total pagado" value={matriz.monto_total_pagado ?? ''} type="number" onChange={(v) => setM({ monto_total_pagado: v ? Number(v) : null })} readOnly={ro} />
            <Field label="# última cubicación" value={matriz.numero_ultima_cubicacion || ''} onChange={(v) => setM({ numero_ultima_cubicacion: v })} readOnly={ro} />
            <Field label="Monto última cubicación" value={matriz.monto_ultima_cubicacion ?? ''} type="number" onChange={(v) => setM({ monto_ultima_cubicacion: v ? Number(v) : null })} readOnly={ro} />
          </div>
        </section>

        <section className={`p-4 sm:p-5 ${SEPRI_CARD}`}>
          <h3 className={`${CA_BLOQUE_TITULO} mb-4`}>Diseño y movimiento de tierra</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Movimiento de tierra" value={matriz.movimiento_tierra || ''} onChange={(v) => setM({ movimiento_tierra: v })} readOnly={ro} />
            <Field label="As built" value={matriz.as_built || ''} onChange={(v) => setM({ as_built: v })} readOnly={ro} />
            <Field label="Diseño arquitectónico" value={matriz.diseno_arquitectonico || ''} onChange={(v) => setM({ diseno_arquitectonico: v })} readOnly={ro} />
            <Field label="Diseño estructural" value={matriz.diseno_estructural || ''} onChange={(v) => setM({ diseno_estructural: v })} readOnly={ro} />
            <TextArea label="Obs. movimiento de tierra" value={matriz.obs_movimiento_tierra || ''} onChange={(v) => setM({ obs_movimiento_tierra: v })} readOnly={ro} />
            <TextArea label="Obs. diseño" value={matriz.obs_diseno || ''} onChange={(v) => setM({ obs_diseno: v })} readOnly={ro} />
          </div>
        </section>

        {!ro && (
          <div className={`${SEPRI_INSET} flex justify-end p-4`}>
            <button type="button" onClick={handleGuardar} disabled={saving} className={BTN_PRIMARY}>
              <Save className="mr-2" fontSize="small" />
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechadoMatrizEditor;
