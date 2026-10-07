/**
 * Botones RRHH — Tailwind exclusivo.
 * Moderno / contemporáneo / minimalista: sin bordes gruesos ni look tradicional.
 */

const BASE =
  'inline-flex items-center justify-center gap-2 select-none font-medium tracking-tight outline-none transition-all duration-200 disabled:opacity-45 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-blue-400/30 focus-visible:ring-offset-1';

/** Principal — azul sólido, texto blanco, sin borde, sombra azul muy ligera */
export const BTN_PRIMARY = [
  BASE,
  'h-10 px-5 rounded-lg border-0 bg-blue-600 text-white text-sm',
  'shadow-[0_1px_2px_rgba(37,99,235,0.18),0_4px_12px_-2px_rgba(37,99,235,0.22)]',
  'hover:bg-blue-700 hover:shadow-[0_2px_8px_-1px_rgba(37,99,235,0.28)]',
  'active:bg-blue-800',
].join(' ');

/** Secundario — blanco o slate-50, borde muy sutil, sombra suave */
export const BTN_SECONDARY = [
  BASE,
  'h-10 px-5 rounded-lg border border-slate-200/80 bg-white text-slate-700 text-sm shadow-sm',
  'hover:bg-slate-50 hover:border-slate-200 hover:shadow',
  'active:bg-slate-100',
].join(' ');

/** Secundario soft — fondo slate-50 */
export const BTN_SOFT = [
  BASE,
  'h-10 px-5 rounded-lg border border-slate-200/60 bg-slate-50 text-slate-700 text-sm shadow-sm',
  'hover:bg-slate-100 hover:border-slate-200',
  'active:bg-slate-200/70',
].join(' ');

/** Ghost — sin caja */
export const BTN_GHOST = [
  BASE,
  'h-10 px-4 rounded-lg border-0 bg-transparent text-slate-600 text-sm',
  'hover:bg-slate-50 hover:text-slate-900',
  'active:bg-slate-100',
].join(' ');

/**
 * Acciones de fila (editar, menú):
 * cuadrados pequeños, rounded-lg, fondo slate-50, solo icono.
 */
export const BTN_ICON = [
  BASE,
  'h-8 w-8 rounded-lg border-0 bg-slate-50 text-slate-500 shadow-sm',
  'hover:bg-slate-100 hover:text-slate-700',
  'active:bg-slate-200/80',
].join(' ');

export const BTN_ICON_ACCENT = [
  BASE,
  'h-8 w-8 rounded-lg border-0 bg-slate-50 text-blue-600 shadow-sm',
  'hover:bg-blue-50 hover:text-blue-700',
  'active:bg-blue-100/80',
].join(' ');

/** Nav compacta (calendario) — mismo lenguaje secundario */
export const BTN_NAV = [
  BASE,
  'h-8 w-8 rounded-lg border border-slate-200/80 bg-white text-slate-500 shadow-sm',
  'hover:bg-slate-50 hover:text-slate-800',
  'active:bg-slate-100',
].join(' ');

/** Filtro lateral — sin caja pesada */
export const BTN_FILTER = [
  BASE,
  'w-full justify-start gap-2.5 px-2.5 py-2 rounded-lg border-0 text-sm',
].join(' ');

export const BTN_FILTER_ACTIVE = 'bg-blue-50 text-blue-700';
export const BTN_FILTER_IDLE = 'bg-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900';
