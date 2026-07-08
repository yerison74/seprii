import { supabase } from '../lib/supabase';

/** Copia obras.estado → matriz_general.estatus para todas las filas vinculadas. */
export async function propagarEstadoObraAMatriz(obraId: string, estado: string): Promise<void> {
  const valor = estado.trim();
  if (!obraId || !valor) return;
  const { error } = await supabase
    .from('matriz_general')
    .update({ estatus: valor })
    .eq('obra_id', obraId);
  if (error) throw error;
}

/** Copia matriz_general.estatus → obras.estado. */
export async function propagarEstadoMatrizAObra(obraId: string, estatus: string): Promise<void> {
  const valor = estatus.trim();
  if (!obraId || !valor) return;
  const { error } = await supabase.from('obras').update({ estado: valor }).eq('id', obraId);
  if (error) throw error;
}

/**
 * Al vincular obra con matriz: si uno tiene estado y el otro no, copia el valor;
 * si ambos difieren, prevalece obras.estado (Gestión de Obras).
 */
export async function reconciliarEstadoAlVincular(
  obraId: string,
  estatusMatriz?: string | null,
): Promise<void> {
  if (!obraId) return;

  const { data: obra, error: obraErr } = await supabase
    .from('obras')
    .select('estado')
    .eq('id', obraId)
    .maybeSingle();
  if (obraErr) throw obraErr;

  const estadoObra = (obra?.estado ?? '').trim();
  const estatusMat = (estatusMatriz ?? '').trim();

  if (estadoObra && estatusMat && estadoObra !== estatusMat) {
    await propagarEstadoObraAMatriz(obraId, estadoObra);
  } else if (estadoObra && !estatusMat) {
    await propagarEstadoObraAMatriz(obraId, estadoObra);
  } else if (!estadoObra && estatusMat) {
    await propagarEstadoMatrizAObra(obraId, estatusMat);
  }
}

/** Alinea estados entre obras y matriz_general para todas las obras vinculadas. */
export async function sincronizarEstadosObraMatrizEnLote(): Promise<number> {
  const { data: filas, error } = await supabase
    .from('matriz_general')
    .select('obra_id, estatus')
    .not('obra_id', 'is', null);
  if (error) throw error;

  const obraIds = Array.from(
    new Set((filas || []).map((r) => r.obra_id as string).filter(Boolean)),
  );
  if (obraIds.length === 0) return 0;

  const { data: obras, error: obrasErr } = await supabase
    .from('obras')
    .select('id, estado')
    .in('id', obraIds);
  if (obrasErr) throw obrasErr;

  const estadoPorObra = new Map(
    (obras || []).map((o) => [o.id as string, (o.estado ?? '').trim()]),
  );

  let sincronizadas = 0;
  for (const obraId of obraIds) {
    const estadoObra = estadoPorObra.get(obraId) ?? '';
    const estatusMatriz =
      (filas || [])
        .filter((f) => f.obra_id === obraId)
        .map((f) => (f.estatus ?? '').trim())
        .find(Boolean) ?? '';

    if (!estadoObra && !estatusMatriz) continue;
    if (estadoObra === estatusMatriz) continue;

    await reconciliarEstadoAlVincular(obraId, estatusMatriz);
    sincronizadas++;
  }

  return sincronizadas;
}
