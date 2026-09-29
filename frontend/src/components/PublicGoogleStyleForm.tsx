import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Send, 
  Loader2, 
  AlertCircle
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseDirect = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { db: { schema: 'afinitivebd' } })
  : null;

interface EventoDetails {
  id: string;
  nombre: string;
  tipo?: string;
  descripcion?: string;
  imagen_url?: string;
}

interface PublicGoogleStyleFormProps {
  evento: EventoDetails;
  backendUrl: string;
}

export default function PublicGoogleStyleForm({ evento, backendUrl }: PublicGoogleStyleFormProps) {
  // Actualizar dinámicamente Open Graph / Metadatos de previsualización
  React.useEffect(() => {
    const defaultImage = 'https://links.afinitive.com.pe/img/evento.jpeg';
    const imgUrl = evento.imagen_url?.trim() || defaultImage;
    const title = evento.nombre ? `${evento.nombre} | Afinitive` : 'Afinitive Wealth Management';
    const desc = evento.descripcion || 'Completa tus datos para recibir asesoría personalizada y acceso exclusivo.';

    document.title = title;

    const setMetaTag = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', desc);
    setMetaTag('property', 'og:image', imgUrl);
    setMetaTag('property', 'og:image:secure_url', imgUrl);
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', desc);
    setMetaTag('name', 'twitter:image', imgUrl);
  }, [evento]);

  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    celular: '',
    codigoPais: '+51',
    persona_contacto: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.nombre.trim()) {
      setErrorMsg('Ingresa tus nombres completos');
      return;
    }

    if (!formData.celular.trim()) {
      setErrorMsg('Ingresa tu número de WhatsApp');
      return;
    }

    if (!formData.correo.trim() || !formData.correo.includes('@')) {
      setErrorMsg('Ingresa un correo electrónico válido');
      return;
    }

    setSubmitting(true);

    let telefonoFinal = formData.celular.trim();
    if (!telefonoFinal.startsWith('+')) {
      telefonoFinal = `${formData.codigoPais} ${telefonoFinal}`;
    }

    const payload = {
      nombre: formData.nombre.trim(),
      correo: formData.correo.trim().toLowerCase(),
      celular: telefonoFinal,
      persona_contacto: formData.persona_contacto.trim() || 'Link de Registro',
    };

    let guardadoExitoso = false;

    // 1. Intentar Backend API
    try {
      if (backendUrl) {
        const res = await fetch(`${backendUrl}/api/eventos/${evento.id}/registro`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const result = await res.json();
          if (result.success) {
            guardadoExitoso = true;
          }
        }
      }
    } catch (apiErr) {
      console.warn('Backend API falló, reintentando con Supabase directo...', apiErr);
    }

    // 2. Fallback Supabase directo
    if (!guardadoExitoso && supabaseDirect) {
      try {
        const { error: sbError } = await supabaseDirect
          .from('asistentes_evento')
          .insert({
            evento_id: evento.id,
            nombre: payload.nombre,
            correo: payload.correo,
            celular: payload.celular,
            persona_contacto: payload.persona_contacto,
          });

        if (!sbError || sbError.code === '23505') {
          guardadoExitoso = true;
        }
      } catch (directErr) {
        console.error('Error directo:', directErr);
      }
    }

    setSubmitting(false);

    if (guardadoExitoso) {
      setSubmitted(true);
    } else {
      setErrorMsg('Error al enviar. Por favor vuelve a intentar.');
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-white text-[#202124] font-sans antialiased flex flex-col justify-between p-3.5 sm:p-6 select-none">
      
      {/* Contenedor Compacto de Pantalla Completa */}
      <div className="w-full max-w-md mx-auto my-auto flex flex-col justify-center">
        
        {/* Header Compacto */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center mb-1.5">
            <img 
              src="https://links.afinitive.com.pe/img/logo_arvol_oscuro_fondo_blanco.png" 
              alt="Afinitive" 
              className="h-7 sm:h-8 object-contain"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>
          
          <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-snug">
            {evento.nombre || 'Registro de Asesoría'}
          </h1>
          
          <p className="text-xs text-gray-500 mt-0.5 max-w-xs mx-auto line-clamp-2">
            {evento.descripcion || 'Completa tus datos para recibir información personalizada.'}
          </p>
        </div>

        {/* Estado: Confirmación Enviada */}
        {submitted ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              ¡Registro exitoso!
            </h2>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Gracias <span className="font-semibold text-gray-900">{formData.nombre}</span>. Nos comunicaremos contigo por WhatsApp para brindarte todos los detalles.
            </p>
            <button
              type="button"
              onClick={() => {
                setSubmitted(false);
                setFormData({
                  nombre: '',
                  correo: '',
                  celular: '',
                  codigoPais: '+51',
                  persona_contacto: '',
                });
              }}
              className="text-xs font-semibold text-[#1a73e8] hover:underline"
            >
              Registrar otra persona
            </button>
          </div>
        ) : (
          /* Formulario Compacto (Entra 100% en 1 sola pantalla móvil) */
          <form onSubmit={handleSubmit} className="space-y-3">
            
            {/* Campo 1: Nombres Completos */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                Nombres y Apellidos
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos Ramírez"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full bg-gray-50/50 border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
              />
            </div>

            {/* Campo 2: Celular WhatsApp (Con selector de código) */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                Número de Celular / WhatsApp
              </label>
              <div className="flex gap-1.5">
                <div className="w-[72px] shrink-0 bg-gray-100 border border-gray-300 rounded-lg px-2 py-2 flex items-center justify-center text-xs font-medium text-gray-700">
                  {formData.codigoPais}
                </div>
                <input
                  type="tel"
                  required
                  placeholder="987 654 321"
                  value={formData.celular}
                  onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                  className="w-full bg-gray-50/50 border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
                />
              </div>
            </div>

            {/* Campo 3: Correo Electrónico */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                placeholder="carlos@correo.com"
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                className="w-full bg-gray-50/50 border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
              />
            </div>

            {/* Campo 4: ¿Quién te contactó? */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                ¿Quién te contactó?
              </label>
              <input
                type="text"
                placeholder="Ej: Nombre de asesor o contacto"
                value={formData.persona_contacto}
                onChange={(e) => setFormData({ ...formData, persona_contacto: e.target.value })}
                className="w-full bg-gray-50/50 border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all"
              />
            </div>

            {/* Mensaje de Error */}
            {errorMsg && (
              <div className="p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-1.5 text-red-700 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botón de Envío Principal Estilo Google */}
            <div className="pt-1">
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] active:bg-[#174ea6] text-white font-semibold text-xs sm:text-sm rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-70 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar Registro</span>
                    <Send className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>

      {/* Footer Mínimo */}
      <div className="text-center text-[10px] text-gray-400 py-1">
        Afinitive Wealth Management © {new Date().getFullYear()}
      </div>

    </div>
  );
}
