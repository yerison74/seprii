import { supabase } from '../lib/supabase';
import type { Contratista, ContratoTechado } from '../types/database';
import { normalizarNoContrato } from '../utils/techadoNormalizar';

const CONTRATO_SELECT = 'id, lote, no_contrato, contratista_nombre';

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

/** Asigna contrato_id a obras que aún tengan el número legado; no bloquea si no hay coincidencias. */
async function vincularObrasAContrato(contratoId: string, noContrato: string): Promise<void> {
  const norm = normalizarNoContrato(noContrato);
  if (!norm) return;

  const { error } = await supabase
    .from('obras')
    .update({ contrato_id: contratoId, updated_at: new Date().toISOString() })
    .eq('contrato', norm);

  if (error) {
    console.warn('vincularObrasAContrato:', error.message);
  }
}

export const contratoObrasService = {
  /** IDs de contrato cuyo no_contrato coincide con el término (búsqueda en gestión de obras). */
  buscarContratoIdsPorTermino: async (search: string): Promise<string[]> => {
    const term = (search || '').trim();
    if (!term) return [];
    const esc = term.replace(/'/g, "''");
    const pattern = `%${esc}%`;
    const ids = new Set<string>();

    const norm = normalizarNoContrato(term);
    if (norm) {
      const { data: exact } = await supabase.from('contrato').select('id').eq('no_contrato', norm);
      for (const row of exact || []) {
        if (row.id) ids.add(String(row.id));
      }
    }

    const { data, error } = await supabase
      .from('contrato')
      .select('id')
      .ilike('no_contrato', pattern)
      .limit(80);
    if (error) throw error;
    for (const row of data || []) {
      if (row.id) ids.add(String(row.id));
    }
    return Array.from(ids);
  },

  /**
   * Busca en catálogo Techado (contrato) y en obras.
   * Si no existe y crearSiFalta, lo crea en contrato (con o sin obras vinculadas).
   */
  resolverOCrearContrato: async (options: {
    no_contrato: string;
    contratista_nombre?: string | null;
    crearSiFalta?: boolean;
  }): Promise<ContratoTechado | null> => {
    const norm = normalizarNoContrato(options.no_contrato);
    if (!norm) return null;

    const { data: catalogo, error: errCat } = await supabase
      .from('contrato')
      .select(CONTRATO_SELECT)
      .eq('no_contrato', norm)
      .order('lote', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (errCat) throw errCat;
    if (catalogo) {
      await vincularObrasAContrato(catalogo.id as string, norm);
      return catalogo as ContratoTechado;
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
      await vincularObrasAContrato(refObra.id, norm);
      return refObra as ContratoTechado;
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

    const lote = await inferirLoteParaContrato(norm, obras);
    const { data: creado, error: errIns } = await supabase
      .from('contrato')
      .upsert(
        {
          lote,
          no_contrato: norm,
          contratista_nombre: contratistaNombre,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'lote,no_contrato' },
      )
      .select(CONTRATO_SELECT)
      .single();

    if (errIns) throw errIns;
    await vincularObrasAContrato(creado.id as string, norm);
    return creado as ContratoTechado;
  },

  buscarContratos: async (search: string, limit = 8): Promise<ContratoTechado[]> => {
    const term = search.trim();
    if (!term) return [];
    const patron = `%${term.replace(/'/g, "''")}%`;

    const { data: catalogo, error } = await supabase
      .from('contrato')
      .select(CONTRATO_SELECT)
      .or(`no_contrato.ilike.${patron},contratista_nombre.ilike.${patron}`)
      .order('no_contrato', { ascending: true })
      .limit(limit);

    if (error) throw error;

    const porNumero = new Map<string, ContratoTechado>();
    for (const c of catalogo || []) {
      const num = normalizarNoContrato(c.no_contrato);
      if (num) porNumero.set(num, c as ContratoTechado);
    }

    if (porNumero.size < limit) {
      const { data: obras, error: errObras } = await supabase
        .from('obras')
        .select(
          'contrato, contrato_ref:contrato_id(id, lote, no_contrato, contratista_nombre)',
        )
        .or(`contrato.ilike.${patron},contrato_ref.no_contrato.ilike.${patron}`)
        .limit(80);

      if (errObras) throw errObras;

      for (const obra of obras || []) {
        const num = numeroContratoDesdeObra(obra as ObraContratoRow);
        if (!num || porNumero.has(num)) continue;
        const ref = Array.isArray(obra.contrato_ref) ? obra.contrato_ref[0] : obra.contrato_ref;
        if (ref?.id) {
          porNumero.set(num, ref as ContratoTechado);
        } else {
          porNumero.set(num, {
            id: '',
            lote: 0,
            no_contrato: num,
            contratista_nombre: null,
          });
        }
        if (porNumero.size >= limit) break;
      }
    }

    return Array.from(porNumero.values()).slice(0, limit);
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
      .select(CONTRATO_SELECT)
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return (data as ContratoTechado) || null;
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
};
