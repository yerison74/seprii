-- =============================================================================
-- SEPRI — Ajustar secuencias tras importar datos
-- =============================================================================
-- Requiere supabase-schema-completo.sql (función sepri_reset_secuencias).
-- Ejecutar DESPUÉS de node scripts/import-supabase-datos.mjs
-- =============================================================================

SELECT public.sepri_reset_secuencias();
