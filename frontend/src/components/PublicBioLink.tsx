import React, { useState } from 'react';
import { 
  Globe, 
  MessageCircle, 
  FileText, 
  Check, 
  Share2, 
  ShieldCheck, 
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Building2,
  TrendingUp,
  PieChart,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Iconos SVG Vectoriales Oficiales de Redes Sociales
const FacebookIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
  </svg>
);

const YoutubeIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

const LinkedinIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
  </svg>
);

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabaseDirect = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { db: { schema: 'afinitivebd' } })
  : null;

interface PublicBioLinkProps {
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
  { code: 'US', name: 'EE.UU.', dial: '+1', flag: '🇺🇸' },
  { code: 'PA', name: 'Panamá', dial: '+507', flag: '🇵🇦' },
  { code: 'CR', name: 'Costa Rica', dial: '+506', flag: '🇨🇷' },
  { code: 'DO', name: 'Rep. Dom.', dial: '+1', flag: '🇩🇴' },
  { code: 'UY', name: 'Uruguay', dial: '+598', flag: '🇺🇾' },
  { code: 'PY', name: 'Paraguay', dial: '+595', flag: '🇵🇾' },
  { code: 'GT', name: 'Guatemala', dial: '+502', flag: '🇬🇹' },
  { code: 'SV', name: 'El Salvador', dial: '+503', flag: '🇸🇻' },
  { code: 'HN', name: 'Honduras', dial: '+504', flag: '🇭🇳' },
  { code: 'OTRO', name: 'Otro país', dial: '+', flag: '🌐' },
];

const OPCIONES_INVERSION = [
  { id: 'Inmobiliaria', label: 'Inmobiliaria', icon: Building2 },
  { id: 'Bolsa de Valores', label: 'Bolsa de Valores', icon: TrendingUp },
  { id: 'Fondos', label: 'Fondos', icon: PieChart },
];

export default function PublicBioLink({ onBackToDashboard }: PublicBioLinkProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
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

  const getBackendUrl = () => {
    if (typeof window !== 'undefined') {
      const hostname = window.location.hostname;
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return import.meta.env.VITE_BACKEND_URL || 'http://localhost:3080';
      }
      return '';
    }
    return '';
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Dr. Finanzas | Preserva y Multiplica tu Capital',
        text: 'Conoce nuestras alternativas de inversión patrimonial y canales oficiales.',
        url: window.location.href,
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
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
      persona_contacto: 'Bio Link TikTok - Dr. Finanzas',
    };

    let guardadoExitoso = false;
    const backendUrl = getBackendUrl();

    try {
      if (backendUrl) {
        const res = await fetch(`${backendUrl}/api/eventos/dr-finanzas-bio/registro`, {
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
    } catch (err) {
      console.warn('Backend API falló, reintentando con Supabase directo...', err);
    }

    if (!guardadoExitoso && supabaseDirect) {
      try {
        const { error: sbError } = await supabaseDirect
          .from('asistentes_evento')
          .insert({
            evento_id: 'dr-finanzas-bio',
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

  const bioLinks = [
    {
      id: 'registro',
      title: 'Déjanos tus datos para contactarte',
      subtitle: 'Recibe una propuesta de inversión a tu medida',
      icon: FileText,
      iconColor: 'text-amber-700 bg-amber-50 border-amber-200',
      isPrimary: true,
      onClick: () => {
        setSubmitted(false);
        setIsModalOpen(true);
      },
    },
    {
      id: 'web',
      title: 'Nuestra web',
      subtitle: 'Conoce nuestro modelo de Wealth Management',
      icon: Globe,
      iconColor: 'text-blue-700 bg-blue-50 border-blue-200',
      url: 'https://afinitive.com.pe',
    },
    {
      id: 'facebook',
      title: 'Síguenos en Facebook para eventos',
      subtitle: 'Conferencias, transmisiones y networking',
      icon: FacebookIcon,
      iconColor: 'text-[#1877F2] bg-blue-50 border-blue-200',
      url: 'https://facebook.com/afinitivepe',
    },
    {
      id: 'instagram',
      title: 'Síguenos en Instagram y conoce nuestra comunidad',
      subtitle: 'Consejos diarios de educación financiera y patrimonio',
      icon: InstagramIcon,
      iconColor: 'text-[#E1306C] bg-pink-50 border-pink-200',
      url: 'https://instagram.com/afinitive.pe',
    },
    {
      id: 'whatsapp',
      title: 'Escríbenos al WhatsApp',
      subtitle: 'Atención personalizada con un asesor patrimonial',
      icon: MessageCircle,
      iconColor: 'text-emerald-700 bg-emerald-50 border-emerald-200',
      url: 'https://wa.me/51982100208?text=Hola%20Dr.%20Finanzas,%20vi%20tu%20perfil%20de%20TikTok%20y%20deseo%20asesor%C3%ADa%20personalizada.',
    },
    {
      id: 'youtube',
      title: 'Análisis de mercados en YouTube',
      subtitle: 'Videos explicativos, análisis macroeconómico y retornos',
      icon: YoutubeIcon,
      iconColor: 'text-[#FF0000] bg-red-50 border-red-200',
      url: 'https://youtube.com/@afinitivewealth',
    },
    {
      id: 'linkedin',
      title: 'Quién soy en LinkedIn',
      subtitle: 'Ricardo Bertalmio Ruibal • Trayectoria y credenciales',
      icon: LinkedinIcon,
      iconColor: 'text-[#0A66C2] bg-blue-50 border-blue-200',
      url: 'https://www.linkedin.com/in/ricardo-bertalmio-ruibal/',
    },
  ];

  return (
    <div className="min-h-screen w-full bg-[#fdfbf7] text-[#1c1917] font-sans antialiased flex flex-col justify-between py-6 px-4 sm:py-10 selection:bg-amber-100 selection:text-amber-900 relative overflow-x-hidden">
      
      {/* Fondo con textura y matiz de elegancia financiera sutil */}
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(#e7ded3_1px,transparent_1px)] [background-size:24px_24px] opacity-40"></div>

      {/* Botón flotante para operador si aplica */}
      {onBackToDashboard && (
        <button
          onClick={onBackToDashboard}
          className="fixed top-3 left-3 z-40 bg-white/95 backdrop-blur-xs border border-amber-900/15 hover:bg-amber-50 text-stone-800 text-[11px] font-bold px-3 py-1.5 rounded-full shadow-xs transition-all cursor-pointer"
        >
          ← Volver al Panel
        </button>
      )}

      {/* Botón flotante para compartir */}
      <button
        onClick={handleShare}
        className="fixed top-3 right-3 z-40 bg-white/95 backdrop-blur-xs border border-amber-900/15 hover:bg-amber-50 text-stone-800 p-2 rounded-full shadow-xs transition-all cursor-pointer active:scale-95"
        title="Compartir perfil"
      >
        {copiedLink ? (
          <Check className="w-4 h-4 text-emerald-600" />
        ) : (
          <Share2 className="w-4 h-4 text-stone-700" />
        )}
      </button>

      {/* Contenedor Central Estrecho (Formato Móvil Link in Bio) */}
      <div className="w-full max-w-md mx-auto relative z-10 flex flex-col items-center space-y-5">
        
        {/* ================= HEADER: LOGO DR. FINANZAS ================= */}
        <div className="flex flex-col items-center text-center pt-2">
          
          {/* Avatar Circular con Borde de Madera / Oro Fino */}
          <div className="relative mb-3 group">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-[#8B5A2B] via-[#C9A84C] to-[#5c3a1e] shadow-md shadow-amber-950/10">
              <div className="w-full h-full rounded-full overflow-hidden bg-white border-2 border-white">
                <img 
                  src="/ricardo_bertalmio.jpg" 
                  alt="Dr. Finanzas - Ricardo Bertalmio" 
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    // Fallback a foto remota si no carga local
                    (e.target as HTMLImageElement).src = 'https://links.afinitive.com.pe/img/logo_arvol_oscuro_fondo_blanco.png';
                  }}
                />
              </div>
            </div>
            
            {/* Badge de Verificación Oficial */}
            <div className="absolute bottom-1 right-1 bg-blue-600 text-white rounded-full p-1 border-2 border-white shadow-xs" title="Perfil Verificado">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Título & Slogan Oficial */}
          <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight flex items-center gap-1.5 font-serif">
            Dr. Finanzas
          </h1>
          
          <div className="mt-1 inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500/10 border border-amber-600/20 text-[#8B5A2B] text-xs font-bold tracking-wide uppercase">
            Preserva y Multiplica tu Capital
          </div>

          <p className="text-xs text-stone-600 mt-2 max-w-xs font-medium leading-relaxed">
            Estrategias patrimoniales en Inmobiliaria, Bolsa de Valores y Fondos con <b>Afinitive Wealth Management</b>.
          </p>
        </div>

        {/* ================= LISTA VERTICAL DE BOTONES ================= */}
        <div className="w-full space-y-2.5 pt-1">
          {bioLinks.map((item) => {
            const Icon = item.icon;

            if (item.isPrimary) {
              return (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="w-full p-3.5 bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 hover:from-stone-800 hover:to-stone-700 text-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-200 transform active:scale-[0.99] border border-amber-500/30 flex items-center justify-between group cursor-pointer text-left"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-amber-400 text-stone-950 flex items-center justify-center shrink-0 shadow-xs font-bold group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs sm:text-sm font-bold text-white tracking-tight truncate group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </span>
                      <span className="block text-[11px] text-amber-200/80 truncate">
                        {item.subtitle}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-300 shrink-0 opacity-80 group-hover:translate-x-0.5 transition-transform" />
                </button>
              );
            }

            return (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="w-full p-3 bg-white hover:bg-stone-50/90 text-stone-900 rounded-2xl shadow-2xs hover:shadow-sm border border-stone-200/80 hover:border-amber-700/30 transition-all duration-200 transform active:scale-[0.99] flex items-center justify-between group cursor-pointer text-left"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.iconColor} group-hover:scale-105 transition-transform`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-xs sm:text-sm font-bold text-stone-900 tracking-tight truncate group-hover:text-[#8B5A2B] transition-colors">
                      {item.title}
                    </span>
                    <span className="block text-[10px] sm:text-[11px] text-stone-500 truncate">
                      {item.subtitle}
                    </span>
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-stone-400 shrink-0 opacity-60 group-hover:opacity-100 group-hover:text-stone-700 transition-all" />
              </a>
            );
          })}
        </div>

        {/* ================= FOOTER ELEGANTE ================= */}
        <div className="pt-4 pb-2 text-center space-y-1">
          <div className="flex items-center justify-center gap-2">
            <img 
              src="https://links.afinitive.com.pe/img/logo_arvol_oscuro_fondo_blanco.png" 
              alt="Afinitive Logo" 
              className="h-5 object-contain grayscale opacity-70"
            />
          </div>
          <p className="text-[10px] text-stone-400 font-medium">
            Afinitive Wealth Management • Lima, Perú
          </p>
        </div>

      </div>

      {/* ================= MODAL: FORMULARIO "DÉJANOS TUS DATOS" ================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-md max-h-[92vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative">
            
            {/* Botón de Cierre */}
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {submitted ? (
              <div className="text-center py-6 animate-in zoom-in-95 duration-200">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-stone-900 mb-1.5 font-serif">
                  ¡Datos registrados con éxito!
                </h3>
                <p className="text-xs text-stone-600 mb-5 leading-relaxed max-w-xs mx-auto">
                  Gracias <span className="font-bold text-stone-900">{formData.nombre}</span>. El equipo de <b>Dr. Finanzas</b> se comunicará contigo vía WhatsApp o correo electrónico para asesorarte.
                </p>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Cerrar ventana
                </button>
              </div>
            ) : (
              <div>
                {/* Header del Modal */}
                <div className="mb-4 pr-6">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-600/20 text-[#8B5A2B] text-[10px] font-bold uppercase tracking-wider mb-1">
                    Contacto Directo
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-stone-900 font-serif">
                    Déjanos tus datos
                  </h3>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Un asesor patrimonial te contactará de forma confidencial.
                  </p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmitForm} className="space-y-3">
                  
                  {/* Nombre */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                      Nombres completos <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Alejandro Morales"
                      value={formData.nombre}
                      onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition-all"
                    />
                  </div>

                  {/* Celular / WhatsApp */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                      Celular / WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-1.5">
                      <div className="w-[75px] shrink-0 bg-stone-100 border border-stone-300 rounded-xl px-2 py-2 flex items-center justify-center text-xs font-bold text-stone-700">
                        {formData.codigoPais}
                      </div>
                      <input
                        type="tel"
                        required
                        placeholder="987 654 321"
                        value={formData.celular}
                        onChange={(e) => setFormData({ ...formData, celular: e.target.value })}
                        className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition-all"
                      />
                    </div>
                  </div>

                  {/* Correo */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                      Correo electrónico <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alejandro@empresa.com"
                      value={formData.correo}
                      onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-xs sm:text-sm text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-700 focus:bg-white transition-all"
                    />
                  </div>

                  {/* País */}
                  <div>
                    <label className="block text-[11px] font-bold text-stone-700 mb-0.5">
                      País de residencia <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={formData.pais}
                      onChange={(e) => {
                        const sel = e.target.value;
                        const found = PAISES_LATAM.find(p => p.name === sel);
                        setFormData(prev => ({
                          ...prev,
                          pais: sel,
                          codigoPais: found ? found.dial : '+51',
                        }));
                      }}
                      className="w-full bg-stone-50 border border-stone-300 rounded-xl px-2.5 py-2 text-xs sm:text-sm text-stone-900 focus:outline-none focus:border-amber-700 focus:bg-white transition-all cursor-pointer font-medium"
                    >
                      {PAISES_LATAM.map((p) => (
                        <option key={p.code} value={p.name}>
                          {p.flag} {p.name} ({p.dial})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Interés de Inversión */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-stone-700">
                        ¿En qué te interesa invertir?
                      </label>
                      <span className="text-[10px] text-stone-400">Opcional</span>
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
                            className={`py-2 px-1 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                              isSelected
                                ? 'border-amber-700 bg-amber-50 text-[#8B5A2B] font-bold shadow-2xs'
                                : 'border-stone-200 bg-white hover:bg-stone-50 text-stone-700 font-medium'
                            }`}
                          >
                            <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#8B5A2B]' : 'text-stone-400'}`} />
                            <span className="text-[10px] leading-tight truncate w-full">
                              {opcion.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Error si ocurre */}
                  {errorMsg && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded-xl flex items-center gap-1.5 text-red-700 text-[11px]">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-500" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Botón de Envío */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-2.5 px-4 bg-gradient-to-r from-stone-900 to-stone-800 hover:from-stone-800 hover:to-stone-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow transition-all flex items-center justify-center gap-1.5 disabled:opacity-70 cursor-pointer"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando información...</span>
                        </>
                      ) : (
                        <>
                          <span>Solicitar Contacto</span>
                          <Send className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>

                </form>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}
