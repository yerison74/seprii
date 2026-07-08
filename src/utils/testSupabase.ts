/**
 * Script de prueba para verificar la conexión con Supabase
 * Ejecuta este archivo en la consola del navegador o como función de prueba
 */

import { supabase } from '../lib/supabase';

export const testSupabaseConnection = async () => {
  console.log('🔍 Probando conexión con Supabase...');

  try {
    // Test 1: Verificar que el cliente se creó correctamente
    console.log('✅ Cliente de Supabase inicializado');

    // Test 2: Intentar una consulta simple a la tabla obras
    const { data, error, count } = await supabase
      .from('obras')
      .select('*', { count: 'exact' })
      .limit(1);

    if (error) {
      console.error('❌ Error al consultar obras:', error);
      console.log('💡 Asegúrate de que:');
      console.log('   1. Las tablas están creadas en Supabase');
      console.log('   2. Las políticas RLS están configuradas correctamente');
      console.log('   3. Las credenciales en .env son correctas');
      return false;
    }

    console.log(`✅ Conexión exitosa! Encontradas ${count || 0} obras`);
    console.log('📊 Datos de prueba:', data);

    // Test 3: Verificar otras tablas
    const tables = ['tramites', 'historial_estados', 'movimientos_tramites', 'historial_uploads'];
    
    for (const table of tables) {
      const { error: tableError } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (tableError) {
        console.warn(`⚠️  Advertencia: No se pudo acceder a la tabla ${table}:`, tableError.message);
      } else {
        console.log(`✅ Tabla ${table} accesible`);
      }
    }

    console.log('🎉 Todas las pruebas completadas!');
    return true;
  } catch (error: any) {
    console.error('❌ Error general:', error);
    return false;
  }
};

// Función para probar desde la consola del navegador
if (typeof window !== 'undefined') {
  (window as any).testSupabase = testSupabaseConnection;
  console.log('💡 Ejecuta testSupabase() en la consola para probar la conexión');
}
