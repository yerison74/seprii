/** Opciones de tipo de adenda — Gestión técnica de documento. */
export const TIPOS_ADENDA = [
  'Equilibrio economico',
  'Reformulacion de presupuesto',
  'Extencion de vigencia',
  'Presupuesto de terminación',
  'Sustitución de partida y partida nueva',
  'Aumento de volumen (25%)',
] as const;

export type TipoAdenda = (typeof TIPOS_ADENDA)[number];

/** Estatus de un movimiento — Gestión técnica de documento. */
export const ESTATUS_MOVIMIENTO_DOCUMENTO = [
  'En Proceso',
  'Detenida',
  'Certificada',
] as const;

export type EstatusMovimientoDocumento = (typeof ESTATUS_MOVIMIENTO_DOCUMENTO)[number];

export function esEstatusMovimientoValido(value: string): boolean {
  if (!value.trim()) return true;
  return ESTATUS_MOVIMIENTO_DOCUMENTO.includes(value.trim() as EstatusMovimientoDocumento);
}

/** Formato de montos en pesos dominicanos para visualización. */
export function formatMontoDOP(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Convierte texto de formulario a monto (null si vacío o inválido). */
export function parseMontoDOP(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const n = parseFloat(normalized);
  if (Number.isNaN(n)) return null;
  return Math.round(n * 100) / 100;
}

export function montoFormDesdeNumero(value?: number | null): string {
  if (value == null || Number.isNaN(value)) return '';
  return String(value);
}

export function esMontoValido(value: string): boolean {
  if (!value.trim()) return true;
  return parseMontoDOP(value) != null;
}

/** Código de adenda: 1–4 dígitos, guion, 1–4 dígitos (ej. 12-345, 1234-5678). */
export const PATRON_CODIGO_ADENDA = /^\d{1,4}-\d{1,4}$/;

export function esCodigoAdendaValido(value: string): boolean {
  if (!value.trim()) return true;
  return PATRON_CODIGO_ADENDA.test(value.trim());
}

export function normalizarCodigoAdenda(value: string): string | null {
  const trimmed = value.trim();
  return trimmed || null;
}

/** Estados de adenda contractual (tabla adenda). */
export const ESTADOS_ADENDA = ['en_curso', 'anterior'] as const;

export type EstadoAdendaGestion = (typeof ESTADOS_ADENDA)[number];

export const ETIQUETAS_ESTADO_ADENDA: Record<EstadoAdendaGestion, string> = {
  en_curso: 'En curso',
  anterior: 'Anterior',
};

export function esEstadoAdendaValido(value: string): boolean {
  return ESTADOS_ADENDA.includes(value as EstadoAdendaGestion);
}
