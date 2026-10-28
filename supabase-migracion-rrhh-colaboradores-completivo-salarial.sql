-- Completivo salarial en rrhh_colaboradores
ALTER TABLE public.rrhh_colaboradores
  ADD COLUMN IF NOT EXISTS completivo_salarial numeric(14, 2);

COMMENT ON COLUMN public.rrhh_colaboradores.completivo_salarial IS 'Completivo salarial en pesos dominicanos';
