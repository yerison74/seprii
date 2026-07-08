import { supabase } from '../lib/supabase';

/**
 * Reserva N IDs OB-xxxx / MT-xxxx libres con pocas consultas.
 */
export async function reservarIdsObra(prefijo: 'OB' | 'MT', cantidad: number): Promise<string[]> {
  if (cantidad <= 0) return [];
  const resultado: string[] = [];
  let intentos = 0;
  while (resultado.length < cantidad && intentos < 40) {
    intentos += 1;
    const necesita = cantidad - resultado.length;
    const objetivoCandidatos = Math.min(Math.max(necesita * 8, 80), 800);
    const pool = new Set<string>();
    while (pool.size < objetivoCandidatos) {
      const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      pool.add(`${prefijo}-${random}`);
    }
    const arr = Array.from(pool);
    const { data, error } = await supabase.from('obras').select('id').in('id', arr);
    if (error) throw error;
    const ocupados = new Set((data || []).map((r: { id: string }) => r.id));
    for (const id of arr) {
      if (!ocupados.has(id) && !resultado.includes(id)) {
        resultado.push(id);
        if (resultado.length >= cantidad) return resultado;
      }
    }
  }
  throw new Error(`No se pudieron reservar ${cantidad} IDs únicos para obras ${prefijo}`);
}
