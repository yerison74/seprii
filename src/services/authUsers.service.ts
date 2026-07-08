import { supabase } from '../lib/supabase';

// Lee usuarios de Supabase Auth a través de la VIEW
export const obtenerUsuariosAuth = async () => {
  const { data, error } = await supabase
    .from('vista_usuarios_auth')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};