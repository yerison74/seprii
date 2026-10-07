import React, { useMemo, useState } from 'react';
import Card from '../Card';
import AttendanceStats from './AttendanceStats';
import AttendanceTable from './AttendanceTable';
import type { PoncheMock } from '../mockData';

interface PoncheViewProps {
  registros: PoncheMock[];
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const PoncheView: React.FC<PoncheViewProps> = ({ registros }) => {
  const [mes, setMes] = useState('2026-09');

  const filtrados = useMemo(
    () => registros.filter((r) => r.fecha.startsWith(mes)),
    [registros, mes],
  );

  // KPI de referencia del dashboard (demo). La tabla debajo usa registros mock del mes.
  const stats = useMemo(
    () => ({
      presentes: mes === '2026-09' ? 28 : filtrados.filter((r) => r.estado !== 'Ausente').length,
      ausentes: mes === '2026-09' ? 3 : filtrados.filter((r) => r.estado === 'Ausente').length,
      tardios: mes === '2026-09' ? 1 : filtrados.filter((r) => r.estado === 'Tardío').length,
    }),
    [filtrados, mes],
  );

  const anio = Number(mes.slice(0, 4));
  const opcionesMes = MESES.map((nombre, idx) => {
    const value = `${anio}-${String(idx + 1).padStart(2, '0')}`;
    return { value, label: `${nombre} ${anio}` };
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <label className="inline-flex flex-col gap-1.5 text-xs font-medium text-slate-500">
          Mes
          <select
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className="h-10 min-w-[180px] rounded-lg border border-slate-200/80 bg-white px-3 text-sm text-slate-700 outline-none shadow-sm focus:border-blue-300 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200"
          >
            {opcionesMes.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <AttendanceStats
        presentes={stats.presentes}
        ausentes={stats.ausentes}
        tardios={stats.tardios}
      />

      <Card title="Registro de ponche" subtitle="Detalle diario de marcaciones.">
        <AttendanceTable registros={filtrados} />
      </Card>
    </div>
  );
};

export default PoncheView;
