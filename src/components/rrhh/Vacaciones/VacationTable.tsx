import React from 'react';
import Badge from '../Badge';
import {
  GT_TABLA,
  GT_TABLA_HEAD,
  GT_TABLA_TD,
  GT_TABLA_TH,
  GT_TABLA_WRAP,
  GT_VACIO,
} from '../../../constants/gestionTecnicaDocumentoUi';
import type { VacacionListaItem } from './types';

interface VacationTableProps {
  vacaciones: VacacionListaItem[];
  onOpen?: (row: VacacionListaItem) => void;
}

function formatearFecha(iso: string): string {
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso || '—';
  return `${d}/${m}/${y}`;
}

function toneEstado(estado: VacacionListaItem['estado']) {
  if (estado === 'Aprobada') return 'success' as const;
  if (estado === 'Rechazada') return 'danger' as const;
  return 'warning' as const;
}

const VacationTable: React.FC<VacationTableProps> = ({ vacaciones, onOpen }) => {
  if (vacaciones.length === 0) {
    return (
      <div className={GT_VACIO}>
        <p className="text-sm text-stone-500">No hay vacaciones registradas con los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className={GT_TABLA_WRAP}>
      <div className="overflow-x-auto">
        <table className={GT_TABLA}>
          <thead className={GT_TABLA_HEAD}>
            <tr>
              <th className={GT_TABLA_TH}>Colaborador</th>
              <th className={GT_TABLA_TH}>Fecha inicio</th>
              <th className={GT_TABLA_TH}>Fecha fin</th>
              <th className={GT_TABLA_TH}>Días</th>
              <th className={GT_TABLA_TH}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {vacaciones.map((v) => (
              <tr
                key={v.id}
                role={onOpen ? 'button' : undefined}
                tabIndex={onOpen ? 0 : undefined}
                onClick={() => onOpen?.(v)}
                onKeyDown={(e) => {
                  if (!onOpen) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(v);
                  }
                }}
                className={[
                  'border-b border-warm-100/80 last:border-b-0 transition-colors',
                  onOpen
                    ? 'hover:bg-primary-light/30 cursor-pointer focus-visible:bg-primary-light/40 focus-visible:outline-none'
                    : 'hover:bg-warm-50/40',
                ].join(' ')}
              >
                <td className={`${GT_TABLA_TD} font-medium text-stone-800 whitespace-nowrap`}>
                  {v.colaborador}
                </td>
                <td className={`${GT_TABLA_TD} whitespace-nowrap`}>{formatearFecha(v.fechaInicio)}</td>
                <td className={`${GT_TABLA_TD} whitespace-nowrap`}>{formatearFecha(v.fechaFin)}</td>
                <td className={`${GT_TABLA_TD} tabular-nums`}>{v.dias}</td>
                <td className={GT_TABLA_TD}>
                  <Badge tone={toneEstado(v.estado)}>{v.estado}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VacationTable;
