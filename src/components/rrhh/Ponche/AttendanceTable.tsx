import React from 'react';
import Badge from '../Badge';
import type { EstadoPonche, PoncheMock } from '../mockData';

interface AttendanceTableProps {
  registros: PoncheMock[];
}

function toneEstado(estado: EstadoPonche) {
  if (estado === 'Completo') return 'success' as const;
  if (estado === 'Tardío') return 'warning' as const;
  return 'danger' as const;
}

function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const AttendanceTable: React.FC<AttendanceTableProps> = ({ registros }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full text-sm">
      <thead>
        <tr className="bg-slate-50/80 border-b border-[#e5e7eb] text-left">
          <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Fecha
          </th>
          <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Colaborador
          </th>
          <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Hora entrada
          </th>
          <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Hora salida
          </th>
          <th className="px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wide">
            Estado
          </th>
        </tr>
      </thead>
      <tbody>
        {registros.map((r) => (
          <tr
            key={r.id}
            className="border-b last:border-b-0 border-[#e5e7eb] hover:bg-slate-50/70 transition-colors"
          >
            <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{formatearFecha(r.fecha)}</td>
            <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">
              {r.colaborador}
            </td>
            <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">
              {r.horaEntrada || '—'}
            </td>
            <td className="px-4 py-3 text-slate-600 tabular-nums whitespace-nowrap">
              {r.horaSalida || '—'}
            </td>
            <td className="px-4 py-3">
              <Badge tone={toneEstado(r.estado)}>{r.estado}</Badge>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default AttendanceTable;
