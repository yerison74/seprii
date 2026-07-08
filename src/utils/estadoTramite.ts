import type { Tramite } from '../services/api';

export type EstadoTramite = Tramite['estado'] | string;

export const getEstadoColor = (
  estado: EstadoTramite,
): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const colores: Record<EstadoTramite, any> = {
    en_transito: 'warning',
    detenido: 'error',
    firmado: 'info',
    procesado: 'primary',
    completado: 'success',
  };
  return colores[estado] || 'default';
};

export const getEstadoLabel = (estado: EstadoTramite): string => {
  const labels: Record<EstadoTramite, string> = {
    en_transito: 'En Tránsito',
    detenido: 'Detenido',
    firmado: 'Firmado',
    procesado: 'Procesado',
    completado: 'Completado',
  };
  return labels[estado] || estado;
};

