import React, { useCallback, useEffect, useState } from 'react';
import { Add, Delete, Save, Close } from '@mui/icons-material';
import { gestionTecnicaDocumentoAPI } from '../services/api';
import type { Adenda, ContratoTechado, EstadoAdenda } from '../types/database';
import {
  TIPOS_ADENDA,
  ETIQUETAS_ESTADO_ADENDA,
  ESTADOS_ADENDA,
  formatMontoDOP,
  parseMontoDOP,
  montoFormDesdeNumero,
  esMontoValido,
  esCodigoAdendaValido,
  normalizarCodigoAdenda,
} from '../constants/gestionTecnicaDocumento';
import {
  GT_TABLA,
  GT_TABLA_HEAD,
  GT_TABLA_TH,
  GT_TABLA_TD,
  GT_VACIO,
  GT_BLOQUE_TITULO,
  GT_SUB_BLOQUE,
  SEPRI_FIELD_SHADOW,
} from '../constants/gestionTecnicaDocumentoUi';
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM, BTN_DANGER } from '../constants/buttonStyles';

const inputClass =
  `w-full px-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 transition-all duration-150 outline-none ${SEPRI_FIELD_SHADOW}`;
const labelClass = 'block text-xs font-medium text-stone-500 mb-1';
const valorLecturaClass =
  `w-full px-3 py-2.5 rounded-xl text-sm text-stone-700 bg-white/90 border-0 ${SEPRI_FIELD_SHADOW}`;

const EMPTY_FORM = {
  numero_adenda: '',
  tipo_adenda: '',
  monto: '',
  estado: 'en_curso' as EstadoAdenda,
};

export function camposDocumentoDesdeAdendas(adendas: Adenda[]) {
  const pick = (estado: EstadoAdenda) =>
    adendas
      .filter((a) => a.estado === estado)
      .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];

  const anterior = pick('anterior');
  const actual = pick('en_curso');

  return {
    tipo_adenda_anterior: anterior?.tipo_adenda || '',
    numero_adenda_anterior: anterior?.numero_adenda || '',
    monto_adenda_anterior: montoFormDesdeNumero(anterior?.monto),
    tipo_adenda: actual?.tipo_adenda || '',
    numero_adenda_actual: actual?.numero_adenda || '',
    monto_adenda_solicitada: montoFormDesdeNumero(actual?.monto),
  };
}

function CampoAdendaLectura({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="space-y-1">
      <span className={labelClass}>{label}</span>
      <div className={`${valorLecturaClass} ${mono ? 'font-mono tabular-nums' : ''}`}>
        {value || '—'}
      </div>
    </div>
  );
}

interface GestionTecnicaAdendasSectionProps {
  contratoId: string | null | undefined;
  contrato?: Pick<ContratoTechado, 'no_contrato' | 'lote'> | null;
  soloLectura?: boolean;
  onError?: (mensaje: string) => void;
  /** Integrado en «Montos y adendas» — sub-bloques anterior/actual + botón agregar. */
  variant?: 'standalone' | 'embedded';
  /** Campos extra en el sub-bloque «Adenda actual» (p. ej. No. adendas solicituda). */
  slotActualExtra?: React.ReactNode;
  onAdendasChange?: (adendas: Adenda[]) => void;
}

const GestionTecnicaAdendasSection: React.FC<GestionTecnicaAdendasSectionProps> = ({
  contratoId,
  contrato,
  soloLectura = false,
  onError,
  variant = 'standalone',
  slotActualExtra,
  onAdendasChange,
}) => {
  const embedded = variant === 'embedded';
  const [adendas, setAdendas] = useState<Adenda[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const notificarCambio = useCallback(
    (lista: Adenda[]) => {
      onAdendasChange?.(lista);
    },
    [onAdendasChange],
  );

  const cargar = useCallback(async () => {
    if (!contratoId) {
      setAdendas([]);
      notificarCambio([]);
      return;
    }
    try {
      setLoading(true);
      const resp = await gestionTecnicaDocumentoAPI.listarAdendasContrato(contratoId);
      const lista = resp.data.data || [];
      setAdendas(lista);
      notificarCambio(lista);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Error al cargar adendas';
      onError?.(msg);
      setAdendas([]);
      notificarCambio([]);
    } finally {
      setLoading(false);
    }
  }, [contratoId, notificarCambio, onError]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditandoId(null);
    setFormAbierto(false);
  };

  const abrirNueva = (estadoInicial: EstadoAdenda = 'en_curso') => {
    setForm({ ...EMPTY_FORM, estado: estadoInicial });
    setEditandoId(null);
    setFormAbierto(true);
  };

  const abrirEditar = (adenda: Adenda) => {
    setForm({
      numero_adenda: adenda.numero_adenda,
      tipo_adenda: adenda.tipo_adenda || '',
      monto: montoFormDesdeNumero(adenda.monto),
      estado: adenda.estado,
    });
    setEditandoId(adenda.id);
    setFormAbierto(true);
  };

  const handleGuardar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contratoId || soloLectura) return;

    if (!form.numero_adenda.trim()) {
      onError?.('Indique el número de adenda');
      return;
    }
    if (!esCodigoAdendaValido(form.numero_adenda)) {
      onError?.('Número de adenda: use formato 1234-5678');
      return;
    }
    if (!esMontoValido(form.monto)) {
      onError?.('Monto de adenda inválido');
      return;
    }

    try {
      setGuardando(true);
      await gestionTecnicaDocumentoAPI.guardarAdenda(
        {
          contrato_id: contratoId,
          numero_adenda: normalizarCodigoAdenda(form.numero_adenda) || form.numero_adenda.trim(),
          tipo_adenda: form.tipo_adenda || null,
          monto: parseMontoDOP(form.monto),
          estado: form.estado,
        },
        editandoId || undefined,
      );
      resetForm();
      await cargar();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No se pudo guardar la adenda';
      onError?.(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (adenda: Adenda) => {
    if (soloLectura) return;
    if (!window.confirm(`¿Eliminar adenda ${adenda.numero_adenda}?`)) return;
    try {
      await gestionTecnicaDocumentoAPI.eliminarAdenda(adenda.id);
      if (editandoId === adenda.id) resetForm();
      await cargar();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No se pudo eliminar la adenda';
      onError?.(msg);
    }
  };

  const adendaAnterior = adendas
    .filter((a) => a.estado === 'anterior')
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];
  const adendaActual = adendas
    .filter((a) => a.estado === 'en_curso')
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0];

  const formularioAdenda = formAbierto && !soloLectura && (
    <form onSubmit={handleGuardar} className="rounded-xl bg-warm-50/70 p-4 space-y-3 shadow-soft">
      <p className={GT_BLOQUE_TITULO}>{editandoId ? 'Editar adenda' : 'Nueva adenda'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className={labelClass} htmlFor="adenda-numero">
            Número de adenda *
          </label>
          <input
            id="adenda-numero"
            type="text"
            value={form.numero_adenda}
            onChange={(e) => setForm((p) => ({ ...p, numero_adenda: e.target.value }))}
            className={inputClass}
            placeholder="1234-5678"
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="adenda-tipo">
            Tipo de adenda
          </label>
          <select
            id="adenda-tipo"
            value={form.tipo_adenda}
            onChange={(e) => setForm((p) => ({ ...p, tipo_adenda: e.target.value }))}
            className={inputClass}
          >
            <option value="">Seleccione…</option>
            {TIPOS_ADENDA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="adenda-monto">
            Monto (DOP)
          </label>
          <input
            id="adenda-monto"
            type="text"
            inputMode="decimal"
            value={form.monto}
            onChange={(e) => setForm((p) => ({ ...p, monto: e.target.value }))}
            className={inputClass}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-1">
          <label className={labelClass} htmlFor="adenda-estado">
            Estado *
          </label>
          <select
            id="adenda-estado"
            value={form.estado}
            onChange={(e) => setForm((p) => ({ ...p, estado: e.target.value as EstadoAdenda }))}
            className={inputClass}
            disabled={!!editandoId}
          >
            {ESTADOS_ADENDA.map((est) => (
              <option key={est} value={est}>
                {ETIQUETAS_ESTADO_ADENDA[est]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={resetForm} className={BTN_SECONDARY_SM} disabled={guardando}>
          <Close sx={{ fontSize: 16 }} />
          Cancelar
        </button>
        <button type="submit" className={BTN_PRIMARY_SM} disabled={guardando}>
          <Save sx={{ fontSize: 16 }} />
          {guardando ? 'Guardando…' : editandoId ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </form>
  );

  const subBloqueAnterior = (
    <div className={GT_SUB_BLOQUE}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={GT_BLOQUE_TITULO}>Adenda anterior</p>
        {!soloLectura && adendaAnterior && (
          <button
            type="button"
            onClick={() => abrirEditar(adendaAnterior)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Editar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CampoAdendaLectura label="Tipo adenda anterior" value={adendaAnterior?.tipo_adenda || ''} />
        <CampoAdendaLectura
          label="Código adenda anterior"
          value={adendaAnterior?.numero_adenda || ''}
          mono
        />
        <CampoAdendaLectura
          label="Monto adenda anterior"
          value={adendaAnterior ? formatMontoDOP(adendaAnterior.monto) : ''}
        />
      </div>
    </div>
  );

  const subBloqueActual = (
    <div className={GT_SUB_BLOQUE}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={GT_BLOQUE_TITULO}>Adenda actual (solicitud)</p>
        {!soloLectura && adendaActual && (
          <button
            type="button"
            onClick={() => abrirEditar(adendaActual)}
            className="text-[11px] font-medium text-primary hover:underline"
          >
            Editar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <CampoAdendaLectura label="Tipo adenda" value={adendaActual?.tipo_adenda || ''} />
        <CampoAdendaLectura
          label="Código adenda actual"
          value={adendaActual?.numero_adenda || ''}
          mono
        />
        {slotActualExtra}
        <CampoAdendaLectura
          label="Monto adenda solicitada"
          value={adendaActual ? formatMontoDOP(adendaActual.monto) : ''}
        />
      </div>
    </div>
  );

  if (!contratoId) {
    if (embedded) {
      return (
        <div className={`${GT_SUB_BLOQUE} text-xs text-stone-500`}>
          Asigne un contrato al documento para registrar adendas del contrato.
        </div>
      );
    }
    return (
      <div className={GT_VACIO}>
        Asigne un contrato al documento (en edición) para registrar adendas.
      </div>
    );
  }

  if (embedded) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stone-500">
            Contrato{' '}
            <span className="font-mono font-medium text-stone-700">
              {contrato?.no_contrato || '—'}
            </span>
            {contrato?.lote != null && (
              <span className="text-stone-400"> · Lote {contrato.lote}</span>
            )}
          </p>
          {!soloLectura && !formAbierto && (
            <button type="button" onClick={() => abrirNueva('en_curso')} className={BTN_PRIMARY_SM}>
              <Add sx={{ fontSize: 16 }} />
              Agregar adenda
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary-light border-t-primary" />
          </div>
        ) : (
          <>
            {subBloqueAnterior}
            {subBloqueActual}
          </>
        )}

        {formularioAdenda}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-stone-500">
          Contrato{' '}
          <span className="font-mono font-medium text-stone-700">
            {contrato?.no_contrato || '—'}
          </span>
          {contrato?.lote != null && (
            <span className="text-stone-400"> · Lote {contrato.lote}</span>
          )}
        </p>
        {!soloLectura && !formAbierto && (
          <button type="button" onClick={() => abrirNueva()} className={BTN_PRIMARY_SM}>
            <Add sx={{ fontSize: 16 }} />
            Agregar adenda
          </button>
        )}
      </div>

      {formularioAdenda}

      {loading ? (
        <div className="flex justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-light border-t-primary" />
        </div>
      ) : adendas.length === 0 ? (
        <div className={GT_VACIO}>No hay adendas registradas para este contrato.</div>
      ) : (
        <div className="overflow-x-auto rounded-xl shadow-soft">
          <table className={GT_TABLA}>
            <thead className={GT_TABLA_HEAD}>
              <tr>
                <th className={GT_TABLA_TH}>Número</th>
                <th className={GT_TABLA_TH}>Tipo</th>
                <th className={GT_TABLA_TH}>Monto</th>
                <th className={GT_TABLA_TH}>Estado</th>
                {!soloLectura && <th className={`${GT_TABLA_TH} w-28`}>Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {adendas.map((a) => (
                <tr
                  key={a.id}
                  className={!soloLectura ? 'cursor-pointer hover:bg-warm-50/60' : undefined}
                  onClick={() => !soloLectura && abrirEditar(a)}
                >
                  <td className={`${GT_TABLA_TD} font-mono tabular-nums`}>{a.numero_adenda}</td>
                  <td className={GT_TABLA_TD}>{a.tipo_adenda || '—'}</td>
                  <td className={`${GT_TABLA_TD} tabular-nums`}>{formatMontoDOP(a.monto)}</td>
                  <td className={GT_TABLA_TD}>
                    <span
                      className={`inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        a.estado === 'en_curso'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-stone-100 text-stone-600'
                      }`}
                    >
                      {ETIQUETAS_ESTADO_ADENDA[a.estado]}
                    </span>
                  </td>
                  {!soloLectura && (
                    <td className={GT_TABLA_TD}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEliminar(a);
                        }}
                        className={BTN_DANGER}
                        title="Eliminar adenda"
                      >
                        <Delete sx={{ fontSize: 16 }} />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GestionTecnicaAdendasSection;
