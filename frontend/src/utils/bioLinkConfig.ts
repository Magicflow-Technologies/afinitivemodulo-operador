import { createClient } from '@supabase/supabase-js';

export interface BioButtonItem {
  id: string;
  title: string;
  subtitle: string;
  url?: string;
  enabled: boolean;
  isPrimary?: boolean;
}

export const DEFAULT_BIO_BUTTONS: BioButtonItem[] = [
  {
    id: 'registro',
    title: 'Déjanos tus datos para contactarte',
    subtitle: 'Recibe una propuesta de inversión a tu medida',
    enabled: true,
    isPrimary: true,
  },
  {
    id: 'web',
    title: 'Nuestra web',
    subtitle: 'Conoce nuestro modelo de Wealth Management',
    url: 'https://afinitive.com.pe',
    enabled: true,
  },
  {
    id: 'facebook',
    title: 'Síguenos en Facebook para eventos',
    subtitle: 'Conferencias, transmisiones y networking',
    url: 'https://facebook.com/afinitivepe',
    enabled: true,
  },
  {
    id: 'instagram',
    title: 'Síguenos en Instagram y conoce nuestra comunidad',
    subtitle: 'Consejos diarios de educación financiera y patrimonio',
    url: 'https://instagram.com/afinitive.pe',
    enabled: true,
  },
  {
    id: 'whatsapp',
    title: 'Escríbenos al WhatsApp',
    subtitle: 'Atención personalizada con un asesor patrimonial',
    url: 'https://wa.me/51982100208?text=Hola%20Dr.%20Finanzas,%20vi%20tu%20perfil%20de%20TikTok%20y%20deseo%20asesor%C3%ADa%20personalizada.',
    enabled: true,
  },
  {
    id: 'youtube',
    title: 'Análisis de mercados en YouTube',
    subtitle: 'Videos explicativos, análisis macroeconómico y retornos',
    url: 'https://youtube.com/@afinitivewealth',
    enabled: true,
  },
  {
    id: 'linkedin',
    title: 'Quién soy en LinkedIn',
    subtitle: 'Ricardo Bertalmio Ruibal • Trayectoria y credenciales',
    url: 'https://www.linkedin.com/in/ricardo-bertalmio-ruibal/',
    enabled: true,
  },
];

const LOCAL_STORAGE_KEY = 'dr_finanzas_biolinks_v1';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { db: { schema: 'afinitivebd' } })
  : null;

const getBackendBase = () => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3080';
    }
  }
  return '';
};

/**
 * Obtener botones de Bio Link (LocalStorage síncrono inicial)
 */
export function getStoredBioButtonsSync(): BioButtonItem[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return mergeWithDefaults(parsed);
      }
    }
  } catch (e) {
    console.warn('Error al leer botones locales de Bio Link:', e);
  }
  return DEFAULT_BIO_BUTTONS;
}

/**
 * Obtener botones de Bio Link desde Supabase / Backend y actualizar cache local
 */
export async function fetchBioButtons(): Promise<BioButtonItem[]> {
  // 1. Intentar desde Supabase directo
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('eventos')
        .select('descripcion')
        .eq('id', 'dr-finanzas-bio')
        .maybeSingle();

      if (!error && data?.descripcion) {
        try {
          const parsed = JSON.parse(data.descripcion);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const merged = mergeWithDefaults(parsed);
            localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
            return merged;
          }
        } catch {
          // Si la descripción no era JSON
        }
      }
    } catch (e) {
      console.warn('Error consultando Supabase para botones de Bio Link:', e);
    }
  }

  // 2. Intentar desde Backend API
  const backendBase = getBackendBase();
  if (backendBase) {
    try {
      const res = await fetch(`${backendBase}/api/eventos/dr-finanzas-bio`);
      if (res.ok) {
        const ev = await res.json();
        if (ev?.descripcion) {
          try {
            const parsed = JSON.parse(ev.descripcion);
            if (Array.isArray(parsed) && parsed.length > 0) {
              const merged = mergeWithDefaults(parsed);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(merged));
              return merged;
            }
          } catch {}
        }
      }
    } catch {}
  }

  return getStoredBioButtonsSync();
}

/**
 * Guardar botones de Bio Link tanto en LocalStorage como en Supabase/Backend
 */
export async function saveBioButtons(buttons: BioButtonItem[]): Promise<boolean> {
  const jsonString = JSON.stringify(buttons);

  // 1. Guardar localmente siempre
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, jsonString);
  } catch (e) {
    console.error('Error guardando en localStorage:', e);
  }

  // 2. Guardar en Supabase (upsert en tabla eventos con id 'dr-finanzas-bio')
  if (supabase) {
    try {
      const { error } = await supabase
        .from('eventos')
        .upsert({
          id: 'dr-finanzas-bio',
          nombre: 'Dr. Finanzas - Link in Bio',
          tipo: 'lead_form',
          descripcion: jsonString,
          activo: true,
          duracion_minutos: 0,
        }, { onConflict: 'id' });

      if (!error) {
        return true;
      }
    } catch (e) {
      console.warn('Error guardando en Supabase:', e);
    }
  }

  // 3. Fallback a Backend API
  const backendBase = getBackendBase();
  if (backendBase) {
    try {
      const res = await fetch(`${backendBase}/api/eventos/dr-finanzas-bio`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Dr. Finanzas - Link in Bio',
          tipo: 'lead_form',
          descripcion: jsonString,
          activo: true,
        }),
      });
      if (res.ok) return true;
    } catch {}
  }

  return true;
}

function mergeWithDefaults(saved: any[]): BioButtonItem[] {
  return DEFAULT_BIO_BUTTONS.map((def) => {
    const existing = saved.find((s) => s.id === def.id);
    if (!existing) return def;
    return {
      ...def,
      title: existing.title || def.title,
      subtitle: existing.subtitle !== undefined ? existing.subtitle : def.subtitle,
      url: existing.url !== undefined ? existing.url : def.url,
      enabled: existing.enabled !== undefined ? existing.enabled : def.enabled,
    };
  });
}
