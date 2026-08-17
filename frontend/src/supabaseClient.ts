import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Faltan las variables de entorno VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. ' +
    'Asegúrate de configurar el archivo .env en el frontend.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'afinitivebd',
  },
});


