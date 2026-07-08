import { supabase } from '../lib/supabase';

export const obtenerUsuarios = async () => {
  const { data, error } = await supabase
    .from('usuarios_app')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
};

export const crearUsuario = async (data: any) => {
  const { error } = await supabase.from('usuarios_app').insert(data);
  if (error) throw error;
};

export const actualizarUsuario = async (id: string, data: any) => {
  const { error } = await supabase
    .from('usuarios_app')
    .update(data)
    .eq('id', id);
  if (error) throw error;
};

export const eliminarUsuario = async (id: string) => {
  const { error } = await supabase
    .from('usuarios_app')
    .delete()
    .eq('id', id);
  if (error) throw error;
};