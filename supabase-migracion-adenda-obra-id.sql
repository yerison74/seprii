-- Vincula cada adenda a una obra del contrato (opcional).
-- Ejecutar en Supabase → SQL Editor.

ALTER TABLE public.adenda
  ADD COLUMN IF NOT EXISTS obra_id text REFERENCES public.obras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_adenda_obra_id
  ON public.adenda(obra_id) WHERE obra_id IS NOT NULL;
