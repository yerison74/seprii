import React from 'react';
import { Users, CalendarDays, Coffee } from 'lucide-react';
import { SEPRI_CARD } from '../../constants/sepriSurfaces';
import type { RrhhTab } from './mockData';

interface TabItem {
  id: RrhhTab;
  label: string;
  icon: React.ReactNode;
}

interface TabsProps {
  activeTab: RrhhTab;
  onChange: (tab: RrhhTab) => void;
  visibleTabs?: RrhhTab[];
}

const ALL_TABS: TabItem[] = [
  { id: 'colaboradores', label: 'Colaboradores', icon: <Users size={15} strokeWidth={1.75} /> },
  { id: 'vacaciones', label: 'Vacaciones', icon: <CalendarDays size={15} strokeWidth={1.75} /> },
  { id: 'ponche', label: 'Ponche', icon: <Coffee size={15} strokeWidth={1.75} /> },
];

const Tabs: React.FC<TabsProps> = ({ activeTab, onChange, visibleTabs }) => {
  const tabs = visibleTabs
    ? ALL_TABS.filter((t) => visibleTabs.includes(t.id))
    : ALL_TABS;

  return (
    <div className={`w-full ${SEPRI_CARD} px-2 py-1.5`}>
      <nav className="flex items-center gap-1 overflow-x-auto" role="tablist">
        {tabs.map((tab) => {
          const activo = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activo}
              onClick={() => onChange(tab.id)}
              className={[
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap',
                'border-0 outline-none transition-colors duration-150',
                activo
                  ? 'bg-primary-light/50 text-[#1E88E5] shadow-soft'
                  : 'bg-transparent text-stone-500 hover:bg-warm-50 hover:text-stone-700',
              ].join(' ')}
            >
              <span className={activo ? 'text-[#1E88E5]' : 'text-stone-400'}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export default Tabs;
