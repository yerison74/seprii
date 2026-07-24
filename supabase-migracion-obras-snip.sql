-- Campo SNIP en obras (antes de envio_snip).
-- Ejecutar en Supabase → SQL Editor.

ALTER TABLE public.obras
  ADD COLUMN IF NOT EXISTS snip varchar(100);
