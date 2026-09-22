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
  onBackToDashboard?: () => void;
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
  { code: 'US', name: 'Estados Unidos', dial: '+1', flag: '🇺🇸' },
  { code: 'PA', name: 'Panamá', dial: '+507', flag: '🇵🇦' },
  { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
  { code: 'DO', name: 'República Dominicana', dial: '+1', flag: '🇩🇴' },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
  { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
  { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
  { code: 'OTRO', name: 'Otro país', dial: '+', flag: '🌐' },
];

const OPCIONES_INVERSION = [
  'Inmobiliaria',
  'Bolsa de Valores',
  'Fondos',
];

export default function PublicGoogleStyleForm({ evento, backendUrl, onBackToDashboard }: PublicGoogleStyleFormProps) {
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
      setErrorMsg('Por favor ingresa tus nombres completos');
      return;
    }

    if (!formData.celular.trim()) {
      setErrorMsg('Por favor ingresa tu número de celular o WhatsApp');
      return;
    }

    if (!formData.correo.trim() || !formData.correo.includes('@')) {
      setErrorMsg('Por favor ingresa un correo electrónico válido');
      return;
    }

    setSubmitting(true);

    // Formatear celular con código internacional
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
      persona_contacto: 'Formulario TikTok / Redes',
    };

    let guardadoExitoso = false;

    // 1. Intentar registrar a través del Backend API
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
      console.warn('Backend no respondió, intentando fallback directo en Supabase...', apiErr);
    }

    // 2. Fallback de respaldo directo en Supabase si el backend estuviera inaccesible
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

        if (!sbError) {
          guardadoExitoso = true;
        } else if (sbError.code === '23505') {
          // Ya estaba registrado (clave única)
          guardadoExitoso = true;
        }
      } catch (directErr) {
        console.error('Error en Supabase directo:', directErr);
      }
    }

    setSubmitting(false);

    if (guardadoExitoso) {
      setSubmitted(true);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      setErrorMsg('No se pudo procesar tu registro. Por favor verifica tu conexión y vuelve a intentar.');
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
    <div className="min-h-screen bg-[#f0f4f8] text-[#202124] font-sans antialiased py-6 px-4 sm:py-12 sm:px-6 flex flex-col items-center justify-center selection:bg-blue-100 selection:text-blue-900">
      
      {/* Botón flotante para volver al panel si es operador */}
      {onBackToDashboard && (
        <button
          onClick={onBackToDashboard}
          className="fixed top-4 left-4 z-50 bg-white/90 backdrop-blur border border-gray-300 text-gray-700 text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm hover:bg-gray-100 transition-all"
        >
          ← Volver al Dashboard
        </button>
      )}

      {/* Contenedor Principal Estilo Google Form */}
      <div className="w-full max-w-xl space-y-4">
        
        {/* Banner Superior Decorativo / Imagen Opcional */}
        {evento.imagen_url && (
          <div className="w-full h-40 sm:h-52 rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
            <img 
              src={evento.imagen_url} 
              alt={evento.nombre} 
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Tarjeta de Encabezado / Título */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden relative">
          {/* Barra superior de acento Google Forms */}
          <div className="h-2.5 bg-[#1a73e8] w-full" />
          
          <div className="p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-snug">
              {evento.nombre || 'Formulario de Registro'}
            </h1>
            
            {evento.descripcion ? (
              <div className="mt-3 text-sm sm:text-base text-gray-700 whitespace-pre-line leading-relaxed border-t border-gray-100 pt-3">
                {evento.descripcion}
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-600">
                Por favor completa los siguientes datos para brindarte información exclusiva y personalizada.
              </p>
            )}

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center text-xs text-red-600 font-medium">
              * Indica que la pregunta es obligatoria
            </div>
          </div>
        </div>

        {/* Pantalla de Confirmación / Envío Exitoso */}
        {submitted ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-10 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-200 text-green-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              ¡Se ha registrado tu respuesta!
            </h2>
            <p className="text-gray-600 text-sm sm:text-base max-w-md mx-auto leading-relaxed mb-6">
              Gracias por tu interés, <span className="font-semibold text-gray-900">{formData.nombre}</span>. Un asesor ejecutivo se pondrá en contacto contigo muy pronto a través de WhatsApp o correo electrónico.
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
              className="text-sm font-medium text-[#1a73e8] hover:text-blue-800 hover:underline transition-all"
            >
              Enviar otra respuesta
            </button>
          </div>
        ) : (
          /* Formulario Interactivo */
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Campo 1: Nombres Completos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1">
                Nombres completos <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">Escribe tu nombre y apellido</p>
              <input
                type="text"
                required
                placeholder="Tu respuesta"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full text-sm sm:text-base text-gray-900 pb-2 border-b border-gray-300 focus:border-[#1a73e8] outline-none transition-colors placeholder-gray-400 bg-transparent"
              />
            </div>

            {/* Campo 2: Celular / WhatsApp */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1">
                Número de Celular / WhatsApp <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">Para enviarte detalles directos y novedades</p>
              
              <div className="flex gap-2 items-center">
                <div className="w-24 shrink-0 border-b border-gray-300 pb-2 flex items-center justify-between text-sm text-gray-700 font-medium">
                  <span>{formData.codigoPais}</span>
                </div>
                <input
                  type="tel"
                  required
                  placeholder="Ej: 987 654 321"
                  value={formData.celular}
                  onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                  className="w-full text-sm sm:text-base text-gray-900 pb-2 border-b border-gray-300 focus:border-[#1a73e8] outline-none transition-colors placeholder-gray-400 bg-transparent"
                />
              </div>
            </div>

            {/* Campo 3: Correo Electrónico */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">Dirección donde recibirás las presentaciones e informes</p>
              <input
                type="email"
                required
                placeholder="ejemplo@correo.com"
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                className="w-full text-sm sm:text-base text-gray-900 pb-2 border-b border-gray-300 focus:border-[#1a73e8] outline-none transition-colors placeholder-gray-400 bg-transparent"
              />
            </div>

            {/* Campo 4: País de Residencia */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:border-gray-300 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
              <label className="block text-sm sm:text-base font-semibold text-gray-900 mb-1">
                País de residencia <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">Selecciona tu país actual</p>
              
              <select
                value={formData.pais}
                onChange={handleCountryChange}
                className="w-full text-sm sm:text-base text-gray-900 pb-2 border-b border-gray-300 focus:border-[#1a73e8] outline-none bg-transparent cursor-pointer"
              >
                {PAISES_LATAM.map((pais) => (
                  <option key={pais.code} value={pais.name}>
                    {pais.flag} {pais.name} ({pais.dial})
                  </option>
                ))}
              </select>
            </div>

            {/* Campo 5: ¿En qué te interesa invertir? (Opcional - Únicamente Inmobiliaria, Bolsa de Valores, Fondos) */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 transition-all hover:border-gray-300">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm sm:text-base font-semibold text-gray-900">
                  ¿En qué te interesa invertir?
                </label>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                  Opcional
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Elige el área de tu principal preferencia</p>

              <div className="space-y-3">
                {OPCIONES_INVERSION.map((opcion) => (
                  <label
                    key={opcion}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                      formData.interes_inversion === opcion
                        ? 'border-[#1a73e8] bg-blue-50/40 text-blue-900'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-800'
                    }`}
                  >
                    <input
                      type="radio"
                      name="interes_inversion"
                      value={opcion}
                      checked={formData.interes_inversion === opcion}
                      onChange={(e) => setFormData({ ...formData, interes_inversion: e.target.value })}
                      className="w-4 h-4 text-[#1a73e8] focus:ring-[#1a73e8] border-gray-300"
                    />
                    <span className="text-sm font-medium">{opcion}</span>
                  </label>
                ))}

                {formData.interes_inversion && (
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, interes_inversion: '' })}
                    className="text-xs text-gray-500 hover:text-gray-700 underline mt-1"
                  >
                    Borrar selección
                  </button>
                )}
              </div>
            </div>

            {/* Mensaje de Error si ocurre */}
            {errorMsg && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botón de Envío y Pie */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto px-8 py-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-sm rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando respuesta...</span>
                  </>
                ) : (
                  <>
                    <span>Enviar</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData({
                    nombre: '',
                    correo: '',
                    celular: '',
                    codigoPais: '+51',
                    pais: 'Perú',
                    interes_inversion: '',
                  });
                  setErrorMsg(null);
                }}
                className="text-xs text-gray-500 hover:text-gray-800 font-medium transition-colors"
              >
                Borrar formulario
              </button>
            </div>
          </form>
        )}

        {/* Footer Minimalista */}
        <div className="text-center text-xs text-gray-500 pt-6 pb-2">
          <span>Formulario protegido por Afinitive Wealth Management.</span>
        </div>
      </div>
    </div>
  );
}
