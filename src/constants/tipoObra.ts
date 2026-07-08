/** Valor de obras.tipo_obra para planteles del programa Techado. */
export const TIPO_OBRA_TECHADOS = 'Techados';

export const TIPO_OBRA_OPCIONES = ['Construccion', 'Mantenimiento', TIPO_OBRA_TECHADOS] as const;

export function esTipoObraTechados(tipo?: string | null): boolean {
  return (tipo ?? '').trim().toLowerCase() === TIPO_OBRA_TECHADOS.toLowerCase();
}
