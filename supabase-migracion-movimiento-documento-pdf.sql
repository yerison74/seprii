-- PDF opcional en movimientos de gestión técnica de documento.
-- Ejecutar en Supabase → SQL Editor.

ALTER TABLE public.movimiento_documentos_tecnicos_obra
  ADD COLUMN IF NOT EXISTS archivo_pdf text,
  ADD COLUMN IF NOT EXISTS nombre_archivo text;
