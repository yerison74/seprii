/**
 * Importa MATRIZ GENERAL Techado desde Excel a Supabase.
 * Uso: node scripts/import-techado-matriz.mjs [ruta-al-xlsx]
 */
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import XLSX from 'xlsx';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function loadEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) throw new Error('No se encontró .env');
  const lines = readFileSync(envPath, 'utf8').split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return env;
}

function normHeader(h) {
  return String(h ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
}

function normalizarNoContrato(raw) {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{4}$/.test(s)) return s;
  const d = s.replace(/\D/g, '');
  if (d.length >= 8) return `${d.slice(0, 4)}-${d.slice(4, 8)}`;
  return s;
}

function normalizarRegDist(raw) {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim().replace(/\s+/g, '');
  const m = s.match(/^(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return s;
}

function parseNum(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const n = Number(String(val).replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function texto(val) {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' || s === '0' ? null : s;
}

function excelDate(val) {
  if (val == null || val === '' || val === ' ') return null;
  if (typeof val === 'number' && val > 1000) {
    return new Date((val - 25569) * 86400 * 1000).toISOString().slice(0, 10);
  }
  return null;
}

function findCol(headers, ...needles) {
  for (let i = 0; i < headers.length; i++) {
    if (needles.some((n) => headers[i].includes(n))) return i;
  }
  return -1;
}

function parseRows(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName =
    wb.SheetNames.find((n) => normHeader(n).includes('MATRIZ') && normHeader(n).includes('GENERAL')) ||
    wb.SheetNames[0];
  const data = XLSX.utils.sheet_to_json(wb.Sheets[sheetName], { header: 1, defval: '' });
  let hi = data.findIndex((r) => normHeader(r[0]) === 'LOTE');
  if (hi < 0) hi = 1;
  const h = data[hi].map((c) => normHeader(c));
  const col = {
    lote: findCol(h, 'LOTE'),
    contratista: findCol(h, 'CONTRATISTA'),
    noContrato: findCol(h, 'NO. CONTRATO', 'NO CONTRATO'),
    plantel: findCol(h, 'PLANTEL'),
    provincia: findCol(h, 'PROVINCIA'),
    municipio: findCol(h, 'MUNICIPIO'),
    regDist: findCol(h, 'REG-DIST', 'REG DIST'),
    presupuesto: findCol(h, 'PRESUPUESTO'),
    estatus: findCol(h, 'ESTATUS 15'),
    tipoAdenda: findCol(h, 'TIPO DE ADENDA'),
    montoAdendado: findCol(h, 'MONTO ADENDADO'),
    certificacion: findCol(h, 'CERTIFICACION'),
  };
  const cell = (row, i) => (i >= 0 ? row[i] : undefined);
  const filas = [];
  const ctx = new Map();
  for (let i = hi + 1; i < data.length; i++) {
    const row = data[i];
    if (!row?.length) continue;
    const lote = parseInt(cell(row, col.lote), 10);
    const plantel = texto(cell(row, col.plantel));
    if (!lote || !plantel) continue;
    let no_contrato = normalizarNoContrato(texto(cell(row, col.noContrato)) || '');
    const prev = ctx.get(lote) || {};
    if (!no_contrato) no_contrato = prev.no_contrato || '';
    if (!no_contrato) continue;
    const merged = {
      lote,
      plantel,
      no_contrato,
      contratista_nombre: texto(cell(row, col.contratista)) || prev.contratista_nombre,
      reg_dist: normalizarRegDist(texto(cell(row, col.regDist))) || null,
      provincia: texto(cell(row, col.provincia)),
      municipio: texto(cell(row, col.municipio)),
      presupuesto_centro: parseNum(cell(row, col.presupuesto)),
      estatus: texto(cell(row, col.estatus)),
      tipo_adenda: texto(cell(row, col.tipoAdenda)),
      monto_adendado: parseNum(cell(row, col.montoAdendado)),
      certificacion: texto(cell(row, col.certificacion)),
    };
    ctx.set(lote, { ...prev, ...merged });
    filas.push(merged);
  }
  return filas;
}

async function buscarObraRpc(supabase, fila) {
  const { data, error } = await supabase.rpc('buscar_obra_para_matriz', {
    p_no_contrato: fila.no_contrato,
    p_reg_dist: fila.reg_dist,
    p_plantel: fila.plantel,
    p_provincia: fila.provincia,
    p_municipio: fila.municipio,
  });
  if (error) throw error;
  return data || null;
}

async function main() {
  const env = loadEnv();
  const url = env.REACT_APP_SUPABASE_URL;
  const key = env.REACT_APP_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Faltan REACT_APP_SUPABASE_URL o REACT_APP_SUPABASE_ANON_KEY en .env');

  const xlsxPath =
    process.argv[2] ||
    resolve(root, 'MATRIZ TECHADO GENERAL techado ORGANIZADA 21-05-2026 (1).xlsx');
  if (!existsSync(xlsxPath)) throw new Error(`Archivo no encontrado: ${xlsxPath}`);

  const filas = parseRows(readFileSync(xlsxPath));
  console.log(`Filas parseadas: ${filas.length}`);

  const supabase = createClient(url, key);

  const contratoIds = new Map();
  const contratosConocidos = new Set();
  const matrizExistenteCache = new Map();
  let matrizCreadas = 0;
  let matrizActualizadas = 0;
  let contratosCreados = 0;
  let contratosActualizados = 0;
  let vinculadas = 0;

  const { data: contratosDb } = await supabase.from('contrato').select('lote, no_contrato');
  for (const c of contratosDb || []) {
    contratosConocidos.add(`${c.lote}|${c.no_contrato}`);
  }

  for (const fila of filas) {
    const plantel = (fila.plantel || '').trim();
    if (!plantel) continue;

    const keyC = `${fila.lote}|${fila.no_contrato}`;
    const eraNuevo = !contratosConocidos.has(keyC);

    const { data, error } = await supabase
      .from('contrato')
      .upsert(
        {
          lote: fila.lote,
          no_contrato: fila.no_contrato,
          contratista_nombre: fila.contratista_nombre,
          presupuesto_centro: fila.presupuesto_centro,
        },
        { onConflict: 'lote,no_contrato' },
      )
      .select('id')
      .single();
    if (error) throw error;
    const contratoId = data.id;
    contratoIds.set(keyC, contratoId);
    if (eraNuevo) {
      contratosCreados++;
      contratosConocidos.add(keyC);
    } else if (!contratoIds.has(`done:${keyC}`)) {
      contratosActualizados++;
      contratoIds.set(`done:${keyC}`, true);
    }

    const cacheKey = `${contratoId}|${plantel}`;
    let matrizPrev = matrizExistenteCache.get(cacheKey);
    if (matrizPrev === undefined) {
      const { data: mRow } = await supabase
        .from('matriz_general')
        .select('id, obra_id')
        .eq('contrato_id', contratoId)
        .eq('plantel', plantel)
        .maybeSingle();
      matrizPrev = mRow;
      matrizExistenteCache.set(cacheKey, mRow);
    }

    let obraId = await buscarObraRpc(supabase, fila);
    if (!obraId && matrizPrev?.obra_id) obraId = matrizPrev.obra_id;
    if (obraId) vinculadas++;

    const payload = {
      contrato_id: contratoId,
      lote: fila.lote,
      plantel,
      provincia: fila.provincia,
      municipio: fila.municipio,
      reg_dist: fila.reg_dist,
      estatus: fila.estatus,
      monto_contratado_centro: fila.presupuesto_centro,
    };
    if (obraId) payload.obra_id = obraId;

    const { error: mErr } = await supabase.from('matriz_general').upsert(payload, {
      onConflict: 'contrato_id,plantel',
    });
    if (mErr) throw mErr;
    if (matrizPrev) matrizActualizadas++;
    else matrizCreadas++;

    if (fila.tipo_adenda || fila.monto_adendado) {
      const tipo = fila.tipo_adenda?.trim() || '';
      const { data: adendaExistente } = await supabase
        .from('contrato_adenda')
        .select('id')
        .eq('contrato_id', contratoId)
        .eq('tipo_adenda', tipo)
        .maybeSingle();
      const adendaPayload = {
        contrato_id: contratoId,
        tipo_adenda: fila.tipo_adenda,
        monto_adendado: fila.monto_adendado,
        certificacion: fila.certificacion,
      };
      if (adendaExistente?.id) {
        await supabase.from('contrato_adenda').update(adendaPayload).eq('id', adendaExistente.id);
      } else {
        await supabase.from('contrato_adenda').insert(adendaPayload);
      }
    }
  }

  console.log(
    `Contratos: ${contratosCreados} nuevos, ${contratosActualizados} actualizados · ` +
      `Matriz: ${matrizCreadas} nuevos, ${matrizActualizadas} actualizados · ` +
      `Obras vinculadas: ${vinculadas}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
