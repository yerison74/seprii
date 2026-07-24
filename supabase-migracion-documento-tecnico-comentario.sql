-- Comentarios y evidencia PDF para documentos técnicos y adendas.
-- Ejecutar en Supabase → SQL Editor (completo, incluye permisos RLS).

CREATE TABLE IF NOT EXISTS public.documento_tecnico_comentario (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  documento_id   uuid NOT NULL
                   REFERENCES public.documentos_tecnicos_obra(id) ON DELETE CASCADE,
  adenda_id      uuid
                   REFERENCES public.adenda(id) ON DELETE CASCADE,
  comentario     text NOT NULL,
  usuario        text NOT NULL,
  archivo_pdf    text,
  nombre_archivo text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT documento_tecnico_comentario_texto_chk
    CHECK (length(trim(comentario)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_gt_comentario_documento
  ON public.documento_tecnico_comentario(documento_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gt_comentario_adenda
  ON public.documento_tecnico_comentario(adenda_id, created_at DESC)
  WHERE adenda_id IS NOT NULL;

-- Permisos + RLS (anon key de la app)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documento_tecnico_comentario TO anon, authenticated;

ALTER TABLE public.documento_tecnico_comentario ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documento_tecnico_comentario_anon_select ON public.documento_tecnico_comentario;
DROP POLICY IF EXISTS documento_tecnico_comentario_anon_insert ON public.documento_tecnico_comentario;
DROP POLICY IF EXISTS documento_tecnico_comentario_anon_update ON public.documento_tecnico_comentario;
DROP POLICY IF EXISTS documento_tecnico_comentario_anon_delete ON public.documento_tecnico_comentario;
DROP POLICY IF EXISTS documento_tecnico_comentario_auth_all ON public.documento_tecnico_comentario;

CREATE POLICY documento_tecnico_comentario_anon_select
  ON public.documento_tecnico_comentario FOR SELECT TO anon USING (true);
CREATE POLICY documento_tecnico_comentario_anon_insert
  ON public.documento_tecnico_comentario FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY documento_tecnico_comentario_anon_update
  ON public.documento_tecnico_comentario FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY documento_tecnico_comentario_anon_delete
  ON public.documento_tecnico_comentario FOR DELETE TO anon USING (true);
CREATE POLICY documento_tecnico_comentario_auth_all
  ON public.documento_tecnico_comentario FOR ALL TO authenticated USING (true) WITH CHECK (true);
