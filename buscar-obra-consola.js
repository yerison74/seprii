/**
 * Script para ejecutar en la consola del navegador
 * Copia y pega este código en la consola de tu aplicación web
 * 
 * Este script busca la obra OB-2525 en Supabase y muestra todos sus detalles
 */

(async function buscarObraOB2525() {
  // Importar supabase (si está disponible globalmente) o usar el servicio
  // Ajusta esto según cómo tengas configurado tu proyecto
  
  console.log('🔍 Buscando obra OB-2525 en Supabase...\n');
  
  try {
    // Opción 1: Si tienes acceso directo a supabase
    // const { supabase } = await import('./src/lib/supabase');
    
    // Opción 2: Usar el servicio de obras
    const { obrasService } = await import('./src/services/supabaseService');
    
    // Buscar por código (ya que id_obra no existe)
    const resultado = await obrasService.obtenerObras({
      search: 'OB-2525',
      limit: 10
    });
    
    if (resultado.data && resultado.data.length > 0) {
      console.log(`✅ Encontradas ${resultado.data.length} obra(s):\n`);
      resultado.data.forEach((obra, index) => {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`OBRA ${index + 1}`);
        console.log('='.repeat(60));
        console.log('\n📋 DETALLES COMPLETOS:');
        console.log(JSON.stringify(obra, null, 2));
        console.log('\n📊 RESUMEN:');
        console.log(`  ID (interno): ${obra.id}`);
        console.log(`  Código: ${obra.codigo || 'N/A'}`);
        console.log(`  Nombre: ${obra.nombre || 'N/A'}`);
        console.log(`  Estado: ${obra.estado || 'N/A'}`);
        console.log(`  Responsable: ${obra.responsable || 'N/A'}`);
        console.log(`  Provincia: ${obra.provincia || 'N/A'}`);
        console.log(`  Municipio: ${obra.municipio || 'N/A'}`);
        console.log(`  Nivel: ${obra.nivel || 'N/A'}`);
        console.log(`  Fecha Inicio: ${obra.fecha_inicio || 'N/A'}`);
        console.log(`  Fecha Fin Estimada: ${obra.fecha_fin_estimada || 'N/A'}`);
        console.log(`  Fecha Inauguración: ${obra.fecha_inauguracion || 'N/A'}`);
        console.log(`  Descripción: ${obra.descripcion || 'N/A'}`);
        console.log(`  Latitud: ${obra.latitud || 'N/A'}`);
        console.log(`  Longitud: ${obra.longitud || 'N/A'}`);
        console.log(`  Created At: ${obra.created_at || 'N/A'}`);
        console.log(`  Updated At: ${obra.updated_at || 'N/A'}`);
      });
    } else {
      console.log('❌ No se encontró ninguna obra con ID OB-2525');
      console.log('\n💡 Intentando búsqueda más amplia...');
      
      // Buscar solo por "2525"
      const resultadoAmplio = await obrasService.obtenerObras({
        search: '2525',
        limit: 20
      });
      
      if (resultadoAmplio.data && resultadoAmplio.data.length > 0) {
        console.log(`\n✅ Encontradas ${resultadoAmplio.data.length} obra(s) que contienen "2525":\n`);
        resultadoAmplio.data.forEach((obra, index) => {
          console.log(`  ${index + 1}. ID: ${obra.id} | Código: ${obra.codigo || 'N/A'} | Nombre: ${obra.nombre?.substring(0, 50) || 'N/A'}`);
        });
      }
    }
    
    console.log('\n✅ Búsqueda completada');
    
  } catch (error) {
    console.error('❌ Error al buscar obra:', error);
    console.error('Detalles:', error.message);
  }
})();
