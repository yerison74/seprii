import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (process.env.REACT_APP_SUPABASE_URL ?? '').trim();
const supabaseKey = (process.env.REACT_APP_SUPABASE_ANON_KEY ?? '').trim();

if (!supabaseUrl || !supabaseKey) {
  const faltantes = [
    !supabaseUrl && 'REACT_APP_SUPABASE_URL',
    !supabaseKey && 'REACT_APP_SUPABASE_ANON_KEY',
  ]
    .filter(Boolean)
    .join(', ');
  throw new Error(
    `Faltan variables en .env (${faltantes}). ` +
      'Verifica el archivo en la raíz del proyecto y reinicia con npm start.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: {
    headers: {
      apikey: supabaseKey,
    },
  },
});
