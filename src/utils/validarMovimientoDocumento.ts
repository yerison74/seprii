import type { MovimientoDocumentoTecnicoObra } from '../types/database';

export interface MovimientoDocumentoInput {
  fecha_solicitud?: string | null;
  fecha_entrada?: string | null;
  fecha_salida?: string | null;
  no_tramite?: string | null;
  departamento?: string | null;
  oficio?: string | null;
  estatus?: string | null;
}

type RangoFechas = { inicio: string; fin: string };

function normalizarFecha(fecha?: string | null): string | null {
  if (!fecha) return null;
  const d = fecha.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null;
}

/** Rango [entrada, salida]; salida ausente = mismo día que entrada. */
export function rangoMovimiento(mov: MovimientoDocumentoInput): RangoFechas | null {
  const entrada = normalizarFecha(mov.fecha_entrada);
  if (!entrada) return null;
  const salida = normalizarFecha(mov.fecha_salida) || entrada;
  if (salida < entrada) return null;
  return { inicio: entrada, fin: salida };
}

/**
 * Validación mínima: solo coherencia entrada/salida cuando ambas están presentes.
 * Ningún campo es obligatorio; el trámite puede repetirse para agrupar movimientos.
 */
export function validarMovimientoDocumento(
  _existentes: MovimientoDocumentoTecnicoObra[],
  nuevo: MovimientoDocumentoInput,
  _excluirId?: string,
): string | null {
  const entrada = normalizarFecha(nuevo.fecha_entrada);
  const salida = normalizarFecha(nuevo.fecha_salida);
  if (entrada && salida && salida < entrada) {
    return 'La fecha de salida no puede ser anterior a la fecha de entrada.';
  }
  return null;
}

/** Orden cronológico: más antiguo primero (por entrada, luego salida). */
export function ordenarMovimientosDocumento(
  movimientos: MovimientoDocumentoTecnicoObra[],
): MovimientoDocumentoTecnicoObra[] {
  return [...movimientos].sort((a, b) => {
    const claveA = claveOrdenMovimiento(a);
    const claveB = claveOrdenMovimiento(b);
    if (claveA !== claveB) return claveA.localeCompare(claveB);
    return (a.no_tramite || '').localeCompare(b.no_tramite || '', 'es');
  });
}

function claveOrdenMovimiento(mov: MovimientoDocumentoTecnicoObra): string {
  const rango = rangoMovimiento(mov);
  if (rango) return `${rango.inicio}|${rango.fin}`;
  const fallback =
    normalizarFecha(mov.fecha_entrada) ||
    normalizarFecha(mov.fecha_solicitud) ||
    normalizarFecha(mov.created_at);
  return fallback ? `${fallback}|${fallback}` : '9999-99-99|9999-99-99';
}
