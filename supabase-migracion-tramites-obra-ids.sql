-- =============================================================================
-- SEPRI — tramites.obra_ids: obras sin SIGEDE (mantenimiento) vinculadas
-- =============================================================================
-- Ejecutar en Supabase → SQL Editor

ALTER TABLE public.tramites
  ADD COLUMN IF NOT EXISTS obra_ids text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.tramites.obra_ids IS
  'Ids internos de obras sin SIGEDE (MT-xxxx / OB-xxxx) vinculadas al trámite.';

CREATE INDEX IF NOT EXISTS idx_tramites_obra_ids_gin
  ON public.tramites USING gin (obra_ids);
