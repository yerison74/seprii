/** Código SIGEDE / identificador de obra en carga — mayúsculas, sin espacios laterales. */
export function normalizarCodigoObra(codigo?: string | null): string | null {
  const v = (codigo ?? '').trim().toUpperCase();
  return v || null;
}
