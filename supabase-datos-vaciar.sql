-- =============================================================================
-- SEPRI — Vaciar solo DATOS (no elimina tablas ni esquema)
-- =============================================================================
-- Requiere haber ejecutado supabase-schema-completo.sql (funciones sepri_*).
--
-- Flujo típico de reimportación:
--   1) Este script
--   2) import (scripts/import-supabase-datos.mjs o pg_restore)
--   3) supabase-datos-secuencias.sql
--
-- NO borra archivos del bucket storage "documentos".
-- =============================================================================

TRUNCATE TABLE
  public.notificacion_leida,
  public.notificaciones_tiempo,
  public.tiempo_en_area,
  public.movimiento_documentos_tecnicos_obra,
  public.documentos_tecnicos_obra,
  public.matriz_general,
  public.contrato_adenda,
  public.adenda,
  public.contrato,
  public.contratista_access_tokens,
  public.movimientos_solicitud_contratista,
  public.formulario_contratista,
  public.movimientos_tramites,
  public.historial_uploads,
  public.tramites,
  public.historial_estados,
  public.obras,
  public.contratistas,
  public.area,
  public.usuarios_app
RESTART IDENTITY CASCADE;

SELECT public.sepri_seed_catalogos();
