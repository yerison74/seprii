import { supabase } from '../lib/supabase';

export async function loginUsuario(usuario: string, password: string) {
  const valor = usuario.trim();
  if (!valor || !password) {
    throw new Error('Ingresa usuario y contraseña');
  }

  const { data: rows, error } = await supabase
    .from('usuarios_app')
    .select('*')
    .ilike('usuario', valor);

  if (error) {
    if (error.message?.includes('does not exist')) {
      throw new Error(
        'La tabla usuarios_app no existe. Ejecuta supabase-schema-completo.sql en Supabase.',
      );
    }
    throw new Error(`Error de base de datos: ${error.message}`);
  }

  const lista = rows || [];
  if (lista.length === 0) {
    throw new Error(
      'No se pudo leer usuarios_app desde la app (RLS o usuario inexistente). Ejecuta supabase-schema-completo.sql en Supabase.',
    );
  }

  const data = lista.find((u) => String(u.password ?? '') === password);
  if (!data) {
    throw new Error('Contraseña incorrecta');
  }

  if (data.activo === false) {
    throw new Error('Usuario inactivo. Contacta al administrador.');
  }

  return data;
}
