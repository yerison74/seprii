import type { Obra } from '../types/database';

/** Identificador SIGEDE de una obra (código del plantel, no el distrito regional). */
export function idSigedeObra(obra: Pick<Obra, 'codigo'>): string | null {
  const codigo = (obra.codigo || '').trim();
  return codigo || null;
}

/** Identificadores SIGEDE asociados a una obra (código y/o distrito MINERD). */
export function sigedesDeObra(
  obra: Pick<Obra, 'codigo' | 'distrito_minerd_sigede'>,
): string[] {
  return Array.from(
    new Set(
      [obra.codigo, obra.distrito_minerd_sigede]
        .map((v) => (v || '').trim())
        .filter(Boolean),
    ),
  );
}
