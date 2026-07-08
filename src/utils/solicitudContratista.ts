import type { EstadoSolicitudContratista } from '../types/database';

export function labelEstadoSolicitudContratista(estado: string | null | undefined): string {
  switch (estado) {
    case 'pendiente_asignacion':
      return 'Pendiente de asignación';
    case 'en_seguimiento':
      return 'En seguimiento';
    case 'detenido':
      return 'Detenido';
    case 'completado':
      return 'Completado';
    default:
      return 'Pendiente de asignación';
  }
}

export function esEstadoTerminal(estado: string | null | undefined): boolean {
  return estado === 'detenido' || estado === 'completado';
}

export function colorEstadoSolicitudContratista(
  estado: string | null | undefined
): 'default' | 'primary' | 'warning' | 'success' {
  if (estado === 'detenido') return 'warning';
  if (estado === 'completado') return 'success';
  return 'primary';
}

export function normalizarEstadoSolicitud(
  estado: string | null | undefined
): EstadoSolicitudContratista {
  if (
    estado === 'pendiente_asignacion' ||
    estado === 'en_seguimiento' ||
    estado === 'detenido' ||
    estado === 'completado'
  ) {
    return estado;
  }
  return 'pendiente_asignacion';
}
