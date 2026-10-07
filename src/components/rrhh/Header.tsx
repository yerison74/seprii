import React from 'react';
import { People as PeopleIcon } from '@mui/icons-material';
import { Search, Plus } from 'lucide-react';
import ModuloPageHeader from '../ui/ModuloPageHeader';
import { BTN_PRIMARY } from '../../constants/buttonStyles';
import { SEPRI_FIELD_SHADOW } from '../../constants/sepriSurfaces';
import type { RrhhTab } from './mockData';

interface HeaderProps {
  activeTab: RrhhTab;
  search: string;
  onSearchChange: (value: string) => void;
  onNuevo: () => void;
  showNuevo?: boolean;
}

const TITULOS: Record<
  RrhhTab,
  { titulo: string; subtitulo: string; boton: string }
> = {
  colaboradores: {
    titulo: 'Colaboradores',
    subtitulo: 'Gestiona la información de los colaboradores de la empresa.',
    boton: 'Nuevo colaborador',
  },
  vacaciones: {
    titulo: 'Vacaciones',
    subtitulo: 'Gestiona las solicitudes y el calendario de vacaciones de los colaboradores.',
    boton: 'Nueva solicitud',
  },
  ponche: {
    titulo: 'Ponche',
    subtitulo: 'Registra y consulta la asistencia al ponche de los colaboradores.',
    boton: 'Registrar ponche',
  },
};

const Header: React.FC<HeaderProps> = ({
  activeTab,
  search,
  onSearchChange,
  onNuevo,
  showNuevo = true,
}) => {
  const meta = TITULOS[activeTab];

  return (
    <ModuloPageHeader
      icon={<PeopleIcon fontSize="small" />}
      title={meta.titulo}
      description={meta.subtitulo}
    >
      {activeTab === 'colaboradores' && (
        <div className="relative min-w-[200px] sm:min-w-[240px] w-full sm:w-auto">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
            aria-hidden
          />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar colaborador..."
            className={`w-full pl-9 pr-3 py-2.5 rounded-xl text-sm text-stone-700 placeholder:text-stone-400 bg-white border-0 outline-none ${SEPRI_FIELD_SHADOW}`}
          />
        </div>
      )}
      {showNuevo && (
        <button type="button" onClick={onNuevo} className={BTN_PRIMARY}>
          <Plus size={15} strokeWidth={2} aria-hidden />
          {meta.boton}
        </button>
      )}
    </ModuloPageHeader>
  );
};

export default Header;
