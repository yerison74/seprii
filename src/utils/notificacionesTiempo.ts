/**
 * Formato de tiempo restante y mensajes para notificaciones por % de tiempo en trámites.
 * Umbrales: 50%, 70%, 100%.
 */

export type PorcentajeNotificacion = 50 | 70 | 100;

export interface TiempoRestante {
  dias: number;
  horas: number;
  minutos: number;
  segundos: number;
}

/** Convierte milisegundos restantes en días, horas, minutos, segundos (valores no negativos). */
export function msATiempoRestante(ms: number): TiempoRestante {
  if (ms <= 0) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0 };
  }
  const seg = Math.floor((ms / 1000) % 60);
  const min = Math.floor((ms / (1000 * 60)) % 60);
  const hr = Math.floor((ms / (1000 * 60 * 60)) % 24);
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  return { dias: d, horas: hr, minutos: min, segundos: seg };
}

/** Texto para 50%: "x días, x minutos y x segundos". */
export function formatoRestante50(restante: TiempoRestante): string {
  const parts: string[] = [];
  if (restante.dias > 0) parts.push(`${restante.dias} ${restante.dias === 1 ? 'día' : 'días'}`);
  if (restante.minutos > 0) parts.push(`${restante.minutos} ${restante.minutos === 1 ? 'minuto' : 'minutos'}`);
  if (restante.segundos > 0 || parts.length === 0)
    parts.push(`${restante.segundos} ${restante.segundos === 1 ? 'segundo' : 'segundos'}`);
  return parts.join(', ').replace(/, ([^,]+)$/, ' y $1');
}

/** Texto para 70%: "x días, x horas y x minutos". */
export function formatoRestante70(restante: TiempoRestante): string {
  const parts: string[] = [];
  if (restante.dias > 0) parts.push(`${restante.dias} ${restante.dias === 1 ? 'día' : 'días'}`);
  if (restante.horas > 0) parts.push(`${restante.horas} ${restante.horas === 1 ? 'hora' : 'horas'}`);
  if (restante.minutos > 0 || parts.length === 0)
    parts.push(`${restante.minutos} ${restante.minutos === 1 ? 'minuto' : 'minutos'}`);
  return parts.join(', ').replace(/, ([^,]+)$/, ' y $1');
}

/**
 * Construye el mensaje de notificación según el porcentaje.
 * @param porcentaje 50 | 70 | 100
 * @param nombreTramite Nombre/título del trámite
 * @param tiempoRestanteMs Tiempo restante en ms (solo para 50 y 70)
 */
export function mensajeNotificacionTiempo(
  porcentaje: PorcentajeNotificacion,
  nombreTramite: string,
  tiempoRestanteMs?: number
): string {
  const titulo = nombreTramite || 'Sin nombre';
  if (porcentaje === 100) {
    return `Has agotado el tiempo estimado en el tramite ${titulo}`;
  }
  const restante = msATiempoRestante(tiempoRestanteMs ?? 0);
  if (porcentaje === 50) {
    const resto = formatoRestante50(restante);
    return `Llevas la mitad del tiempo estimado en el tramite ${titulo}, solo te quedan ${resto}`;
  }
  if (porcentaje === 70) {
    const resto = formatoRestante70(restante);
    return `Casi se vence el plazo para el tramite ${titulo}, solo te quedan ${resto}`;
  }
  return `Trámite ${titulo}: ${porcentaje}% del tiempo.`;
}
