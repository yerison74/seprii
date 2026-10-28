-- Datos laborales adicionales en rrhh_colaboradores
ALTER TABLE public.rrhh_colaboradores
  ADD COLUMN IF NOT EXISTS fecha_ingreso date,
  ADD COLUMN IF NOT EXISTS salario numeric(14, 2);

COMMENT ON COLUMN public.rrhh_colaboradores.fecha_ingreso IS 'Fecha de ingreso laboral del colaborador';
COMMENT ON COLUMN public.rrhh_colaboradores.salario IS 'Salario del colaborador';
