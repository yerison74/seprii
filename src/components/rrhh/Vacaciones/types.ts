export type EstadoVacacionUi = 'Pendiente' | 'Aprobada' | 'Rechazada';

export type VacacionListaItem = {
  id: string;
  colaboradorId: string;
  colaborador: string;
  fechaInicio: string;
  fechaFin: string;
  dias: number;
  estado: EstadoVacacionUi;
};
