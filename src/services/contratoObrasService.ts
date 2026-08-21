import { supabase } from '../lib/supabase';
import type { Contratista, ContratoTechado } from '../types/database';
import { normalizarNoContrato } from '../utils/techadoNormalizar';

const CONTRATO_SELECT = 'id, lote, no_contrato, contratista_nombre';
const CONTRATO_SELECT_COMPLETO =
  'id, lote, no_contrato, contratista_nombre, contratista_id, fecha_contrato, presupuesto_centro, estatus_contrato, proceso, certificacion, monto_total_inversion, monto_total_contrato, observaciones';
export const MAX_IDS_CONTRATO_FILTRO = 40;

type ObraContratoRow = {
  id: string;
  contrato?: string | null;
  contrato_id?: string | null;
  contratistas?: Contratista | Contratista[] | null;
  contrato_ref?: ContratoTechado | ContratoTechado[] | null;
};

/** Número de contrato legible desde obra (FK o columna legada). */
export function numeroContratoDesdeObra(row: {
  contrato?: string | null;
  contrato_ref?: ContratoTechado | ContratoTechado[] | null;
}): string | null {
  const ref = Array.isArray(row.contrato_ref) ? row.contrato_ref[0] : row.contrato_ref;
  const norm = normalizarNoContrato(ref?.no_contrato || row.contrato || '');
  return norm || null;
}

async function buscarObrasPorNumeroContrato(noContrato: string): Promise<ObraContratoRow[]> {
  const norm = normalizarNoContrato(noContrato);
  if (!norm) return [];

  const select =
    'id, contrato, contrato_id, contratistas(responsable), contrato_ref:contrato_id(id, lote, no_contrato, contratista_nombre)';

  const { data: catalogo } = await supabase
    .from('contrato')
    .select('id')
    .eq('no_contrato', norm)
    .limit(1)
    .maybeSingle();

  const porId = catalogo?.id
    ? await supabase.from('obras').select(select).eq('contrato_id', catalogo.id).limit(100)
    : { data: [] as ObraContratoRow[], error: null };

  if (porId.error) throw porId.error;
  if ((porId.data || []).length > 0) return porId.data as ObraContratoRow[];

  const { data, error } = await supabase
    .from('obras')
    .select(select)
    .eq('contrato', norm)
    .limit(100);

  if (error) throw error;
  return (data || []) as ObraContratoRow[];
}

/** Condiciones OR para búsqueda por número de contrato (legado + contrato_id). */
export async function condicionesOrContratoEnObras(term: string): Promise<string[]> {
  const t = term.trim();
  if (!t) return [];
  const esc = t.replace(/'/g, "''");
  const conditions = [`contrato.ilike.%${esc}%`];
  const norm = normalizarNoContrato(t);
  if (norm && norm !== t) {
    conditions.push(`contrato.ilike.%${norm.replace(/'/g, "''")}%`);
  }
  if (t.length >= 2) {
    try {
      const ids = await contratoObrasService.buscarContratoIdsPorTermino(t);
      if (ids.length > 0 && ids.length <= MAX_IDS_CONTRATO_FILTRO) {
        conditions.push(`contrato_id.in.(${ids.join(',')})`);
      }
    } catch {
      /* catálogo contrato opcional */
    }
  }
  return conditions;
}

type FiltroContratoQuery = {
  eq: (column: string, value: unknown) => FiltroContratoQuery;
  in: (column: string, values: unknown[]) => FiltroContratoQuery;
  ilike: (column: string, pattern: string) => FiltroContratoQuery;
};

/** Filtro avanzado de contrato: resuelve catálogo y cae a texto legado. */
export async function aplicarFiltroContratoEnQuery<T extends FiltroContratoQuery>(
  query: T,
  valorContrato: string,
): Promise<T> {
  const valor = valorContrato.trim();
  if (!valor) return query;
  try {
    const ids = await contratoObrasService.buscarContratoIdsPorTermino(valor);
    if (ids.length === 1) return query.eq('contrato_id', ids[0]) as T;
    if (ids.length > 1 && ids.length <= MAX_IDS_CONTRATO_FILTRO) {
      return query.in('contrato_id', ids) as T;
    }
  } catch {
    /* catálogo contrato opcional */
  }
  return query.ilike('contrato', `%${valor.replace(/'/g, "''")}%`) as T;
}

async function inferirLoteParaContrato(
  noContrato: string,
  obras: ObraContratoRow[],
): Promise<number> {
  const norm = normalizarNoContrato(noContrato);
  const { data: existente } = await supabase
    .from('contrato')
    .select('lote')
    .eq('no_contrato', norm)
    .order('lote', { ascending: true })
    .limit(1);
  if (existente?.[0]?.lote != null) return existente[0].lote as number;

  if (obras.length > 0) {
    const ids = obras.map((o) => o.id);
    const { data: mg } = await supabase
      .from('matriz_general')
      .select('lote')
      .in('obra_id', ids)
      .order('lote', { ascending: true })
      .limit(1);
    if (mg?.[0]?.lote != null) return mg[0].lote as number;
  }

  return 0;
}

/** Evita PATCH repetidos al mismo contrato (carga masiva / búsquedas concurrentes). */
const vinculacionesEnCurso = new Map<string, Promise<void>>();
const vinculacionesCompletadas = new Set<string>();

/** Asigna contrato_id a obras legadas que aún no lo tienen; no bloquea si no hay coincidencias. */
async function vincularObrasAContrato(contratoId: string, noContrato: string): Promise<void> {
  const norm = normalizarNoContrato(noContrato);
  if (!norm || !contratoId) return;

  const key = `${contratoId}|${norm}`;
  if (vinculacionesCompletadas.has(key)) return;

  const enCurso = vinculacionesEnCurso.get(key);
  if (enCurso) {
    await enCurso;
    return;
  }

  const promesa = (async () => {
    const { error } = await supabase
      .from('obras')
      .update({ contrato_id: contratoId, updated_at: new Date().toISOString() })
      .eq('contrato', norm)
      .is('contrato_id', null);

    if (error) {
      console.warn('vincularObrasAContrato:', error.message);
      return;
    }
    vinculacionesCompletadas.add(key);
  })();

  vinculacionesEnCurso.set(key, promesa);
  try {
    await promesa;
  } finally {
    vinculacionesEnCurso.delete(key);
  }
}

export const contratoObrasService = {
  /** IDs de contrato cuyo no_contrato coincide con el término (búsqueda en gestión de obras). */
  buscarContratoIdsPorTermino: async (search: string): Promise<string[]> => {
    const term = (search || '').trim();
    if (!term) return [];
    const ids = new Set<string>();

    const norm = normalizarNoContrato(term);
    const patrones = new Set<string>([`%${term.replace(/'/g, "''")}%`]);
    if (norm && norm !== term) {
      patrones.add(`%${norm.replace(/'/g, "''")}%`);
    }

    if (norm) {
      const { data: exact } = await supabase.from('contrato').select('id').eq('no_contrato', norm);
      for (const row of exact || []) {
        if (row.id) ids.add(String(row.id));
      }
    }

    for (const pattern of Array.from(patrones)) {
      const { data, error } = await supabase
        .from('contrato')
        .select('id')
        .ilike('no_contrato', pattern)
        .limit(80);
      if (error) throw error;
      for (const row of data || []) {
        if (row.id) ids.add(String(row.id));
      }
      if (ids.size >= 80) break;
    }
    return Array.from(ids);
  },

  /**
   * Busca en catálogo Techado (contrato) y en obras.
   * Si no existe y crearSiFalta, lo crea en contrato (con o sin obras vinculadas).
   */
  resolverOCrearContrato: async (options: {
    no_contrato: string;
    lote?: number | null;
    contratista_nombre?: string | null;
    contratista_id?: string | null;
    crearSiFalta?: boolean;
    /** En carga masiva omitir el PATCH global por contrato (cada fila ya lleva contrato_id). */
    vincularObras?: boolean;
    extras?: Partial<{
      fecha_contrato: string | null;
      estatus_contrato: string | null;
      proceso: string | null;
      certificacion: string | null;
      presupuesto_centro: number | null;
      monto_total_contrato: number | null;
      monto_total_inversion: number | null;
      observaciones: string | null;
    }>;
  }): Promise<ContratoTechado | null> => {
    const norm = normalizarNoContrato(options.no_contrato);
    if (!norm) return null;

    const debeVincular = options.vincularObras !== false;
    const vincular = debeVincular
      ? (contratoId: string) => vincularObrasAContrato(contratoId, norm)
      : async () => {};

    const loteExplicito =
      options.lote != null && Number.isFinite(options.lote) ? options.lote : null;

    const finalizar = async (contrato: ContratoTechado): Promise<ContratoTechado> => {
      await vincular(contrato.id);
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (options.contratista_id?.trim()) patch.contratista_id = options.contratista_id.trim();
      if (options.contratista_nombre?.trim()) {
        patch.contratista_nombre = options.contratista_nombre.trim();
      }
      const extras = options.extras || {};
      for (const [k, v] of Object.entries(extras)) {
        if (v !== undefined && v !== null && v !== '') patch[k] = v;
      }
      if (Object.keys(patch).length <= 1) return contrato;
      const { data, error } = await supabase
        .from('contrato')
        .update(patch)
        .eq('id', contrato.id)
        .select(CONTRATO_SELECT)
        .maybeSingle();
      if (error || !data) return contrato;
      return data as ContratoTechado;
    };

    if (loteExplicito != null) {
      const { data: porLote, error: errLote } = await supabase
        .from('contrato')
        .select(CONTRATO_SELECT)
        .eq('lote', loteExplicito)
        .eq('no_contrato', norm)
        .maybeSingle();

      if (errLote) throw errLote;
      if (porLote) {
        return finalizar(porLote as ContratoTechado);
      }
    } else {
      const { data: catalogo, error: errCat } = await supabase
        .from('contrato')
        .select(CONTRATO_SELECT)
        .eq('no_contrato', norm)
        .order('lote', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (errCat) throw errCat;
      if (catalogo) {
        return finalizar(catalogo as ContratoTechado);
      }
    }

    const obras = await buscarObrasPorNumeroContrato(norm);
    if (obras.length === 0 && !options.crearSiFalta) return null;

    const refObra = obras
      .map((o) => {
        const r = Array.isArray(o.contrato_ref) ? o.contrato_ref[0] : o.contrato_ref;
        return r?.id ? r : null;
      })
      .find(Boolean);
    if (refObra?.id) {
      return finalizar(refObra as ContratoTechado);
    }

    if (!options.crearSiFalta) {
      return null;
    }

    let contratistaNombre = options.contratista_nombre?.trim() || null;
    if (!contratistaNombre) {
      for (const obra of obras) {
        const c = Array.isArray(obra.contratistas) ? obra.contratistas[0] : obra.contratistas;
        if (c?.responsable?.trim()) {
          contratistaNombre = c.responsable.trim();
          break;
        }
      }
    }

    const lote = loteExplicito ?? (await inferirLoteParaContrato(norm, obras));
    const { data: creado, error: errIns } = await supabase
      .from('contrato')
      .upsert(
        {
          lote,
          no_contrato: norm,
          contratista_nombre: contratistaNombre,
          contratista_id: options.contratista_id?.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lote,no_contrato' },
      )
      .select(CONTRATO_SELECT)
      .single();

    if (errIns) throw errIns;
    return finalizar(creado as ContratoTechado);
  },

  /** Si el ID existe actualiza; si no, crea (por lote + no. contrato o con el ID dado). */
  upsertDesdeCarga: async (options: {
    contrato_id?: string | null;
    no_contrato?: string | null;
    lote?: number | null;
    contratista_nombre?: string | null;
    contratista_id?: string | null;
    extras?: Partial<{
      fecha_contrato: string | null;
      estatus_contrato: string | null;
      proceso: string | null;
      certificacion: string | null;
      presupuesto_centro: number | null;
      monto_total_contrato: number | null;
      monto_total_inversion: number | null;
      observaciones: string | null;
    }>;
  }): Promise<{ contrato: ContratoTechado; created: boolean } | null> => {
    const id = options.contrato_id?.trim() || null;
    const norm = normalizarNoContrato(options.no_contrato || '') || null;
    const extras = options.extras || {};
    const tieneExtras = Object.values(extras).some((v) => v != null && String(v).trim() !== '');
    if (!id && !norm && !tieneExtras) return null;

    const patchBase = (): Record<string, unknown> => {
      const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (options.contratista_id?.trim()) patch.contratista_id = options.contratista_id.trim();
      if (options.contratista_nombre?.trim()) {
        patch.contratista_nombre = options.contratista_nombre.trim();
      }
      if (norm) patch.no_contrato = norm;
      if (options.lote != null && Number.isFinite(options.lote)) patch.lote = options.lote;
      for (const [k, v] of Object.entries(extras)) {
        if (v !== undefined && v !== null && v !== '') patch[k] = v;
      }
      return patch;
    };

    const actualizar = async (contratoId: string): Promise<ContratoTechado> => {
      const patch = patchBase();
      if (Object.keys(patch).length <= 1) {
        const actual = await contratoObrasService.obtenerContratoPorId(contratoId);
        if (actual) return actual;
      }
      const { data, error } = await supabase
        .from('contrato')
        .update(patch)
        .eq('id', contratoId)
        .select(CONTRATO_SELECT_COMPLETO)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as ContratoTechado;
      const fallback = await contratoObrasService.obtenerContratoPorId(contratoId);
      if (!fallback) throw new Error('Contrato no encontrado');
      return fallback;
    };

    if (id) {
      const existente = await contratoObrasService.obtenerContratoPorId(id);
      if (existente?.id) {
        return { contrato: await actualizar(existente.id), created: false };
      }
      if (!norm) return null;
      const lote =
        options.lote != null && Number.isFinite(options.lote) ? options.lote : 0;
      const insertRow: Record<string, unknown> = {
        id,
        lote,
        no_contrato: norm,
        contratista_nombre: options.contratista_nombre?.trim() || null,
        contratista_id: options.contratista_id?.trim() || null,
        updated_at: new Date().toISOString(),
        ...Object.fromEntries(
          Object.entries(extras).filter(([, v]) => v !== undefined && v !== null && v !== ''),
        ),
      };
      const { data: creado, error } = await supabase
        .from('contrato')
        .insert(insertRow)
        .select(CONTRATO_SELECT_COMPLETO)
        .single();
      if (error) throw error;
      return { contrato: creado as ContratoTechado, created: true };
    }

    if (!norm) return null;
    const loteExplicito =
      options.lote != null && Number.isFinite(options.lote) ? options.lote : null;
    let existenteQuery = supabase.from('contrato').select('id').eq('no_contrato', norm);
    if (loteExplicito != null) existenteQuery = existenteQuery.eq('lote', loteExplicito);
    const { data: porNumero } = await existenteQuery.limit(1).maybeSingle();

    const resuelto = await contratoObrasService.resolverOCrearContrato({
      no_contrato: norm,
      lote: options.lote,
      contratista_nombre: options.contratista_nombre,
      contratista_id: options.contratista_id,
      crearSiFalta: true,
      vincularObras: false,
      extras,
    });
    if (!resuelto?.id) return null;
    return { contrato: resuelto, created: !porNumero?.id };
  },

  buscarContratos: async (search: string, limit = 25): Promise<ContratoTechado[]> => {
    const term = search.trim();
    if (!term) return [];
    const esc = (s: string) => s.replace(/'/g, "''");
    const norm = normalizarNoContrato(term);
    const patrones = Array.from(
      new Set([`%${esc(term)}%`, ...(norm && norm !== term ? [`%${esc(norm)}%`] : [])]),
    );

    const porClave = new Map<string, ContratoTechado>();
    const claveContrato = (c: { id?: string | null; lote?: number | null; no_contrato?: string | null }) => {
      if (c.id) return `id:${c.id}`;
      const num = normalizarNoContrato(c.no_contrato || '');
      return `num:${c.lote ?? 0}|${num}`;
    };
    const upsert = (row: ContratoTechado) => {
      const key = claveContrato(row);
      const prev = porClave.get(key);
      if (!prev) {
        porClave.set(key, row);
        return;
      }
      porClave.set(key, {
        ...prev,
        ...row,
        contratista_nombre: row.contratista_nombre || prev.contratista_nombre || null,
        planteles_resumen: row.planteles_resumen || prev.planteles_resumen || null,
      });
    };

    // Solo por número de contrato (catálogo).
    for (const patron of patrones) {
      const { data: catalogo, error } = await supabase
        .from('contrato')
        .select(CONTRATO_SELECT)
        .ilike('no_contrato', patron)
        .order('no_contrato', { ascending: true })
        .order('lote', { ascending: true })
        .limit(Math.max(limit * 3, 40));

      if (error) throw error;
      for (const c of catalogo || []) upsert(c as ContratoTechado);
    }

    if (norm) {
      const { data: exactos } = await supabase
        .from('contrato')
        .select(CONTRATO_SELECT)
        .eq('no_contrato', norm)
        .order('lote', { ascending: true })
        .limit(limit);
      for (const c of exactos || []) upsert(c as ContratoTechado);
    }

    // Fallback legado: obras.contrato (solo número, no plantel).
    if (porClave.size < limit) {
      for (const patron of patrones) {
        const { data: obras, error: errObras } = await supabase
          .from('obras')
          .select(
            'nombre, contrato, contrato_id, contratistas(responsable), contrato_ref:contrato_id(id, lote, no_contrato, contratista_nombre)',
          )
          .ilike('contrato', patron)
          .limit(80);

        if (errObras) throw errObras;

        const idsFaltantes = new Set<string>();
        for (const obra of obras || []) {
          const ref = Array.isArray(obra.contrato_ref) ? obra.contrato_ref[0] : obra.contrato_ref;
          const contratista = Array.isArray(obra.contratistas)
            ? obra.contratistas[0]
            : obra.contratistas;
          const plantel = String(obra.nombre || '').trim();
          const responsable = contratista?.responsable?.trim() || null;

          if (ref?.id) {
            upsert({
              ...(ref as ContratoTechado),
              contratista_nombre:
                (ref as ContratoTechado).contratista_nombre || responsable,
              planteles_resumen: plantel || null,
            });
          } else if (obra.contrato_id) {
            idsFaltantes.add(String(obra.contrato_id));
          } else {
            const num = numeroContratoDesdeObra(
              obra as unknown as Parameters<typeof numeroContratoDesdeObra>[0],
            );
            if (!num) continue;
            upsert({
              id: '',
              lote: 0,
              no_contrato: num,
              contratista_nombre: responsable,
              planteles_resumen: plantel || null,
            });
          }
        }

        if (idsFaltantes.size > 0) {
          const { data: porIds } = await supabase
            .from('contrato')
            .select(CONTRATO_SELECT)
            .in('id', Array.from(idsFaltantes));
          for (const c of porIds || []) upsert(c as ContratoTechado);
        }
      }
    }

    // Enriquecer display + conteo de obras (para no elegir contratos huérfanos como "0459").
    const idsParaContexto = Array.from(porClave.values())
      .map((c) => c.id)
      .filter((id): id is string => !!id)
      .slice(0, 80);

    if (idsParaContexto.length > 0) {
      const { data: obrasCtx } = await supabase
        .from('obras')
        .select('nombre, contrato_id, contratistas(responsable)')
        .in('contrato_id', idsParaContexto)
        .limit(500);

      const porContratoId = new Map<
        string,
        { planteles: string[]; responsable: string | null; count: number }
      >();
      for (const obra of obrasCtx || []) {
        const cid = String(obra.contrato_id || '');
        if (!cid) continue;
        const cur = porContratoId.get(cid) || { planteles: [], responsable: null, count: 0 };
        cur.count += 1;
        const nombre = String(obra.nombre || '').trim();
        if (nombre && !cur.planteles.includes(nombre) && cur.planteles.length < 3) {
          cur.planteles.push(nombre);
        }
        const contratista = Array.isArray(obra.contratistas)
          ? obra.contratistas[0]
          : obra.contratistas;
        if (!cur.responsable && contratista?.responsable?.trim()) {
          cur.responsable = contratista.responsable.trim();
        }
        porContratoId.set(cid, cur);
      }

      for (const id of idsParaContexto) {
        const key = `id:${id}`;
        const prev = porClave.get(key);
        if (!prev) continue;
        const ctx = porContratoId.get(id);
        const resumen =
          !ctx || ctx.planteles.length === 0
            ? null
            : ctx.planteles.length === 1
              ? ctx.planteles[0]
              : `${ctx.planteles[0]} (+${ctx.count - 1})`;
        porClave.set(key, {
          ...prev,
          contratista_nombre: prev.contratista_nombre || ctx?.responsable || null,
          planteles_resumen: prev.planteles_resumen || resumen,
          obras_count: ctx?.count ?? 0,
        });
      }
    }

    const termLower = term.toLowerCase();
    const normLower = (norm || '').toLowerCase();
    const esNumeroCompleto = /^\d{4}-\d{2}$/.test(norm) || /^\d{4}-\d{4}$/.test(norm);

    return Array.from(porClave.values())
      .sort((a, b) => {
        const aNum = String(a.no_contrato || '').toLowerCase();
        const bNum = String(b.no_contrato || '').toLowerCase();
        const aCount = a.obras_count ?? 0;
        const bCount = b.obras_count ?? 0;
        const score = (n: string, count: number) => {
          const exacto = (normLower && n === normLower) || n === termLower;
          const prefijo = n.startsWith(termLower) || (!!normLower && n.startsWith(normLower));
          // Coincidencia exacta completa (0459-2025) siempre primero.
          if (exacto && esNumeroCompleto) return 0;
          // Con obras y número más específico (0459-2025 al buscar 0459).
          if (count > 0 && prefijo && !exacto) return 1;
          if (count > 0 && exacto) return 2;
          if (count > 0) return 3;
          // Exacto sin obras (huérfano "0459") al final del grupo relevante.
          if (exacto) return 4;
          if (prefijo) return 5;
          return 6;
        };
        const d = score(aNum, aCount) - score(bNum, bCount);
        if (d !== 0) return d;
        if (bCount !== aCount) return bCount - aCount;
        // Preferir números más específicos (0459-2025 antes que 0459).
        if (bNum.length !== aNum.length) return bNum.length - aNum.length;
        if (aNum !== bNum) return aNum.localeCompare(bNum);
        return (a.lote ?? 0) - (b.lote ?? 0);
      })
      .slice(0, limit);
  },

  /**
   * Obras del contrato listas para vincular a un documento técnico
   * (SIGEDE → id_sigede, mantenimiento sin SIGEDE → obra_ids).
   */
  obtenerObrasParaDocumentoPorContrato: async (
    contratoId: string,
    noContrato?: string | null,
  ): Promise<{ id_sigede: string[]; obra_ids: string[] }> => {
    if (!contratoId && !noContrato?.trim()) {
      return { id_sigede: [], obra_ids: [] };
    }

    const cols = 'id, codigo, tipo, distrito_minerd_sigede, contrato, contrato_id';
    const filas: Array<Record<string, unknown>> = [];

    if (contratoId) {
      const { data, error } = await supabase
        .from('obras')
        .select(cols)
        .eq('contrato_id', contratoId)
        .limit(500);
      if (error) throw error;
      filas.push(...((data || []) as Record<string, unknown>[]));
    }

    const norm = normalizarNoContrato(noContrato || '');
    if (norm) {
      const { data, error } = await supabase
        .from('obras')
        .select(cols)
        .eq('contrato', norm)
        .limit(500);
      if (error) throw error;
      const vistos = new Set(filas.map((r) => String(r.id || '')));
      for (const row of data || []) {
        const id = String((row as { id?: string }).id || '');
        if (!id || vistos.has(id)) continue;
        filas.push(row as Record<string, unknown>);
      }
    }

    const idSigede: string[] = [];
    const obraIds: string[] = [];
    const vistosSigede = new Set<string>();
    const vistosObra = new Set<string>();

    for (const row of filas) {
      const id = String(row.id || '').trim();
      if (!id) continue;
      const tipo = String(row.tipo || '').trim();
      const codigo = String(row.codigo || '').trim();
      const distrito = String(row.distrito_minerd_sigede || '').trim();
      const sigede = codigo || distrito;
      const esMantenimiento = tipo === 'Mantenimiento' || !sigede;

      if (esMantenimiento) {
        if (!vistosObra.has(id)) {
          vistosObra.add(id);
          obraIds.push(id);
        }
      } else if (!vistosSigede.has(sigede)) {
        vistosSigede.add(sigede);
        idSigede.push(sigede);
      }
    }

    return { id_sigede: idSigede, obra_ids: obraIds };
  },

  buscarContratoPorNumero: async (
    noContrato: string,
    options?: { crearSiFalta?: boolean },
  ): Promise<ContratoTechado | null> => {
    return contratoObrasService.resolverOCrearContrato({
      no_contrato: noContrato,
      crearSiFalta: options?.crearSiFalta ?? false,
    });
  },

  obtenerContratoPorId: async (id: string): Promise<ContratoTechado | null> => {
    if (!id) return null;
    const { data, error } = await supabase
      .from('contrato')
      .select(CONTRATO_SELECT_COMPLETO)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as ContratoTechado) || null;
  },

  listarPorIds: async (ids: string[]): Promise<ContratoTechado[]> => {
    const uniq = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
    if (uniq.length === 0) return [];
    const out: ContratoTechado[] = [];
    for (let i = 0; i < uniq.length; i += 100) {
      const chunk = uniq.slice(i, i + 100);
      const { data, error } = await supabase
        .from('contrato')
        .select(CONTRATO_SELECT_COMPLETO)
        .in('id', chunk);
      if (error) throw error;
      out.push(...((data || []) as ContratoTechado[]));
    }
    return out;
  },

  asignarContratoAObra: async (obraId: string, contratoId: string): Promise<void> => {
    const { error } = await supabase
      .from('obras')
      .update({
        contrato_id: contratoId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', obraId);
    if (error) throw error;
  },

  /** Vincula el contratista a todos los contratos con ese no_contrato y a sus obras. */
  asignarContratistaPorNoContrato: async (
    noContrato: string,
    contratistaId: string,
    contratistaNombre?: string | null,
  ): Promise<void> => {
    const norm = normalizarNoContrato(noContrato);
    const cid = contratistaId.trim();
    if (!norm || !cid) return;

    const patchContrato: Record<string, unknown> = {
      contratista_id: cid,
      updated_at: new Date().toISOString(),
    };
    if (contratistaNombre?.trim()) patchContrato.contratista_nombre = contratistaNombre.trim();

    const { data: contratos, error: errContratos } = await supabase
      .from('contrato')
      .update(patchContrato)
      .eq('no_contrato', norm)
      .select('id');
    if (errContratos) throw errContratos;

    const ids = (contratos || []).map((row) => String(row.id)).filter(Boolean);
    if (ids.length > 0) {
      const { error: errObras } = await supabase
        .from('obras')
        .update({
          contratista_id: cid,
          updated_at: new Date().toISOString(),
        })
        .in('contrato_id', ids);
      if (errObras) throw errObras;
    }
  },

  listarFilasPlantillaContratistas: async (opciones?: {
    noContrato?: string | null;
    responsable?: string | null;
    search?: string | null;
    contratoIds?: string[] | null;
  }): Promise<
    Array<{
      no_contrato: string;
      responsable: string;
      identificacion: string;
      telefono1: string;
      telefono2: string;
      correo: string;
    }>
  > => {
    const PAGE = 1000;
    const contratoIds = Array.from(
      new Set((opciones?.contratoIds || []).map((id) => id.trim()).filter(Boolean)),
    );
    const noFiltro = normalizarNoContrato(opciones?.noContrato || '') || (opciones?.noContrato || '').trim();
    const respFiltro = (opciones?.responsable || '').trim();
    const search = (opciones?.search || '').trim();

    type RowContrato = {
      id: string;
      no_contrato: string | null;
      contratista_id: string | null;
      contratista_nombre: string | null;
    };

    const contratos: RowContrato[] = [];
    if (contratoIds.length > 0) {
      const listados = await contratoObrasService.listarPorIds(contratoIds);
      contratos.push(
        ...listados.map((c) => ({
          id: c.id,
          no_contrato: c.no_contrato,
          contratista_id: c.contratista_id || null,
          contratista_nombre: c.contratista_nombre || null,
        })),
      );
    } else {
      let offset = 0;
      for (;;) {
        let query = supabase
          .from('contrato')
          .select('id, no_contrato, contratista_id, contratista_nombre')
          .order('no_contrato', { ascending: true })
          .range(offset, offset + PAGE - 1);
        if (noFiltro) query = query.ilike('no_contrato', `%${noFiltro.replace(/'/g, "''")}%`);
        const { data, error } = await query;
        if (error) throw error;
        const chunk = (data || []) as RowContrato[];
        contratos.push(...chunk);
        if (chunk.length < PAGE) break;
        offset += PAGE;
      }
    }

    const contratistaIds = Array.from(
      new Set(contratos.map((c) => String(c.contratista_id || '').trim()).filter(Boolean)),
    );
    const contratistaPorId = new Map<
      string,
      {
        responsable?: string | null;
        identificacion?: string | null;
        telefono1?: string | null;
        telefono2?: string | null;
        correo?: string | null;
      }
    >();
    for (let i = 0; i < contratistaIds.length; i += 100) {
      const chunk = contratistaIds.slice(i, i + 100);
      const { data, error } = await supabase
        .from('contratistas')
        .select('id, responsable, identificacion, telefono1, telefono2, correo')
        .in('id', chunk);
      if (error) throw error;
      for (const row of data || []) {
        contratistaPorId.set(String(row.id), row);
      }
    }

    const seen = new Set<string>();
    const filas: Array<{
      no_contrato: string;
      responsable: string;
      identificacion: string;
      telefono1: string;
      telefono2: string;
      correo: string;
    }> = [];

    const termino = (respFiltro || search).toLowerCase();
    for (const contrato of contratos) {
      const no = normalizarNoContrato(contrato.no_contrato || '') || String(contrato.no_contrato || '').trim();
      if (!no || seen.has(no)) continue;
      const ct = contrato.contratista_id ? contratistaPorId.get(contrato.contratista_id) : undefined;
      const responsable = ct?.responsable || contrato.contratista_nombre || '';
      if (termino) {
        const hay = responsable.toLowerCase().includes(termino) || no.toLowerCase().includes(termino);
        if (!hay) continue;
      }
      seen.add(no);
      filas.push({
        no_contrato: no,
        responsable,
        identificacion: ct?.identificacion || '',
        telefono1: ct?.telefono1 || '',
        telefono2: ct?.telefono2 || '',
        correo: ct?.correo || '',
      });
    }
    return filas;
  },
};
