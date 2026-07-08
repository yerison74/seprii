/**
 * Índices de pestañas del sidebar en App.tsx (deben coincidir con `allTabs`).
 * Usados al navegar a rutas hijas y al volver con location.state.openTab.
 */
export const APP_TAB_INDEX = {
  DASHBOARD: 0,
  OBRAS: 1,
  TECHADO: 2,
  CARGA_OBRAS: 3,
  TRAMITES: 4,
  ATENCION_CONTRATISTA: 5,
  GESTION_TECNICA_DOCUMENTO: 6,
  REPORTE: 7,
  CONFIGURACION: 8,
} as const;
