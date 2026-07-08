/** Normaliza No. CONTRATO al formato xxxx-xxxx usado en obras.contrato */
export function normalizarNoContrato(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim();
  if (/^\d{4}-\d{4}$/.test(s)) return s;
  const digits = s.replace(/\D/g, '');
  if (digits.length >= 8) return `${digits.slice(0, 4)}-${digits.slice(4, 8)}`;
  return s;
}

/**
 * REG-DIST de la matriz ≡ distrito_minerd_sigede en obras (ej. 01-01).
 */
export function normalizarRegDist(raw: string | number | null | undefined): string {
  if (raw == null || raw === '') return '';
  const s = String(raw).trim().replace(/\s+/g, '');
  const m = s.match(/^(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
  return s;
}

export function normalizarTextoClave(raw: string | null | undefined): string {
  return (raw ?? '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

/** Fecha Excel serial o texto → ISO date (YYYY-MM-DD) */
export function parsearFechaMatriz(val: unknown): string | null {
  if (val == null || val === '' || val === ' ') return null;
  if (typeof val === 'number' && val > 1000) {
    const ms = (val - 25569) * 86400 * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return null;
  }
  const s = String(val).trim();
  if (/^\d{4}$/.test(s)) return null;
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  return null;
}

export function parsearNumeroMatriz(val: unknown): number | null {
  if (val == null || val === '') return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  const s = String(val).replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function parsearEnteroMatriz(val: unknown): number | null {
  const n = parsearNumeroMatriz(val);
  return n == null ? null : Math.trunc(n);
}

export function textoMatriz(val: unknown): string | null {
  if (val == null) return null;
  const s = String(val).trim();
  return s === '' || s === '0' ? null : s;
}
