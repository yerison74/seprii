-- Vincula documentos técnicos al catálogo de contratos (Techado).
-- Ejecutar en Supabase → SQL Editor si aparece:
-- "Could not find a relationship between 'documentos_tecnicos_obra' and 'contrato_id'"

ALTER TABLE public.documentos_tecnicos_obra
  ADD COLUMN IF NOT EXISTS contrato_id text REFERENCES public.contrato(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_documentos_tecnicos_contrato_id
  ON public.documentos_tecnicos_obra(contrato_id);
