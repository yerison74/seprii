import React from 'react';
import Badge from '../Badge';
import type { VacacionMock } from '../mockData';

interface VacationTableProps {
  vacaciones: VacacionMock[];
}

function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const VacationTable: React.FC<VacationTableProps> = ({ vacaciones }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead>
        <tr className="bg-slate-50/80 border-b border-[#e5e7eb] text-left">
          <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Colaborador
          </th>
          <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Fecha inicio
          </th>
          <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Fecha fin
          </th>
          <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Días
          </th>
          <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Estado
          </th>
        </tr>
      </thead>
      <tbody>
        {vacaciones.map((v) => (
          <tr
            key={v.id}
            className="border-b last:border-b-0 border-[#e5e7eb] hover:bg-slate-50/70 transition-colors"
          >
            <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
              {v.colaborador}
            </td>
            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
              {formatearFecha(v.fechaInicio)}
            </td>
            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
              {formatearFecha(v.fechaFin)}
            </td>
            <td className="px-4 py-3 text-slate-600 tabular-nums">{v.dias}</td>
            <td className="px-4 py-3">
              <Badge tone={v.estado === 'Aprobada' ? 'success' : 'warning'}>{v.estado}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default VacationTable;
