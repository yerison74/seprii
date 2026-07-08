/**
 * Script de prueba para verificar que el Dashboard funciona con Supabase
 * Ejecuta este archivo en la consola del navegador o como función de prueba
 */

import { statsAPI } from '../services/api';

export const testDashboardAPI = async () => {
  console.log('🔍 Probando API del Dashboard...');

  try {
    // Test 1: Obtener resumen del dashboard
    console.log('📊 Obteniendo resumen del dashboard...');
    const response = await statsAPI.obtenerResumenDashboard();
    
    const stats = response.data.data;
    
    console.log('✅ Respuesta recibida:', stats);
    
    // Verificar estructura esperada
    const checks = {
      'Tiene estadisticas': !!stats.estadisticas,
      'Tiene totalObras': !!stats.estadisticas?.totalObras,
      'Tiene porEstado': Array.isArray(stats.estadisticas?.porEstado),
      'Tiene obrasProximasInaugurar': Array.isArray(stats.obrasProximasInaugurar),
      'Tiene obrasPorResponsable': Array.isArray(stats.obrasPorResponsable),
    };
    
    console.log('📋 Verificación de estructura:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`  ${passed ? '✅' : '❌'} ${check}`);
    });
    
    // Mostrar datos
    console.log('\n📈 Datos del Dashboard:');
    console.log(`  Total de obras: ${stats.estadisticas?.totalObras || 0}`);
    console.log(`  Estados encontrados: ${stats.estadisticas?.porEstado?.length || 0}`);
    console.log(`  Obras próximas a inaugurar: ${stats.obrasProximasInaugurar?.length || 0}`);
    console.log(`  Responsables únicos: ${stats.obrasPorResponsable?.length || 0}`);
    
    if (stats.estadisticas?.porEstado) {
      console.log('\n📊 Distribución por estado:');
      stats.estadisticas.porEstado.forEach((item: any) => {
        console.log(`  - ${item.estado}: ${item.cantidad}`);
      });
    }
    
    if (stats.obrasPorResponsable && stats.obrasPorResponsable.length > 0) {
      console.log('\n👥 Top 5 Responsables:');
      stats.obrasPorResponsable.slice(0, 5).forEach((item: any) => {
        console.log(`  - ${item.responsable}: ${item.cantidad} obras`);
      });
    }
    
    // Verificar que todos los checks pasaron
    const allPassed = Object.values(checks).every(check => check === true);
    
    if (allPassed) {
      console.log('\n🎉 ¡Todas las pruebas pasaron! El Dashboard está funcionando correctamente con Supabase.');
      return true;
    } else {
      console.log('\n⚠️  Algunas verificaciones fallaron. Revisa la estructura de datos.');
      return false;
    }
  } catch (error: any) {
    console.error('❌ Error al probar el Dashboard:', error);
    console.log('💡 Posibles causas:');
    console.log('   1. Las tablas no están creadas en Supabase');
    console.log('   2. Las políticas RLS están bloqueando el acceso');
    console.log('   3. Las credenciales en .env son incorrectas');
    console.log('   4. No hay datos en la base de datos');
    return false;
  }
};

// Función para probar desde la consola del navegador
if (typeof window !== 'undefined') {
  (window as any).testDashboard = testDashboardAPI;
  console.log('💡 Ejecuta testDashboard() en la consola para probar el Dashboard');
}
