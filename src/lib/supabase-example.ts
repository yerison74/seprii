/**
 * Ejemplo de uso de Supabase
 * 
 * Este archivo muestra cómo usar el cliente de Supabase en tus componentes.
 * Puedes eliminar este archivo una vez que hayas integrado Supabase en tu aplicación.
 */

import { supabase } from './supabase';

// Ejemplo 1: Consultar datos (SELECT)
export const ejemploConsultarObras = async () => {
  try {
    const { data, error } = await supabase
      .from('obras') // Reemplaza 'obras' con el nombre de tu tabla en Supabase
      .select('*')
      .limit(10);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al consultar obras:', error);
    throw error;
  }
};

// Ejemplo 2: Insertar datos (INSERT)
export const ejemploInsertarObra = async (obra: any) => {
  try {
    const { data, error } = await supabase
      .from('obras')
      .insert([obra])
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al insertar obra:', error);
    throw error;
  }
};

// Ejemplo 3: Actualizar datos (UPDATE)
export const ejemploActualizarObra = async (id: number, updates: any) => {
  try {
    const { data, error } = await supabase
      .from('obras')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al actualizar obra:', error);
    throw error;
  }
};

// Ejemplo 4: Eliminar datos (DELETE)
export const ejemploEliminarObra = async (id: number) => {
  try {
    const { error } = await supabase
      .from('obras')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error al eliminar obra:', error);
    throw error;
  }
};

// Ejemplo 5: Consulta con filtros
export const ejemploConsultarObrasConFiltros = async (filtros: {
  estado?: string;
  responsable?: string;
  search?: string;
}) => {
  try {
    let query = supabase.from('obras').select('*');

    if (filtros.estado) {
      query = query.eq('estado', filtros.estado);
    }

    if (filtros.responsable) {
      query = query.eq('responsable', filtros.responsable);
    }

    if (filtros.search) {
      query = query.or(`nombre.ilike.%${filtros.search}%,codigo.ilike.%${filtros.search}%`);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al consultar obras con filtros:', error);
    throw error;
  }
};

// Ejemplo 6: Subir archivo a Storage
export const ejemploSubirArchivo = async (file: File, path: string) => {
  try {
    const { data, error } = await supabase.storage
      .from('documentos') // Reemplaza 'uploads' con el nombre de tu bucket
      .upload(path, file);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error al subir archivo:', error);
    throw error;
  }
};

// Ejemplo 7: Obtener URL pública de un archivo
export const ejemploObtenerUrlArchivo = (bucket: string, path: string) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
};

// Ejemplo 8: Suscripción en tiempo real (Realtime)
export const ejemploSuscripcionTiempoReal = (callback: (payload: any) => void) => {
  const subscription = supabase
    .channel('obras-changes')
    .on('postgres_changes', 
      { event: '*', schema: 'public', table: 'obras' },
      callback
    )
    .subscribe();

  // Para desuscribirse:
  // return () => {
  //   supabase.removeChannel(subscription);
  // };
  
  return subscription;
};
