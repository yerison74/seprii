/**
 * Importa datos exportados a Supabase (upsert por id, sin tocar el esquema).
 *
 * Uso:
 *   node scripts/import-supabase-datos.mjs
 *   node scripts/import-supabase-datos.mjs ./data/supabase-export
 *   node scripts/import-supabase-datos.mjs --sin-usuarios
 *   node scripts/import-supabase-datos.mjs --tablas obras,contrato,matriz_general
 *
 * Antes de importar en BD con datos existentes que quieras reemplazar:
 *   Ejecuta supabase-datos-vaciar.sql en Supabase SQL Editor
 * Después de importar:
 *   Ejecuta supabase-datos-secuencias.sql en Supabase SQL Editor
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  TABLE_ORDER,
  EXPORT_DIR,
  loadEnv,
  createSupabaseClient,
  upsertBatches,
  readExportManifest,
  parseArgs,
} from './supabase-datos-utils.mjs';

const { flags, positional } = parseArgs(process.argv);
const inDir = positional[0] ? positional[0] : EXPORT_DIR;
const skipUsuarios = flags.has('--sin-usuarios');
const soloTablasArg = [...flags].find((f) => f.startsWith('--tablas='));
const soloTablas = soloTablasArg
  ? soloTablasArg.split('=')[1].split(',').map((t) => t.trim()).filter(Boolean)
  : null;

async function main() {
  if (!existsSync(inDir)) {
    throw new Error(`No existe la carpeta de exportación: ${inDir}`);
  }

  const manifest = readExportManifest(inDir);
  const env = loadEnv();
  const supabase = createSupabaseClient(env);

  let tables = TABLE_ORDER.filter((t) => manifest.tables[t] !== undefined || existsSync(join(inDir, `${t}.json`)));
  if (skipUsuarios) tables = tables.filter((t) => t !== 'usuarios_app');
  if (soloTablas?.length) tables = tables.filter((t) => soloTablas.includes(t));

  console.log('Importando datos SEPRI ←', inDir);
  console.log('Exportado:', manifest.exported_at, '| Origen:', manifest.supabase_url);
  console.log('Destino:', env.REACT_APP_SUPABASE_URL);
  console.log('Tablas:', tables.join(', '));
  if (skipUsuarios) console.log('(usuarios_app omitido — se conservan usuarios del destino)');
  console.log('');

  if (manifest.supabase_url === env.REACT_APP_SUPABASE_URL && !flags.has('--mismo-proyecto')) {
    console.warn('⚠  Origen y destino parecen ser el mismo proyecto.');
    console.warn('   Usa --mismo-proyecto si es intencional (upsert sobre sí mismo).');
    console.warn('');
  }

  let total = 0;
  for (const table of tables) {
    const filePath = join(inDir, `${table}.json`);
    if (!existsSync(filePath)) {
      console.log(`  ${table}... omitida (sin archivo)`);
      continue;
    }
    const rows = JSON.parse(readFileSync(filePath, 'utf8'));
    if (!rows.length) {
      console.log(`  ${table}... 0 filas`);
      continue;
    }
    process.stdout.write(`  ${table}... `);
    const n = await upsertBatches(supabase, table, rows);
    console.log(`${n} filas`);
    total += n;
  }

  console.log('');
  console.log(`Listo: ${total} filas importadas.`);
  console.log('');
  console.log('Recomendado: ejecutar supabase-datos-secuencias.sql en Supabase SQL Editor');
  console.log('(ajusta secuencias de IDs autoincrementales tras la importación).');
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
