import React, { useMemo, useState } from 'react';
import Sidebar, { type SidebarFilter } from './Sidebar';
import CollaboratorsTable from './CollaboratorsTable';
import type { ColaboradorMock } from '../mockData';

interface ColaboradoresViewProps {
  colaboradores: ColaboradorMock[];
  search: string;
  onOpen?: (row: ColaboradorMock) => void;
}

const ColaboradoresView: React.FC<ColaboradoresViewProps> = ({
  colaboradores,
  search,
  onOpen,
}) => {
  const [filtro, setFiltro] = useState<SidebarFilter>('todos');

  const counts = useMemo(() => {
    const porDepartamento: Record<string, number> = {};
    let activos = 0;
    let inactivos = 0;
    for (const c of colaboradores) {
      if (c.estado === 'Activo') activos += 1;
      else inactivos += 1;
      porDepartamento[c.departamento] = (porDepartamento[c.departamento] || 0) + 1;
    }
    return {
      todos: colaboradores.length,
      activos,
      inactivos,
      porDepartamento,
    };
  }, [colaboradores]);

  const filtrados = useMemo(() => {
    const term = search.trim().toLowerCase();
    return colaboradores.filter((c) => {
      if (filtro === 'activos' && c.estado !== 'Activo') return false;
      if (filtro === 'inactivos' && c.estado !== 'Inactivo') return false;
      if (
        filtro !== 'todos' &&
        filtro !== 'activos' &&
        filtro !== 'inactivos' &&
        c.departamento !== filtro
      ) {
        return false;
      }
      if (!term) return true;
      return (
        c.nombre.toLowerCase().includes(term) ||
        c.correo.toLowerCase().includes(term) ||
        c.cargo.toLowerCase().includes(term) ||
        c.departamento.toLowerCase().includes(term)
      );
    });
  }, [colaboradores, filtro, search]);

  return (
    <div className="flex flex-col lg:flex-row gap-4 w-full">
      <Sidebar selected={filtro} onSelect={setFiltro} counts={counts} />
      <div className="flex-1 min-w-0 w-full">
        <CollaboratorsTable colaboradores={filtrados} onOpen={onOpen} />
      </div>
    </div>
  );
};

export default ColaboradoresView;
