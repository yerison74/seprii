import React from 'react';
import Card from '../Card';
import VacationCalendar from './VacationCalendar';
import VacationTable from './VacationTable';
import type { VacacionMock } from '../mockData';

interface VacacionesViewProps {
  vacaciones: VacacionMock[];
}

const VacacionesView: React.FC<VacacionesViewProps> = ({ vacaciones }) => (
  <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
    <Card title="Calendario de vacaciones" subtitle="Vista mensual de ausencias programadas.">
      <VacationCalendar vacaciones={vacaciones} />
    </Card>
    <Card title="Próximas vacaciones" subtitle="Solicitudes próximas a iniciar.">
      <VacationTable vacaciones={vacaciones} />
    </Card>
  </div>
);

export default VacacionesView;
