import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Send, 
  Loader2, 
  AlertCircle,
  Building2,
  TrendingUp,
  PieChart
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

const PAISES_LATAM = [
  { code: 'PE', name: 'Perú', dial: '+51', flag: '🇵🇪' },
  { code: 'MX', name: 'México', dial: '+52', flag: '🇲🇽' },
  { code: 'CO', name: 'Colombia', dial: '+57', flag: '🇨🇴' },
  { code: 'CL', name: 'Chile', dial: '+56', flag: '🇨🇱' },
  { code: 'AR', name: 'Argentina', dial: '+54', flag: '🇦🇷' },
  { code: 'EC', name: 'Ecuador', dial: '+593', flag: '🇪🇨' },
  { code: 'BO', name: 'Bolivia', dial: '+591', flag: '🇧🇴' },
  { code: 'ES', name: 'España', dial: '+34', flag: '🇪🇸' },
  { code: 'US', name: 'EE.UU.', dial: '+1', flag: '🇺🇸' },
  { code: 'PA', name: 'Panamá', dial: '+507', flag: '🇵🇦' },
  { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
  { code: 'DO', name: 'Rep. Dom.', dial: '+1', flag: '🇩🇴' },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
  { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
  { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
  { code: 'OTRO', name: 'Otro', dial: '+', flag: '🌐' },
];

const OPCIONES_INVERSION = [
  { id: 'Inmobiliaria', label: 'Inmobiliaria', icon: Building2 },
  { id: 'Bolsa de Valores', label: 'Bolsa de Valores', icon: TrendingUp },
  { id: 'Fondos', label: 'Fondos', icon: PieChart },
];

export default function PublicGoogleStyleForm({ evento, backendUrl }: PublicGoogleStyleFormProps) {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    celular: '',
    codigoPais: '+51',
    pais: 'Perú',
    interes_inversion: '',
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
      pais: formData.pais,
      interes_inversion: formData.interes_inversion || undefined,
      persona_contacto: 'TikTok Bio Form',
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
            pais: payload.pais,
            interes_inversion: payload.interes_inversion,
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

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedCountryName = e.target.value;
    const found = PAISES_LATAM.find(p => p.name === selectedCountryName);
    setFormData(prev => ({
      ...prev,
      pais: selectedCountryName,
      codigoPais: found ? found.dial : '+51',
    }));
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
                  pais: 'Perú',
                  interes_inversion: '',
                });
              }}
              className="text-xs font-semibold text-[#1a73e8] hover:underline"
            >
              Registrar otra persona
            </button>
          </div>
        ) : (
          /* Formulario Compacto (Entra 100% en 1 sola pantalla móvil) */
          <form onSubmit={handleSubmit} className="space-y-2.5">
            
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

            {/* Campo 4: País */}
            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-0.5">
                País de Residencia
              </label>
              <select
                value={formData.pais}
                onChange={handleCountryChange}
                className="w-full bg-gray-50/50 border border-gray-300 rounded-lg px-2.5 py-2 text-xs sm:text-sm text-gray-900 focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-all cursor-pointer"
              >
                {PAISES_LATAM.map((p) => (
                  <option key={p.code} value={p.name}>
                    {p.flag} {p.name} ({p.dial})
                  </option>
                ))}
              </select>
            </div>

            {/* Campo 5: ¿En qué te interesa invertir? (Opcional - Chips Horizontales Ultra Compactos) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-gray-700">
                  ¿En qué te interesa invertir?
                </label>
                <span className="text-[10px] text-gray-400">Opcional</span>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {OPCIONES_INVERSION.map((opcion) => {
                  const isSelected = formData.interes_inversion === opcion.id;
                  const Icon = opcion.icon;
                  return (
                    <button
                      key={opcion.id}
                      type="button"
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        interes_inversion: isSelected ? '' : opcion.id
                      }))}
                      className={`py-1.5 px-1 rounded-lg border text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                        isSelected
                          ? 'border-[#1a73e8] bg-blue-50 text-[#1a73e8] font-bold shadow-xs'
                          : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 font-medium'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#1a73e8]' : 'text-gray-500'}`} />
                      <span className="text-[10px] leading-tight truncate w-full">
                        {opcion.label}
                      </span>
                    </button>
                  );
                })}
              </div>
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
