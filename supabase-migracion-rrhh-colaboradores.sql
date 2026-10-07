-- Migración: rrhh_colaboradores + identificacion en usuarios_app
-- Convención: tablas RRHH inician con "rrhh_"
-- Relación opcional: rrhh_colaboradores.usuario_app_id -> usuarios_app(id)

ALTER TABLE public.usuarios_app
  ADD COLUMN IF NOT EXISTS identificacion text;

CREATE UNIQUE INDEX IF NOT EXISTS usuarios_app_identificacion_unique
  ON public.usuarios_app (identificacion)
  WHERE identificacion IS NOT NULL AND btrim(identificacion) <> '';

CREATE TABLE IF NOT EXISTS public.rrhh_colaboradores (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nombre          text NOT NULL,
  identificacion  text NOT NULL,
  cargo           text,
  departamento    text,
  telefono        text,
  correo          text,
  direccion       text,
  estado          text NOT NULL DEFAULT 'Activo'
                    CHECK (estado IN ('Activo', 'Inactivo')),
  usuario_app_id  text NULL
                    REFERENCES public.usuarios_app(id)
                    ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rrhh_colaboradores_identificacion_unique UNIQUE (identificacion),
  CONSTRAINT rrhh_colaboradores_usuario_app_unique UNIQUE (usuario_app_id)
);

CREATE INDEX IF NOT EXISTS rrhh_colaboradores_nombre_idx
  ON public.rrhh_colaboradores (nombre);

CREATE INDEX IF NOT EXISTS rrhh_colaboradores_estado_idx
  ON public.rrhh_colaboradores (estado);

CREATE INDEX IF NOT EXISTS rrhh_colaboradores_departamento_idx
  ON public.rrhh_colaboradores (departamento);

-- RLS alineado a SEPRI (app con clave anon, sin Supabase Auth)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rrhh_colaboradores TO anon, authenticated;
ALTER TABLE public.rrhh_colaboradores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rrhh_colaboradores_anon_select ON public.rrhh_colaboradores;
DROP POLICY IF EXISTS rrhh_colaboradores_anon_insert ON public.rrhh_colaboradores;
DROP POLICY IF EXISTS rrhh_colaboradores_anon_update ON public.rrhh_colaboradores;
DROP POLICY IF EXISTS rrhh_colaboradores_anon_delete ON public.rrhh_colaboradores;
DROP POLICY IF EXISTS rrhh_colaboradores_auth_all ON public.rrhh_colaboradores;

CREATE POLICY rrhh_colaboradores_anon_select
  ON public.rrhh_colaboradores FOR SELECT TO anon USING (true);
CREATE POLICY rrhh_colaboradores_anon_insert
  ON public.rrhh_colaboradores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY rrhh_colaboradores_anon_update
  ON public.rrhh_colaboradores FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY rrhh_colaboradores_anon_delete
  ON public.rrhh_colaboradores FOR DELETE TO anon USING (true);
CREATE POLICY rrhh_colaboradores_auth_all
  ON public.rrhh_colaboradores FOR ALL TO authenticated USING (true) WITH CHECK (true);
