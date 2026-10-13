-- Migración: rrhh_vacaciones
-- Convención: tablas RRHH inician con "rrhh_"
-- Relación: rrhh_vacaciones.colaborador_id -> rrhh_colaboradores(id)

CREATE TABLE IF NOT EXISTS public.rrhh_vacaciones (
  id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  colaborador_id  text NOT NULL
                    REFERENCES public.rrhh_colaboradores(id)
                    ON DELETE CASCADE,
  fecha_inicio    date NOT NULL,
  fecha_fin       date NOT NULL,
  dias            integer NOT NULL CHECK (dias > 0),
  estado          text NOT NULL DEFAULT 'Pendiente'
                    CHECK (estado IN ('Pendiente', 'Aprobada', 'Rechazada')),
  observaciones   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rrhh_vacaciones_rango_ok CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS rrhh_vacaciones_colaborador_idx
  ON public.rrhh_vacaciones (colaborador_id);
CREATE INDEX IF NOT EXISTS rrhh_vacaciones_fecha_inicio_idx
  ON public.rrhh_vacaciones (fecha_inicio);
CREATE INDEX IF NOT EXISTS rrhh_vacaciones_estado_idx
  ON public.rrhh_vacaciones (estado);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.rrhh_vacaciones TO anon, authenticated;
ALTER TABLE public.rrhh_vacaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rrhh_vacaciones_anon_select ON public.rrhh_vacaciones;
DROP POLICY IF EXISTS rrhh_vacaciones_anon_insert ON public.rrhh_vacaciones;
DROP POLICY IF EXISTS rrhh_vacaciones_anon_update ON public.rrhh_vacaciones;
DROP POLICY IF EXISTS rrhh_vacaciones_anon_delete ON public.rrhh_vacaciones;
DROP POLICY IF EXISTS rrhh_vacaciones_auth_all ON public.rrhh_vacaciones;

CREATE POLICY rrhh_vacaciones_anon_select
  ON public.rrhh_vacaciones FOR SELECT TO anon USING (true);
CREATE POLICY rrhh_vacaciones_anon_insert
  ON public.rrhh_vacaciones FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY rrhh_vacaciones_anon_update
  ON public.rrhh_vacaciones FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY rrhh_vacaciones_anon_delete
  ON public.rrhh_vacaciones FOR DELETE TO anon USING (true);
CREATE POLICY rrhh_vacaciones_auth_all
  ON public.rrhh_vacaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
