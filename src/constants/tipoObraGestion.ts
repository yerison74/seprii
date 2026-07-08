/** Clasificación de obra en gestión técnica: SIGEDE (arrastre) vs manual (mantenimiento). */
export const TIPO_OBRA_GESTION_ARRASTRE = 'Arrastre' as const;
export const TIPO_OBRA_GESTION_MANTENIMIENTO = 'Mantenimiento' as const;

export const TIPO_OBRA_GESTION_OPCIONES = [
  TIPO_OBRA_GESTION_ARRASTRE,
  TIPO_OBRA_GESTION_MANTENIMIENTO,
] as const;

export type TipoObraGestion = (typeof TIPO_OBRA_GESTION_OPCIONES)[number];

export function esTipoObraGestionArrastre(tipo?: string | null): boolean {
  return (tipo ?? '').trim() === TIPO_OBRA_GESTION_ARRASTRE;
}

export function esTipoObraGestionMantenimiento(tipo?: string | null): boolean {
  return (tipo ?? '').trim() === TIPO_OBRA_GESTION_MANTENIMIENTO;
}

/** Clases Tailwind para la etiqueta en listados (similar a Programa Techado). */
export const CLASE_ETIQUETA_OBRA_GESTION_MANTENIMIENTO =
  'px-2 py-0.5 text-xs font-semibold rounded-full bg-violet-100 text-violet-900';

export const ETIQUETA_OBRA_GESTION_MANTENIMIENTO = 'Mantenimiento';

export function inferirTipoObraGestion(obra: {
  codigo?: string | null;
  distrito_minerd_sigede?: string | null;
  contrato_id?: string | null;
  contrato?: string | null;
}): TipoObraGestion {
  const tieneSigede =
    !!(obra.codigo && obra.codigo.trim()) ||
    !!(obra.distrito_minerd_sigede && obra.distrito_minerd_sigede.trim());
  if (tieneSigede) return TIPO_OBRA_GESTION_ARRASTRE;
  const tieneContrato =
    !!(obra.contrato_id && String(obra.contrato_id).trim()) ||
    !!(obra.contrato && obra.contrato.trim());
  if (tieneContrato) return TIPO_OBRA_GESTION_MANTENIMIENTO;
  return TIPO_OBRA_GESTION_ARRASTRE;
}
