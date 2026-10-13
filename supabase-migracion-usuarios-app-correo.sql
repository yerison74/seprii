-- Separar correo de contacto del nombre de usuario (login)
ALTER TABLE public.usuarios_app
  ADD COLUMN IF NOT EXISTS correo text;

COMMENT ON COLUMN public.usuarios_app.usuario IS 'Nombre de usuario para inicio de sesión';
COMMENT ON COLUMN public.usuarios_app.correo IS 'Correo de contacto (independiente del login)';
