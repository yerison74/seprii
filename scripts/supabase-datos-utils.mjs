/**
 * Utilidades compartidas para exportar/importar datos de SEPRI en Supabase.
 */
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const ROOT = resolve(__dirname, '..');
export const EXPORT_DIR = resolve(ROOT, 'data', 'supabase-export');
export const PAGE_SIZE = 1000;
export const BATCH_SIZE = 200;

/** Orden de importación respetando claves foráneas. */
export const TABLE_ORDER = [
  'usuarios_app',
  'area',
  'contratistas',
  'contrato',
  'contrato_adenda',
  'adenda',
  'obras',
  'historial_estados',
  'tramites',
  'movimientos_tramites',
  'historial_uploads',
  'tiempo_en_area',
  'notificaciones_tiempo',
  'notificacion_leida',
  'formulario_contratista',
  'movimientos_solicitud_contratista',
  'contratista_access_tokens',
  'documentos_tecnicos_obra',
  'movimiento_documentos_tecnicos_obra',
  'matriz_general',
];

/** Columna de conflicto para upsert por tabla. */
export const UPSERT_KEY = {
  usuarios_app: 'id',
  area: 'id',
  contratistas: 'id',
  obras: 'id',
  historial_estados: 'id',
  tramites: 'id',
  movimientos_tramites: 'id',
  historial_uploads: 'id',
  tiempo_en_area: 'id',
  notificaciones_tiempo: 'id',
  notificacion_leida: 'id',
  formulario_contratista: 'id',
  movimientos_solicitud_contratista: 'id',
  contratista_access_tokens: 'id',
  documentos_tecnicos_obra: 'id',
  movimiento_documentos_tecnicos_obra: 'id',
  contrato: 'id',
  contrato_adenda: 'id',
  adenda: 'id',
  matriz_general: 'id',
};

export function loadEnv() {
  const envPath = resolve(ROOT, '.env');
  if (!existsSync(envPath)) throw new Error('No se encontró .env en la raíz del proyecto');
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

export function createSupabaseClient(env) {
  const url = env.REACT_APP_SUPABASE_URL;
  const key =
    env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.REACT_APP_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      'Faltan REACT_APP_SUPABASE_URL y una clave (REACT_APP_SUPABASE_ANON_KEY o SERVICE_ROLE) en .env',
    );
  }
  return createClient(url, key);
}

export async function fetchAllRows(supabase, table) {
  const rows = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      if (error.code === '42P01') return [];
      throw new Error(`${table}: ${error.message}`);
    }
    const batch = data || [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return rows;
}

export async function upsertBatches(supabase, table, rows) {
  const onConflict = UPSERT_KEY[table];
  if (!onConflict) throw new Error(`Sin clave upsert para ${table}`);

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(table).upsert(chunk, { onConflict });
    if (error) throw new Error(`${table} (lote ${i / BATCH_SIZE + 1}): ${error.message}`);
    inserted += chunk.length;
  }
  return inserted;
}

export function writeExportManifest(dir, manifest) {
  writeFileSync(join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
}

export function readExportManifest(dir) {
  const path = join(dir, 'manifest.json');
  if (!existsSync(path)) throw new Error(`No hay manifest.json en ${dir}. Ejecuta export primero.`);
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function listExportTables(dir) {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && f !== 'manifest.json')
    .map((f) => f.replace(/\.json$/, ''));
}

export function parseArgs(argv) {
  const flags = new Set();
  const positional = [];
  for (const arg of argv.slice(2)) {
    if (arg.startsWith('--')) flags.add(arg);
    else positional.push(arg);
  }
  return { flags, positional };
}
