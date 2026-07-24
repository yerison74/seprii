import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Add, AttachFile, Delete, PictureAsPdf, Save, Close } from '@mui/icons-material';
import { gestionTecnicaDocumentoAPI } from '../services/api';
import type { DocumentoTecnicoComentario } from '../types/database';
import {
  GT_VACIO,
  GT_BLOQUE_TITULO,
  SEPRI_FIELD_SHADOW,
  SEPRI_LIST_ITEM,
} from '../constants/gestionTecnicaDocumentoUi';
import { BTN_PRIMARY_SM, BTN_SECONDARY_SM, BTN_DANGER, BTN_GHOST } from '../constants/buttonStyles';

const inputClass =
  `w-full px-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 transition-all duration-150 outline-none ${SEPRI_FIELD_SHADOW}`;
const labelClass = 'block text-xs font-medium text-stone-500 mb-1';

function formatearFechaHora(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-DO', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

interface GestionTecnicaComentariosPanelProps {
  documentoId: string | null | undefined;
  /** Si se indica, lista/crea comentarios de esa adenda; si no, del documento. */
  adendaId?: string | null;
  usuarioActual: string;
  soloLectura?: boolean;
  onError?: (mensaje: string) => void;
  /** Permite adjuntar PDF (documento: sí; adenda: opcional según uso). */
  permitirPdf?: boolean;
  titulo?: string;
  descripcionVacio?: string;
  mensajeSinDocumento?: string;
}

const GestionTecnicaComentariosPanel: React.FC<GestionTecnicaComentariosPanelProps> = ({
  documentoId,
  adendaId = null,
  usuarioActual,
  soloLectura = false,
  onError,
  permitirPdf = true,
  titulo = 'Comentarios y evidencia',
  descripcionVacio = 'Aún no hay comentarios registrados.',
  mensajeSinDocumento = 'Guarde el documento primero para registrar comentarios.',
}) => {
  const [items, setItems] = useState<DocumentoTecnicoComentario[]>([]);
  const [loading, setLoading] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [formAbierto, setFormAbierto] = useState(false);
  const [texto, setTexto] = useState('');
  const [archivo, setArchivo] = useState<File | null>(null);
  const inputFileRef = useRef<HTMLInputElement>(null);

  const cargar = useCallback(async () => {
    if (!documentoId) {
      setItems([]);
      return;
    }
    try {
      setLoading(true);
      const resp = await gestionTecnicaDocumentoAPI.listarComentariosDocumento(documentoId, {
        adendaId: adendaId || undefined,
        soloDocumento: !adendaId,
      });
      setItems(resp.data.data || []);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'Error al cargar comentarios';
      onError?.(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [documentoId, adendaId, onError]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const resetForm = () => {
    setTexto('');
    setArchivo(null);
    setFormAbierto(false);
    if (inputFileRef.current) inputFileRef.current.value = '';
  };

  const handleGuardar = async () => {
    if (!documentoId || soloLectura) return;
    if (!texto.trim()) {
      onError?.('Escriba el comentario');
      return;
    }
    if (!usuarioActual.trim()) {
      onError?.('No se pudo identificar el usuario de la sesión');
      return;
    }
    try {
      setGuardando(true);
      await gestionTecnicaDocumentoAPI.crearComentarioDocumento({
        documento_id: documentoId,
        adenda_id: adendaId || null,
        comentario: texto.trim(),
        usuario: usuarioActual.trim(),
        archivo: permitirPdf ? archivo : null,
      });
      resetForm();
      await cargar();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No se pudo registrar el comentario';
      onError?.(msg);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (item: DocumentoTecnicoComentario) => {
    if (soloLectura) return;
    if (!window.confirm('¿Eliminar este comentario?')) return;
    try {
      await gestionTecnicaDocumentoAPI.eliminarComentarioDocumento(item.id);
      await cargar();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        'No se pudo eliminar el comentario';
      onError?.(msg);
    }
  };

  if (!documentoId) {
    return (
      <div className="space-y-2">
        <p className={GT_BLOQUE_TITULO}>{titulo}</p>
        <p className="text-xs text-stone-500">{mensajeSinDocumento}</p>
      </div>
    );
  }

  return (
    <div
      className="space-y-3"
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target instanceof HTMLTextAreaElement === false) {
          e.preventDefault();
          e.stopPropagation();
        }
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className={GT_BLOQUE_TITULO}>{titulo}</p>
        {!soloLectura && !formAbierto && (
          <button
            type="button"
            className={BTN_PRIMARY_SM}
            onClick={() => setFormAbierto(true)}
          >
            <Add sx={{ fontSize: 16 }} />
            Agregar comentario
          </button>
        )}
      </div>

      {formAbierto && !soloLectura && (
        <div className="rounded-xl bg-warm-50/70 p-4 space-y-3 shadow-soft">
          <div className="space-y-1">
            <label className={labelClass} htmlFor={`gt-comentario-${adendaId || 'doc'}`}>
              Comentario *
            </label>
            <textarea
              id={`gt-comentario-${adendaId || 'doc'}`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              className={`${inputClass} min-h-[72px] resize-y`}
              rows={3}
              placeholder="Escriba el comentario…"
            />
          </div>
          <p className="text-[11px] text-stone-400">
            Se registrará como <span className="font-medium text-stone-600">{usuarioActual || '—'}</span>
          </p>
          {permitirPdf && (
            <div className="space-y-1">
              <label className={labelClass}>PDF adjunto (opcional)</label>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={inputFileRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    if (f && f.type && f.type !== 'application/pdf') {
                      onError?.('Solo se permiten archivos PDF');
                      e.target.value = '';
                      setArchivo(null);
                      return;
                    }
                    setArchivo(f);
                  }}
                />
                <button
                  type="button"
                  className={BTN_SECONDARY_SM}
                  onClick={() => inputFileRef.current?.click()}
                >
                  <AttachFile sx={{ fontSize: 16 }} />
                  {archivo ? 'Cambiar PDF' : 'Adjuntar PDF'}
                </button>
                {archivo && (
                  <span className="text-xs text-stone-600 truncate max-w-[14rem]">{archivo.name}</span>
                )}
                {archivo && (
                  <button
                    type="button"
                    className={BTN_GHOST}
                    onClick={() => {
                      setArchivo(null);
                      if (inputFileRef.current) inputFileRef.current.value = '';
                    }}
                  >
                    Quitar
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" className={BTN_SECONDARY_SM} onClick={resetForm} disabled={guardando}>
              <Close sx={{ fontSize: 16 }} />
              Cancelar
            </button>
            <button
              type="button"
              className={BTN_PRIMARY_SM}
              disabled={guardando}
              onClick={() => void handleGuardar()}
            >
              <Save sx={{ fontSize: 16 }} />
              {guardando ? 'Guardando…' : 'Registrar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-7 w-7 border-2 border-primary-light border-t-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className={GT_VACIO}>{descripcionVacio}</div>
      ) : (
        <ul className="space-y-2 list-none m-0 p-0">
          {items.map((c) => (
            <li key={c.id} className={SEPRI_LIST_ITEM}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1.5">
                  <p className="text-sm text-stone-700 whitespace-pre-wrap break-words">{c.comentario}</p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-400">
                    <span className="font-medium text-stone-600">{c.usuario}</span>
                    <span>{formatearFechaHora(c.created_at)}</span>
                  </div>
                  {c.archivo_pdf && (
                    <a
                      href={c.archivo_pdf}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <PictureAsPdf sx={{ fontSize: 14 }} />
                      {c.nombre_archivo || 'Ver PDF'}
                    </a>
                  )}
                </div>
                {!soloLectura && (
                  <button
                    type="button"
                    className={BTN_DANGER}
                    title="Eliminar comentario"
                    onClick={() => void handleEliminar(c)}
                  >
                    <Delete sx={{ fontSize: 16 }} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default GestionTecnicaComentariosPanel;
