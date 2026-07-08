/**
 * Script para buscar la obra OB-2525 en Supabase
 * Ejecutar con: node buscar-obra.js
 */

// Nota: Necesitas tener las variables de entorno configuradas
// o puedes reemplazar directamente las URLs y keys aquí

const { createClient } = require('@supabase/supabase-js');

// Obtener credenciales de Supabase desde variables de entorno
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://tdihavrizkkbfpttbkyp.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'TU_ANON_KEY_AQUI';

if (!supabaseAnonKey || supabaseAnonKey === 'TU_ANON_KEY_AQUI') {
  console.error('⚠️  Por favor, configura REACT_APP_SUPABASE_ANON_KEY en las variables de entorno');
  console.error('   O edita este script y reemplaza TU_ANON_KEY_AQUI con tu clave');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function buscarObra() {
  const idBuscado = 'OB-2525';
  console.log(`\n🔍 Buscando obra con ID: ${idBuscado}\n`);
  
  try {
    // Buscar en el campo codigo (ya que id_obra no existe)
    console.log('1️⃣ Buscando en campo "codigo"...');
    let { data: obrasPorCodigo, error: errorCodigo } = await supabase
      .from('obras')
      .select('*')
      .eq('codigo', idBuscado)
      .limit(5);
    
    if (errorCodigo) {
      console.error('❌ Error al buscar por codigo:', errorCodigo);
    } else if (obrasPorCodigo && obrasPorCodigo.length > 0) {
      console.log(`✅ Encontradas ${obrasPorCodigo.length} obra(s) por codigo:`);
      obrasPorCodigo.forEach((obra, index) => {
        console.log(`\n--- Obra ${index + 1} ---`);
        console.log(JSON.stringify(obra, null, 2));
      });
    } else {
      console.log('❌ No se encontró ninguna obra con codigo =', idBuscado);
    }
    
    // Buscar con LIKE en codigo (por si tiene variaciones)
    console.log('\n2️⃣ Buscando en campo "codigo" con LIKE...');
    let { data: obrasPorCodigoLike, error: errorCodigoLike } = await supabase
      .from('obras')
      .select('*')
      .ilike('codigo', `%${idBuscado}%`)
      .limit(5);
    
    if (errorCodigoLike) {
      console.error('❌ Error al buscar por codigo (LIKE):', errorCodigoLike);
    } else if (obrasPorCodigoLike && obrasPorCodigoLike.length > 0) {
      console.log(`✅ Encontradas ${obrasPorCodigoLike.length} obra(s) con codigo que contiene "${idBuscado}":`);
      obrasPorCodigoLike.forEach((obra, index) => {
        console.log(`\n--- Obra ${index + 1} ---`);
        console.log(JSON.stringify(obra, null, 2));
      });
    } else {
      console.log(`❌ No se encontró ninguna obra con codigo que contenga "${idBuscado}"`);
    }
    
    // Buscar en todos los campos de texto
    console.log('\n3️⃣ Buscando en todos los campos de texto...');
    let { data: obrasPorTexto, error: errorTexto } = await supabase
      .from('obras')
      .select('*')
      .or(`codigo.ilike.%${idBuscado}%,nombre.ilike.%${idBuscado}%,descripcion.ilike.%${idBuscado}%`)
      .limit(10);
    
    if (errorTexto) {
      console.error('❌ Error al buscar por texto:', errorTexto);
    } else if (obrasPorTexto && obrasPorTexto.length > 0) {
      console.log(`✅ Encontradas ${obrasPorTexto.length} obra(s) que contienen "${idBuscado}" en cualquier campo:`);
      obrasPorTexto.forEach((obra, index) => {
        console.log(`\n--- Obra ${index + 1} ---`);
        console.log(`ID: ${obra.id}`);
        console.log(`Código: ${obra.codigo || 'N/A'}`);
        console.log(`Nombre: ${obra.nombre || 'N/A'}`);
        console.log(`Estado: ${obra.estado || 'N/A'}`);
        console.log(`\nDatos completos:`);
        console.log(JSON.stringify(obra, null, 2));
      });
    } else {
      console.log(`❌ No se encontró ninguna obra que contenga "${idBuscado}" en ningún campo`);
    }
    
    // Listar todas las obras para ver qué códigos existen
    console.log('\n4️⃣ Listando algunas obras para referencia...');
    let { data: todasLasObras, error: errorTodas } = await supabase
      .from('obras')
      .select('id, codigo, nombre, estado')
      .limit(20)
      .order('id', { ascending: false });
    
    if (errorTodas) {
      console.error('❌ Error al listar obras:', errorTodas);
    } else if (todasLasObras && todasLasObras.length > 0) {
      console.log(`\n📋 Primeras ${todasLasObras.length} obras (para referencia):`);
      todasLasObras.forEach((obra) => {
        console.log(`  ID: ${obra.id} | Código: ${obra.codigo || 'N/A'} | Nombre: ${obra.nombre?.substring(0, 50) || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

// Ejecutar búsqueda
buscarObra()
  .then(() => {
    console.log('\n✅ Búsqueda completada');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(1);
  });
