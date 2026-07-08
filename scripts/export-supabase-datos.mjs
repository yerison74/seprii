/**
 * Exporta todos los datos de SEPRI desde Supabase a data/supabase-export/
 *
 * Uso:
 *   node scripts/export-supabase-datos.mjs
 *   node scripts/export-supabase-datos.mjs --salida ./backup-2026-06-08
 *   node scripts/export-supabase-datos.mjs --tablas obras,tramites
 *
 * Requiere .env con REACT_APP_SUPABASE_URL y REACT_APP_SUPABASE_ANON_KEY
 * (o REACT_APP_SUPABASE_SERVICE_ROLE_KEY para evitar límites de RLS).
 */
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
  TABLE_ORDER,
  EXPORT_DIR,
  loadEnv,
  createSupabaseClient,
  fetchAllRows,
  writeExportManifest,
  parseArgs,
} from './supabase-datos-utils.mjs';

const { flags, positional } = parseArgs(process.argv);
const outDir = positional[0] ? positional[0] : EXPORT_DIR;
const tablasFlag = [...flags].find((f) => f.startsWith('--tablas='));
const soloTablas = tablasFlag
  ? tablasFlag.split('=')[1].split(',').map((t) => t.trim()).filter(Boolean)
  : null;

const tables = soloTablas?.length
  ? TABLE_ORDER.filter((t) => soloTablas.includes(t))
  : TABLE_ORDER;

if (soloTablas?.length && tables.length !== soloTablas.length) {
  const unknown = soloTablas.filter((t) => !TABLE_ORDER.includes(t));
  if (unknown.length) console.warn('Tablas desconocidas (omitidas):', unknown.join(', '));
}

async function main() {
  const env = loadEnv();
  const supabase = createSupabaseClient(env);
  mkdirSync(outDir, { recursive: true });

  console.log('Exportando datos SEPRI →', outDir);
  console.log('Proyecto:', env.REACT_APP_SUPABASE_URL);
  console.log('Tablas:', tables.join(', '));
  console.log('');

  const manifest = {
    exported_at: new Date().toISOString(),
    supabase_url: env.REACT_APP_SUPABASE_URL,
    tables: {},
  };

  for (const table of tables) {
    process.stdout.write(`  ${table}... `);
    const rows = await fetchAllRows(supabase, table);
    writeFileSync(join(outDir, `${table}.json`), JSON.stringify(rows, null, 2), 'utf8');
    manifest.tables[table] = rows.length;
    console.log(`${rows.length} filas`);
  }

  writeExportManifest(outDir, manifest);
  const total = Object.values(manifest.tables).reduce((a, b) => a + b, 0);
  console.log('');
  console.log(`Listo: ${total} filas en ${tables.length} tablas.`);
  console.log('Manifest:', join(outDir, 'manifest.json'));
  console.log('');
  console.log('Siguiente paso en proyecto destino:');
  console.log('  1) Ejecutar supabase-schema-completo.sql (si es BD nueva)');
  console.log('  2) Opcional: supabase-datos-vaciar.sql (si quieres reemplazar todo)');
  console.log('  3) node scripts/import-supabase-datos.mjs', outDir === EXPORT_DIR ? '' : `"${outDir}"`);
}

main().catch((err) => {
  console.error('Error:', err.message || err);
  process.exit(1);
});
