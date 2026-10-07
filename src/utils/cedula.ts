/**
 * Cédula dominicana: 11 dígitos → 000-0000000-0
 */

export function cedulaSoloDigitos(value: string | null | undefined): string {
  return String(value || '')
    .replace(/\D/g, '')
    .slice(0, 11);
}

/** Formatea mientras se escribe (solo acepta dígitos en la práctica). */
export function formatearCedulaInput(value: string | null | undefined): string {
  const d = cedulaSoloDigitos(value);
  if (d.length <= 3) return d;
  if (d.length <= 10) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 10)}-${d.slice(10, 11)}`;
}

export function esCedulaCompleta(value: string | null | undefined): boolean {
  return cedulaSoloDigitos(value).length === 11;
}

/** Valor canónico para guardar/buscar: 000-0000000-0 o '' si vacío. */
export function normalizarCedula(value: string | null | undefined): string {
  const d = cedulaSoloDigitos(value);
  if (!d) return '';
  if (d.length !== 11) return formatearCedulaInput(d);
  return formatearCedulaInput(d);
}

export function mensajeCedulaInvalida(value: string | null | undefined): string | null {
  const d = cedulaSoloDigitos(value);
  if (!d) return null;
  if (d.length !== 11) {
    return 'La cédula debe tener 11 dígitos (formato 000-0000000-0).';
  }
  return null;
}
