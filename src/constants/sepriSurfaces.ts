/**
 * Superficies SEPRI — cards, paneles y listas (alineado con App, Obras y Notificaciones).
 * Profundidad por sombra; bordes cálidos muy suaves solo donde el shell principal los usa.
 */

/** Tarjeta / panel elevado */
export const SEPRI_CARD =
  'bg-white rounded-2xl shadow-soft';

/** Tarjeta con más elevación (listas, acordeones) */
export const SEPRI_CARD_RAISED =
  'bg-white rounded-2xl shadow-soft-lg';

/** Contenedor interior sin borde duro */
export const SEPRI_INSET =
  'bg-warm-50/80 rounded-xl shadow-soft';

/** Ítem de lista (estilo Gestión de Obras) */
export const SEPRI_LIST_ITEM =
  'bg-white rounded-xl shadow-soft p-3 sm:p-4 transition-all duration-200 cursor-pointer hover:shadow-soft-lg';

export const SEPRI_LIST_ITEM_ACTIVE =
  'bg-primary-light/40 shadow-soft-lg';

/** Cabecera de panel — sin caja gris ni borde */
export const SEPRI_PANEL_HEADER =
  'flex items-center gap-3 px-4 py-3.5 shrink-0 bg-white';

/** Botón toggle de acordeón — reset navegador (preflight off) */
export const SEPRI_ACCORDION_BTN =
  'flex-1 flex items-center gap-2 min-w-0 text-left border-0 bg-transparent p-0 m-0 shadow-none outline-none cursor-pointer appearance-none';

/** Badge contador */
export const SEPRI_BADGE =
  'text-[10px] font-semibold text-slate-400 bg-warm-100/90 px-2 py-0.5 rounded-full tabular-nums shadow-soft';

/** Input / select con elevación suave */
export const SEPRI_FIELD_SHADOW =
  'shadow-soft focus:shadow-[0_0_0_3px_rgba(66,165,245,0.12),0_2px_8px_-2px_rgba(15,23,42,0.06)]';
