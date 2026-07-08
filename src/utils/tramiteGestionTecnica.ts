import type { MovimientoTramite, Tramite } from '../types/database';

const MARCA_ORIGEN_GT = 'Origen: Gestión técnica de documento';

export function esTramiteGestionTecnica(
  tramite: Pick<Tramite, 'tipo_tramite' | 'titulo' | 'id'> | null | undefined,
): boolean {
  if (!tramite) return false;
  if (tramite.tipo_tramite === 'tipo_gestion_tecnica') return true;
  return (tramite.titulo || '').startsWith('Doc. técnico');
}

export function esMovimientoDesdeGestionTecnica(mov: MovimientoTramite): boolean {
  if (mov.movimiento_documento_id) return true;
  if (mov.tipo_tramite === 'tipo_gestion_tecnica') return true;
  return (mov.observaciones || '').includes(MARCA_ORIGEN_GT);
}

export const MARCA_OBSERVACION_GESTION_TECNICA = MARCA_ORIGEN_GT;
