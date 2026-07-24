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
  GT_VACIO,
  GT_BLOQUE_TITULO,
  SEPRI_FIELD_SHADOW,
  SEPRI_LIST_ITEM,
  SEPRI_LIST_ITEM_ACTIVE,
} from '../constants/gestionTecnicaDocumentoUi';
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM, BTN_DANGER } from '../constants/buttonStyles';
import GestionTecnicaComentariosPanel from './GestionTecnicaComentariosPanel';

const inputClass =
  `w-full px-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 transition-all duration-150 outline-none ${SEPRI_FIELD_SHADOW}`;
const labelClass = 'block text-xs font-medium text-stone-500 mb-1';

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

interface GestionTecnicaAdendasSectionProps {
  contratoId: string | null | undefined;
  contrato?: Pick<ContratoTechado, 'no_contrato' | 'lote'> | null;
  /** Documento técnico actual (para comentarios por adenda). */
  documentoId?: string | null;
  usuarioActual?: string;
  soloLectura?: boolean;
  onError?: (mensaje: string) => void;
  /** Integrado en «Montos y adendas». */
  variant?: 'standalone' | 'embedded';
  /** Campo extra del documento (p. ej. No. adendas solicituda), fuera del listado. */
  slotActualExtra?: React.ReactNode;
  onAdendasChange?: (adendas: Adenda[]) => void;
}

const GestionTecnicaAdendasSection: React.FC<GestionTecnicaAdendasSectionProps> = ({
  contratoId,
  contrato,
  documentoId = null,
  usuarioActual = '',
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
      numero_adenda: adenda.numero_adenda || '',
      tipo_adenda: adenda.tipo_adenda || '',
      monto: montoFormDesdeNumero(adenda.monto),
      estado: adenda.estado,
    });
    setEditandoId(adenda.id);
    setFormAbierto(true);
  };

  const handleGuardar = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!contratoId || soloLectura) return;

    if (!esCodigoAdendaValido(form.numero_adenda)) {
      onError?.('Número de adenda: use formato 1234-5678 (o déjelo vacío)');
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
          numero_adenda: normalizarCodigoAdenda(form.numero_adenda),
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
    if (!window.confirm(`¿Eliminar adenda ${adenda.numero_adenda || 'sin número'}?`)) return;
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

  const adendasOrdenadas = [...adendas].sort((a, b) => {
    if (a.estado !== b.estado) return a.estado === 'en_curso' ? -1 : 1;
    return (b.created_at || '').localeCompare(a.created_at || '');
  });

  const formularioAdenda = formAbierto && !soloLectura && (
    <div
      className="rounded-xl bg-warm-50/70 p-4 space-y-3 shadow-soft"
      onKeyDown={(e) => {
        // Evita que Enter envíe el <form> padre del documento.
        if (e.key === 'Enter') {
          e.preventDefault();
          e.stopPropagation();
          if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) {
            void handleGuardar(e);
          }
        }
      }}
    >
      <p className={GT_BLOQUE_TITULO}>{editandoId ? 'Editar adenda' : 'Nueva adenda'}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className={labelClass} htmlFor="adenda-numero">
            Número de adenda
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
      {editandoId ? (
        <GestionTecnicaComentariosPanel
          documentoId={documentoId}
          adendaId={editandoId}
          usuarioActual={usuarioActual}
          soloLectura={soloLectura}
          onError={onError}
          permitirPdf
          titulo="Comentarios de la adenda"
          descripcionVacio="No hay comentarios para esta adenda."
          mensajeSinDocumento="Guarde el documento primero para comentar esta adenda."
        />
      ) : null}
      <div className="flex flex-wrap gap-2 justify-end">
        <button type="button" onClick={resetForm} className={BTN_SECONDARY_SM} disabled={guardando}>
          <Close sx={{ fontSize: 16 }} />
          Cancelar
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void handleGuardar(e);
          }}
          className={BTN_PRIMARY_SM}
          disabled={guardando}
        >
          <Save sx={{ fontSize: 16 }} />
          {guardando ? 'Guardando…' : editandoId ? 'Actualizar' : 'Guardar'}
        </button>
      </div>
    </div>
  );

  const listadoCards =
    adendasOrdenadas.length === 0 ? (
      <div className={GT_VACIO}>No hay adendas registradas para este contrato.</div>
    ) : (
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 list-none m-0 p-0">
        {adendasOrdenadas.map((a) => {
          const activa = editandoId === a.id;
          return (
            <li key={a.id}>
              <div
                role={soloLectura ? undefined : 'button'}
                tabIndex={soloLectura ? undefined : 0}
                className={`${SEPRI_LIST_ITEM} ${activa ? SEPRI_LIST_ITEM_ACTIVE : ''} ${
                  soloLectura ? 'cursor-default hover:shadow-soft' : ''
                }`}
                onClick={() => {
                  if (!soloLectura) abrirEditar(a);
                }}
                onKeyDown={(e) => {
                  if (soloLectura) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    abrirEditar(a);
                  }
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-stone-800 tabular-nums">
                        {a.numero_adenda || 'Sin número'}
                      </span>
                      <span
                        className={`inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          a.estado === 'en_curso'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-stone-100 text-stone-600'
                        }`}
                      >
                        {ETIQUETAS_ESTADO_ADENDA[a.estado]}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 truncate">
                      {a.tipo_adenda || 'Sin tipo'}
                    </p>
                    <p className="text-sm font-medium text-stone-800 tabular-nums">
                      {formatMontoDOP(a.monto)}
                    </p>
                    {!soloLectura && (
                      <p className="text-[10px] text-stone-400 pt-0.5">Clic para editar</p>
                    )}
                  </div>
                  {!soloLectura && (
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
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    );

  const cabeceraContrato = (
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
        <button
          type="button"
          onClick={() => abrirNueva('en_curso')}
          className={BTN_PRIMARY_SM}
        >
          <Add sx={{ fontSize: 16 }} />
          Agregar adenda
        </button>
      )}
    </div>
  );

  if (!contratoId) {
    if (embedded) {
      return (
        <div className="space-y-3">
          {slotActualExtra}
          <p className="text-xs text-stone-500">
            Asigne un contrato al documento para registrar adendas del contrato.
          </p>
        </div>
      );
    }
    return (
      <div className={GT_VACIO}>
        Asigne un contrato al documento (en edición) para registrar adendas.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cabeceraContrato}
      {slotActualExtra ? <div className="max-w-xs">{slotActualExtra}</div> : null}

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary-light border-t-primary" />
        </div>
      ) : (
        listadoCards
      )}

      {formularioAdenda}
    </div>
  );
};

export default GestionTecnicaAdendasSection;
