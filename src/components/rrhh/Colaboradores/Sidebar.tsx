import React from 'react';
import { Users, UserCheck, UserX, Building2 } from 'lucide-react';
import {
  GT_BLOQUE_TITULO,
  SEPRI_BADGE,
  SEPRI_CARD,
  SEPRI_LIST_ITEM,
  SEPRI_LIST_ITEM_ACTIVE,
} from '../../../constants/gestionTecnicaDocumentoUi';

export type SidebarFilter = 'todos' | 'activos' | 'inactivos' | string;

interface SidebarProps {
  selected: SidebarFilter;
  onSelect: (value: SidebarFilter) => void;
  counts: {
    todos: number;
    activos: number;
    inactivos: number;
    porDepartamento: Record<string, number>;
  };
}

const Sidebar: React.FC<SidebarProps> = ({ selected, onSelect, counts }) => {
  const principales = [
    { id: 'todos' as const, label: 'Todos', icon: <Users size={15} />, count: counts.todos },
    { id: 'activos' as const, label: 'Activos', icon: <UserCheck size={15} />, count: counts.activos },
    { id: 'inactivos' as const, label: 'Inactivos', icon: <UserX size={15} />, count: counts.inactivos },
  ];

  const areas = Object.entries(counts.porDepartamento).sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <aside className={`w-full lg:w-[240px] shrink-0 ${SEPRI_CARD} overflow-hidden`}>
      <div className="px-4 py-3.5">
        <p className={GT_BLOQUE_TITULO}>Filtros</p>
      </div>

      <div className="px-3 pb-2 space-y-1.5">
        {principales.map((item) => {
          const activo = selected === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={[
                'w-full flex items-center gap-2.5 text-left border-0 outline-none cursor-pointer',
                SEPRI_LIST_ITEM,
                'p-2.5 !rounded-xl',
                activo ? SEPRI_LIST_ITEM_ACTIVE : '',
              ].join(' ')}
            >
              <span className={activo ? 'text-[#1E88E5]' : 'text-stone-400'}>{item.icon}</span>
              <span
                className={[
                  'flex-1 text-sm',
                  activo ? 'text-stone-800 font-medium' : 'text-stone-600',
                ].join(' ')}
              >
                {item.label}
              </span>
              <span className={SEPRI_BADGE}>{item.count}</span>
            </button>
          );
        })}
      </div>

      <div className="px-4 pt-2 pb-1">
        <p className={`${GT_BLOQUE_TITULO} flex items-center gap-1.5`}>
          <Building2 size={11} aria-hidden />
          Por área
        </p>
      </div>

      <div className="px-3 pb-3 space-y-1.5">
        {areas.length === 0 ? (
          <p className="px-2.5 py-2 text-xs text-stone-400">Sin áreas registradas</p>
        ) : (
          areas.map(([area, count]) => {
            const activo = selected === area;
            return (
              <button
                key={area}
                type="button"
                onClick={() => onSelect(area)}
                className={[
                  'w-full flex items-center gap-2.5 text-left border-0 outline-none cursor-pointer',
                  SEPRI_LIST_ITEM,
                  'p-2.5 !rounded-xl',
                  activo ? SEPRI_LIST_ITEM_ACTIVE : '',
                ].join(' ')}
              >
                <span
                  className={[
                    'flex-1 text-sm truncate',
                    activo ? 'text-stone-800 font-medium' : 'text-stone-600',
                  ].join(' ')}
                >
                  {area}
                </span>
                <span className={SEPRI_BADGE}>{count}</span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
