import React, { useMemo } from 'react';
import Card from '../Card';
import VacationCalendar from './VacationCalendar';
import VacationTable from './VacationTable';
import type { VacacionListaItem } from './types';

interface VacacionesViewProps {
  vacaciones: VacacionListaItem[];
  search?: string;
  onOpen?: (row: VacacionListaItem) => void;
}

const VacacionesView: React.FC<VacacionesViewProps> = ({
  vacaciones,
  search = '',
  onOpen,
}) => {
  const filtradas = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return vacaciones;
    return vacaciones.filter(
      (v) =>
        v.colaborador.toLowerCase().includes(term) ||
        v.estado.toLowerCase().includes(term),
    );
  }, [vacaciones, search]);

  const proximas = useMemo(() => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return [...filtradas]
      .filter((v) => {
        const [y, m, d] = v.fechaFin.split('-').map(Number);
        const fin = new Date(y, m - 1, d);
        return fin >= hoy;
      })
      .sort((a, b) => a.fechaInicio.localeCompare(b.fechaInicio));
  }, [filtradas]);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card title="Calendario de vacaciones" subtitle="Vista mensual de ausencias programadas.">
        <VacationCalendar vacaciones={filtradas} />
      </Card>
      <Card title="Vacaciones registradas" subtitle="Haz clic en una fila para ver o editar.">
        <VacationTable vacaciones={proximas.length ? proximas : filtradas} onOpen={onOpen} />
      </Card>
    </div>
  );
};

export default VacacionesView;
export type { VacacionListaItem } from './types';
