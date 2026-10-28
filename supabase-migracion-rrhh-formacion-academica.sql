-- Formación académica de colaboradores
-- Convención: tablas RRHH inician con "rrhh_"

CREATE TABLE IF NOT EXISTS public.rrhh_formacion_academica (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  colaborador_id  text NOT NULL
                    REFERENCES public.rrhh_colaboradores(id)
                    ON DELETE CASCADE,
  nivel           text NOT NULL,
  institucion     text NOT NULL,
  -- Solo mes y año: formato YYYY-MM
  fecha_inicio    text,
  fecha_fin       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rrhh_formacion_academica_rango_ok
    CHECK (fecha_fin IS NULL OR fecha_inicio IS NULL OR fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS rrhh_formacion_academica_colaborador_idx
  ON public.rrhh_formacion_academica (colaborador_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rrhh_formacion_academica TO anon, authenticated;
ALTER TABLE public.rrhh_formacion_academica ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rrhh_formacion_anon_select ON public.rrhh_formacion_academica;
DROP POLICY IF EXISTS rrhh_formacion_anon_insert ON public.rrhh_formacion_academica;
DROP POLICY IF EXISTS rrhh_formacion_anon_update ON public.rrhh_formacion_academica;
DROP POLICY IF EXISTS rrhh_formacion_anon_delete ON public.rrhh_formacion_academica;
DROP POLICY IF EXISTS rrhh_formacion_auth_all ON public.rrhh_formacion_academica;

CREATE POLICY rrhh_formacion_anon_select
  ON public.rrhh_formacion_academica FOR SELECT TO anon USING (true);
CREATE POLICY rrhh_formacion_anon_insert
  ON public.rrhh_formacion_academica FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY rrhh_formacion_anon_update
  ON public.rrhh_formacion_academica FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY rrhh_formacion_anon_delete
  ON public.rrhh_formacion_academica FOR DELETE TO anon USING (true);
CREATE POLICY rrhh_formacion_auth_all
  ON public.rrhh_formacion_academica FOR ALL TO authenticated USING (true) WITH CHECK (true);
