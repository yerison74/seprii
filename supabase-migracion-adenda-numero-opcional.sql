-- Permite adendas sin número (campo opcional).
-- Ejecutar en Supabase → SQL Editor.

ALTER TABLE public.adenda
  ALTER COLUMN numero_adenda DROP NOT NULL;
