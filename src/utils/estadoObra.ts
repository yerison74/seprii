/** Colores de etiqueta de estado de obra (Gestión de Obras). */
export type EstadoObraColores = { bg: string; text: string };

const COLORES_ESTADO_OBRA: Record<string, EstadoObraColores> = {
  INAUGURADA: { bg: '#2196F3', text: '#FFFFFF' },
  TERMINADA: { bg: '#4CAF50', text: '#FFFFFF' },
  DETENIDA: { bg: '#FFC107', text: '#000000' },
  'NO INICIADA': { bg: '#F44336', text: '#FFFFFF' },
  ACTIVA: { bg: '#00BCD4', text: '#FFFFFF' },
  PRELIMINARES: { bg: '#FF9800', text: '#FFFFFF' },
  'INTERVENIDA MANTENIMIENTO': { bg: '#9C27B0', text: '#FFFFFF' },
  'NO ESPECIFICADO': { bg: '#9E9E9E', text: '#FFFFFF' },
};

export function getEstadoObraColores(estado: string): EstadoObraColores {
  const key = (estado || '').trim().toUpperCase();
  return COLORES_ESTADO_OBRA[key] ?? { bg: '#757575', text: '#FFFFFF' };
}

export const CLASE_ETIQUETA_ESTADO_OBRA =
  'px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap flex-shrink-0';
