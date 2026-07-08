import React from 'react';
import type { Obra } from '../types/database';
import {
  REPORTE_OBRAS_AREAS,
  obtenerValorReporteCampo,
  formatearValorReporte,
} from '../constants/reporteObrasAreas';

interface ReporteObrasTablaDetalleProps {
  obras: Obra[];
}

const AREA_HEADER_CLASS = 'bg-emerald-600 text-white text-xs font-bold uppercase tracking-wide';
const CAMPO_HEADER_CLASS = 'bg-slate-100 text-slate-600 text-xs font-semibold';

const ReporteObrasTablaDetalle: React.FC<ReporteObrasTablaDetalleProps> = ({ obras }) => {
  if (obras.length === 0) {
    return (
      <p className="text-slate-500 text-sm py-6 text-center">
        No hay obras para mostrar con los filtros aplicados.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-sm border-collapse">
        <thead>
          <tr>
            <th
              rowSpan={2}
              className="sticky left-0 z-20 bg-slate-200 px-3 py-2 text-left font-semibold text-slate-700 border-b border-r border-slate-300 min-w-[100px]"
            >
              ID
            </th>
            {REPORTE_OBRAS_AREAS.map((area) => (
              <th
                key={area.id}
                colSpan={area.campos.length}
                className={`${AREA_HEADER_CLASS} px-2 py-2 text-center border-b border-r border-emerald-700`}
              >
                {area.label}
              </th>
            ))}
          </tr>
          <tr>
            {REPORTE_OBRAS_AREAS.flatMap((area) =>
              area.campos.map((campo) => (
                <th
                  key={`${area.id}-${campo.key}`}
                  className={`${CAMPO_HEADER_CLASS} px-2 py-2 text-left whitespace-nowrap border-b border-r border-slate-200 min-w-[120px]`}
                  title={`${area.label} — ${campo.label}`}
                >
                  {campo.label}
                </th>
              )),
            )}
          </tr>
        </thead>
        <tbody>
          {obras.map((obra) => {
            const contratista = obra.contratista ?? null;
            const obraRecord = obra as unknown as Record<string, unknown>;
            const contratistaRecord = contratista as unknown as Record<string, unknown> | null;

            return (
              <tr key={obra.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                <td className="sticky left-0 z-10 bg-white px-3 py-2 font-mono text-xs text-slate-600 border-r border-slate-200">
                  {obra.codigo || obra.id}
                </td>
                {REPORTE_OBRAS_AREAS.flatMap((area) =>
                  area.campos.map((campo) => {
                    const valor = obtenerValorReporteCampo(obraRecord, contratistaRecord, campo);
                    const texto = formatearValorReporte(valor, campo.format);
                    const esObservacion = area.id === 'observaciones';
                    return (
                      <td
                        key={`${obra.id}-${area.id}-${campo.key}`}
                        className={`px-2 py-2 text-slate-800 border-r border-slate-100 align-top ${
                          esObservacion ? 'max-w-xs whitespace-pre-wrap' : 'whitespace-nowrap'
                        }`}
                        title={texto}
                      >
                        {texto}
                      </td>
                    );
                  }),
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default ReporteObrasTablaDetalle;
