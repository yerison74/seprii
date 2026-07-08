import React, { useEffect, useState } from 'react';
import { Close, Description, FollowTheSigns, Info } from '@mui/icons-material';
import { mantenimientosAPI, Obra } from '../services/api';
import type { ObraRelacionesSigede } from '../types/database';
import { sigedesDeObra } from '../utils/obraSigede';
import { getEstadoLabel } from '../utils/estadoTramite';
import { BTN_PRIMARY, BTN_SECONDARY } from '../constants/buttonStyles';
import ObraTechadoResumenSection from './ObraTechadoResumenSection';

interface ObraMasDetallesDialogProps {
  open: boolean;
  onClose: () => void;
  obra: Obra | null;
}

function CampoDetalle({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div>
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="text-sm font-medium text-gray-800 break-words">{value}</div>
    </div>
  );
}

function formatearFecha(valor?: string | null): string | null {
  if (!valor) return null;
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatearMonto(valor?: number | null): string | null {
  if (valor == null || Number.isNaN(valor)) return null;
  return valor.toLocaleString('es-DO', { style: 'currency', currency: 'DOP' });
}

const ObraMasDetallesDialog: React.FC<ObraMasDetallesDialogProps> = ({ open, onClose, obra }) => {
  const [relaciones, setRelaciones] = useState<ObraRelacionesSigede | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !obra) {
      setRelaciones(null);
      setError(null);
      return;
    }

    const sigedes = sigedesDeObra(obra);

    let cancelado = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await mantenimientosAPI.obtenerRelacionesObraPorSigede(sigedes, obra.id);
        if (!cancelado) setRelaciones(resp.data.data);
      } catch (err: any) {
        if (!cancelado) {
          setError(err.response?.data?.error || 'No se pudieron cargar las relaciones');
          setRelaciones({ sigedes, tramites: [], documentos: [], techado: [] });
        }
      } finally {
        if (!cancelado) setLoading(false);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [open, obra]);

  if (!open || !obra) return null;

  const sigedes = sigedesDeObra(obra);
  const contratista = obra.contratista;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-gray-200 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-xl font-semibold text-gray-800">Resumen por ID SIGEDE</h3>
            <p className="text-sm text-gray-500 mt-1 truncate">{obra.nombre}</p>
            {sigedes.length > 0 && (
              <p className="text-xs text-[#42A5F5] font-mono mt-1">
                SIGEDE: {sigedes.join(' · ')}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <Close />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-6">
          {sigedes.length === 0 && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-900">
              Esta obra no tiene código SIGEDE ni distrito MINERD registrado. Aun así se muestra
              información de Techado u otros módulos si existe vinculación por ID de obra.
            </div>
          )}

          <section>
            <div className="flex items-center gap-2 mb-3">
              <Info fontSize="small" className="text-gray-500" />
              <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                Información adicional
              </h4>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
              <CampoDetalle label="Contrato" value={obra.contrato} />
              <CampoDetalle label="Tipo de obra" value={obra.tipo_obra} />
              <CampoDetalle label="Nombre inaugurado" value={obra.nombre_inaugurado} />
              <CampoDetalle label="Sorteo" value={obra.sorteo} />
              <CampoDetalle label="Área construcción" value={obra.area_construccion} />
              <CampoDetalle label="Coordinador" value={obra.coordinador} />
              <CampoDetalle label="Supervisor" value={obra.supervisor} />
              <CampoDetalle
                label="% ejecutado"
                value={
                  obra.porcentaje_ejecutado != null ? `${obra.porcentaje_ejecutado}%` : null
                }
              />
              <CampoDetalle label="Presupuesto total" value={formatearMonto(obra.presupuesto_total)} />
              <CampoDetalle label="Avance inicial" value={formatearMonto(obra.avance_inicial)} />
              <CampoDetalle label="Total pagado" value={formatearMonto(obra.total_pagado)} />
              <CampoDetalle label="Última cubicación" value={obra.numero_ultima_cubicacion} />
              <CampoDetalle label="Tipo última cubicación" value={obra.tipo_ultima_cubicacion} />
              <CampoDetalle label="Estatus cubicación" value={obra.estatus_ultima_cubicacion} />
              <CampoDetalle
                label="Total última cubicación"
                value={formatearMonto(obra.total_ultima_cubicacion)}
              />
              <CampoDetalle label="Envío SNIP" value={obra.envio_snip} />
              <CampoDetalle label="Monto SNIP" value={formatearMonto(obra.monto_snip)} />
              <CampoDetalle label="Modificación SNIP" value={obra.modificacion_snip} />
              <CampoDetalle label="Fecha detenida" value={formatearFecha(obra.fecha_detenida)} />
              {contratista && (
                <>
                  <CampoDetalle label="Identificación contratista" value={contratista.identificacion} />
                  <CampoDetalle label="Teléfono 1" value={contratista.telefono1} />
                  <CampoDetalle label="Teléfono 2" value={contratista.telefono2} />
                  <CampoDetalle label="Correo contratista" value={contratista.correo} />
                </>
              )}
            </div>
          </section>

          {loading && (
            <div className="flex justify-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#42A5F5] border-t-transparent" />
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && relaciones?.techado && relaciones.techado.length > 0 && (
            <ObraTechadoResumenSection obra={obra} entradas={relaciones.techado} />
          )}

          {!loading && relaciones && sigedes.length > 0 && (
            <>
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <FollowTheSigns fontSize="small" className="text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Trámites relacionados ({relaciones.tramites.length})
                  </h4>
                </div>
                {relaciones.tramites.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No hay trámites vinculados a este SIGEDE.</p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="px-3 py-2 font-semibold">ID</th>
                          <th className="px-3 py-2 font-semibold">Título</th>
                          <th className="px-3 py-2 font-semibold">Estado</th>
                          <th className="px-3 py-2 font-semibold">Área</th>
                          <th className="px-3 py-2 font-semibold">Oficio</th>
                          <th className="px-3 py-2 font-semibold">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {relaciones.tramites.map((t) => (
                          <tr key={t.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 font-mono text-[#42A5F5]">{t.id}</td>
                            <td className="px-3 py-2 max-w-[200px] truncate" title={t.titulo}>
                              {t.titulo}
                            </td>
                            <td className="px-3 py-2">{getEstadoLabel(t.estado)}</td>
                            <td className="px-3 py-2">{t.area_destinatario || '—'}</td>
                            <td className="px-3 py-2">{t.oficio || '—'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {formatearFecha(t.fecha_creacion) || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Description fontSize="small" className="text-gray-500" />
                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                    Documentos técnicos ({relaciones.documentos.length})
                  </h4>
                </div>
                {relaciones.documentos.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">
                    No hay documentos técnicos vinculados a este SIGEDE.
                  </p>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Solicitud</th>
                          <th className="px-3 py-2 font-semibold">Tipo adenda</th>
                          <th className="px-3 py-2 font-semibold">No. adenda</th>
                          <th className="px-3 py-2 font-semibold">Adenda actual</th>
                          <th className="px-3 py-2 font-semibold">Monto total</th>
                          <th className="px-3 py-2 font-semibold">Fecha</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {relaciones.documentos.map((d) => (
                          <tr key={d.id} className="hover:bg-gray-50">
                            <td className="px-3 py-2 max-w-[180px] truncate" title={d.solicitud}>
                              {d.solicitud}
                            </td>
                            <td className="px-3 py-2">{d.tipo_adenda || '—'}</td>
                            <td className="px-3 py-2">{d.no_adenda_solicituda ?? '—'}</td>
                            <td className="px-3 py-2">{d.numero_adenda_actual || '—'}</td>
                            <td className="px-3 py-2">{formatearMonto(d.monto_total) || '—'}</td>
                            <td className="px-3 py-2 whitespace-nowrap">
                              {formatearFecha(d.created_at) || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </div>

        <div className="p-5 border-t border-gray-200 flex justify-end">
          <button type="button" onClick={onClose} className={BTN_PRIMARY}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ObraMasDetallesDialog;
