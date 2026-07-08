/**
 * Query en /contratista/:token para vista con acciones (asignar / seguimiento).
 * La URL usa el token de la tabla contratista_access_tokens, no el ID real.
 */
export const CONTRATISTA_DETALLE_Q_FROM = 'from';
export const CONTRATISTA_DETALLE_Q_FROM_APP = 'app';

export function hrefContratistaDetalleDesdeApp(id: string): string {
  const q = new URLSearchParams();
  q.set(CONTRATISTA_DETALLE_Q_FROM, CONTRATISTA_DETALLE_Q_FROM_APP);
  return `/contratista/${encodeURIComponent(id)}?${q.toString()}`;
}

export function esContratistaDetalleDesdeApp(search: string): boolean {
  return new URLSearchParams(search).get(CONTRATISTA_DETALLE_Q_FROM) === CONTRATISTA_DETALLE_Q_FROM_APP;
}

/**
 * URL absoluta para código QR usando el token de la BD.
 * El token ya es opaco — no expone el ID real (ej: "FC-000019").
 */
export function urlAbsolutaDetalleContratista(token: string): string {
  return `${window.location.origin}/contratista/${token}`;
}

/** Imagen del QR (servicio externo) apuntando al detalle con token opaco. */
export function urlImagenQrDetalleContratista(token: string, sizePx = 260): string {
  const data = urlAbsolutaDetalleContratista(token);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${sizePx}x${sizePx}&data=${encodeURIComponent(data)}`;
}
