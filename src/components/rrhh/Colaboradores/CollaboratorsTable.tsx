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
import type { ColaboradorMock } from '../mockData';

interface CollaboratorsTableProps {
  colaboradores: ColaboradorMock[];
  onOpen?: (row: ColaboradorMock) => void;
}

const CollaboratorsTable: React.FC<CollaboratorsTableProps> = ({ colaboradores, onOpen }) => {
  if (colaboradores.length === 0) {
    return (
      <div className={GT_VACIO}>
        <p className="text-sm text-stone-500">No se encontraron colaboradores con los filtros actuales.</p>
      </div>
    );
  }

  return (
    <div className={GT_TABLA_WRAP}>
      <div className="overflow-x-auto">
        <table className={GT_TABLA}>
          <thead className={GT_TABLA_HEAD}>
            <tr>
              <th className={`${GT_TABLA_TH} w-12`}>Foto</th>
              <th className={GT_TABLA_TH}>Nombre</th>
              <th className={GT_TABLA_TH}>Área</th>
              <th className={GT_TABLA_TH}>Cargo</th>
              <th className={GT_TABLA_TH}>Correo</th>
              <th className={GT_TABLA_TH}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {colaboradores.map((c) => (
              <tr
                key={c.id}
                role={onOpen ? 'button' : undefined}
                tabIndex={onOpen ? 0 : undefined}
                onClick={() => onOpen?.(c)}
                onKeyDown={(e) => {
                  if (!onOpen) return;
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(c);
                  }
                }}
                className={[
                  'border-b border-warm-100/80 last:border-b-0 transition-colors',
                  onOpen
                    ? 'hover:bg-primary-light/30 cursor-pointer focus-visible:bg-primary-light/40 focus-visible:outline-none'
                    : 'hover:bg-warm-50/40',
                ].join(' ')}
              >
                <td className={GT_TABLA_TD}>
                  <span
                    className={[
                      'inline-flex h-9 w-9 items-center justify-center rounded-full text-white text-xs font-semibold shadow-soft',
                      c.avatarClass,
                    ].join(' ')}
                  >
                    {c.iniciales}
                  </span>
                </td>
                <td className={`${GT_TABLA_TD} font-medium text-stone-800 whitespace-nowrap`}>
                  {c.nombre}
                </td>
                <td className={`${GT_TABLA_TD} whitespace-nowrap`}>{c.departamento}</td>
                <td className={`${GT_TABLA_TD} whitespace-nowrap`}>{c.cargo}</td>
                <td className={`${GT_TABLA_TD} whitespace-nowrap`}>{c.correo}</td>
                <td className={GT_TABLA_TD}>
                  <Badge tone={c.estado === 'Activo' ? 'success' : 'neutral'}>{c.estado}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CollaboratorsTable;
