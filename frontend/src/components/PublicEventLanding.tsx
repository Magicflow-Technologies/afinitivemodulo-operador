import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  Video, 
  User, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Share2, 
  CalendarPlus, 
  Download, 
  MessageCircle, 
  Sparkles, 
  ArrowRight,
  Check,
  Lock,
  Award,
  Building2
} from 'lucide-react';

import { createClient } from '@supabase/supabase-js';
import PublicGoogleStyleForm from './PublicGoogleStyleForm';

// Cliente Supabase para lectura directa de respaldo
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mqsupabase.dashbportal.com';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseDirect = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey, { db: { schema: 'afinitivebd' } })
  : null;

interface EventoDetails {
  id: string;
  nombre: string;
  tipo?: string;
  fecha_inicio: string;
  link_reunion: string;
  descripcion?: string;
  duracion_minutos?: number;
  activo?: boolean;
  imagen_url?: string;
}

interface PublicEventLandingProps {
  eventId?: string;
}

export default function PublicEventLanding({ eventId: propEventId }: PublicEventLandingProps) {
  // Obtener ID del evento desde query params o hash si no viene en props
  const getEventIdFromUrl = () => {
    if (propEventId) return propEventId;
    const urlParams = new URLSearchParams(window.location.search);
    const queryId = urlParams.get('id') || urlParams.get('evento_id') || urlParams.get('evento');
    if (queryId) return queryId;

    const hash = window.location.hash;
    if (hash.includes('evento=')) {
      return hash.split('evento=')[1].split('&')[0];
    }
    if (hash.includes('/evento/')) {
      return hash.split('/evento/')[1].split('?')[0];
    }
    return '';
  };

  const [eventId] = useState<string>(getEventIdFromUrl);
  const [evento, setEvento] = useState<EventoDetails | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    celular: '',
    persona_contacto: '',
  });

  // Calendar Links from API Response
  const [calendarLinks, setCalendarLinks] = useState<{ google_calendar?: string; zoom_url?: string }>({});

  // Helper para resolver la URL del backend dinámicamente
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

  // Parser para extraer imagen_url si está embebida en la descripción
  const parseEventData = (data: any): EventoDetails => {
    if (!data) return data;
    let imagen_url = data.imagen_url;
    let descripcion = data.descripcion || '';

    if (!imagen_url && descripcion && descripcion.includes('[IMG_URL:')) {
      const match = descripcion.match(/\[IMG_URL:(.*?)\]/);
      if (match) {
        imagen_url = match[1];
        descripcion = descripcion.replace(/\[IMG_URL:.*?\]\n?/, '');
      }
    }

    if (descripcion) {
      descripcion = descripcion.replace(/En \d+ minutos te mostraremos el modelo y sus números\.?/gi, 'Te mostraremos el modelo financiero y sus números.');
    }

    return {
      ...data,
      imagen_url: imagen_url || data.imagen_url,
      descripcion,
    };
  };

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    setLoadingEvent(true);
    const backendUrl = getBackendUrl();

    // 1. Si hay un ID específico, consultar ese evento
    if (eventId) {
      try {
        if (backendUrl) {
          const res = await fetch(`${backendUrl}/api/eventos/${eventId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
              setEvento(parseEventData(data.data));
              setLoadingEvent(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn('Backend API falló buscando evento específico, probando Supabase directo...', err);
      }

      if (supabaseDirect) {
        try {
          const { data, error } = await supabaseDirect
            .from('eventos')
            .select('*')
            .eq('id', eventId)
            .maybeSingle();

          if (!error && data) {
            setEvento(parseEventData(data));
            setLoadingEvent(false);
            return;
          }
        } catch (sbErr) {
          console.error('Error en Supabase directo:', sbErr);
        }
      }
    }

    // 2. Si NO hay ID específico o no se encontró, consultar el evento/formulario activo más reciente
    try {
      if (backendUrl) {
        const res = await fetch(`${backendUrl}/api/eventos`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.data) && data.data.length > 0) {
            const activo = data.data.find((e: any) => e.activo !== false) || data.data[0];
            setEvento(parseEventData(activo));
            setLoadingEvent(false);
            return;
          }
        }
      }
    } catch (err) {
      console.warn('Error al buscar evento más reciente en backend:', err);
    }

    if (supabaseDirect) {
      try {
        const { data, error } = await supabaseDirect
          .from('eventos')
          .select('*')
          .eq('activo', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data) {
          setEvento(parseEventData(data));
          setLoadingEvent(false);
          return;
        }
      } catch (sbErr) {
        console.error('Error al consultar evento activo en Supabase:', sbErr);
      }
    }

    setEvento(null);
    setLoadingEvent(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const getGoogleCalendarUrl = (ev: EventoDetails) => {
    const fecha = new Date(ev.fecha_inicio);
    const dur = ev.duracion_minutos || 60;
    const fechaFin = new Date(fecha.getTime() + dur * 60 * 1000);

    const fGoogle = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      ev.nombre,
    )}&dates=${fGoogle(fecha)}/${fGoogle(fechaFin)}&details=${encodeURIComponent(
      `${ev.descripcion || ''}\n\n💻 Enlace de acceso Zoom: ${ev.link_reunion}\n\nOrganizado por Ricardo Bertalmio - Afinitive Wealth Management.`,
    )}&location=${encodeURIComponent(ev.link_reunion)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evento) return;
    if (!formData.nombre || !formData.correo || !formData.celular) {
      setErrorMsg('Por favor completa todos los campos requeridos (*)');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    // 1. Generar URL de Google Calendar y abrirla de inmediato en el mismo gesto de clic
    // para evitar que el navegador móvil o WebView (Instagram/TikTok/WhatsApp) lo bloquee como popup
    const gCalendarUrl = getGoogleCalendarUrl(evento);
    setCalendarLinks({
      google_calendar: gCalendarUrl,
      zoom_url: evento.link_reunion,
    });

    try {
      window.open(gCalendarUrl, '_blank');
    } catch (popupErr) {
      console.warn('No se pudo abrir automáticamente Google Calendar:', popupErr);
    }

    // 2. Enviar registro al backend en segundo plano
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/eventos/${evento.id}/registro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setRegistered(true);
        if (result.ya_registrado) {
          setIsAlreadyRegistered(true);
        }
        if (result.calendar_links) {
          setCalendarLinks(result.calendar_links);
        }
      } else {
        // Si hay error en la respuesta del backend pero tenemos los datos, mostramos confirmación visual
        setRegistered(true);
      }
    } catch (err: any) {
      console.error('Error al registrar en backend:', err);
      setRegistered(true);
    } finally {
      setSubmitting(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadIcs = () => {
    if (!evento) return;
    const backendUrl = getBackendUrl();
    window.open(`${backendUrl}/api/eventos/${evento.id}/ics`, '_blank');
  };

  const formatEventDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return {
        diaSemana: d.toLocaleDateString('es-PE', { weekday: 'long', timeZone: 'America/Lima' }),
        fecha: d.toLocaleDateString('es-PE', { day: 'numeric', month: 'long', timeZone: 'America/Lima' }),
        hora: d.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'America/Lima' }),
      };
    } catch {
      return { diaSemana: 'Miércoles', fecha: '23 de septiembre', hora: '7:30 p.m.' };
    }
  };

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-xs text-gray-500 font-medium">Cargando...</p>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <img 
            src="https://links.afinitive.com.pe/img/logo_arvol_oscuro_fondo_blanco.png" 
            alt="Afinitive" 
            className="h-9 mx-auto mb-4 object-contain"
          />
          <h2 className="text-xl font-bold text-gray-900">Enlace no disponible</h2>
          <p className="text-xs text-gray-500 leading-relaxed">
            El evento o formulario al que intentas acceder ha sido finalizado, eliminado o no existe actualmente.
          </p>
          <a
            href="https://afinitive.com.pe"
            className="inline-block mt-4 px-5 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-semibold hover:bg-gray-800 transition-colors"
          >
            Ir al sitio principal
          </a>
        </div>
      </div>
    );
  }

  const dateInfo = formatEventDate(evento.fecha_inicio || '');

  // Si el evento es un formulario de captura / TikTok / Bio Link, renderizar la interfaz estilo Google
  if (evento.tipo === 'lead_form') {
    return (
      <PublicGoogleStyleForm 
        evento={evento} 
        backendUrl={getBackendUrl()} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 flex flex-col font-sans selection:bg-[#C9A84C]/20 selection:text-amber-900 antialiased">
      
      {/* ================= TOP HEADER (Google Minimalist) ================= */}
      <header className="border-b border-gray-100 bg-white/95 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          
          {/* Logo Afinitive (Fondo Blanco) */}
          <div className="flex items-center gap-2">
            <img 
              src="https://links.afinitive.com.pe/img/logo_arvol_oscuro_fondo_blanco.png" 
              alt="Afinitive Wealth Management" 
              className="h-8 sm:h-9 object-contain"
            />
          </div>

          {/* Share Action */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 cursor-pointer"
              title="Compartir enlace de invitación"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copiado</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Compartir</span>
                </>
              )}
            </button>
          </div>

        </div>
      </header>

      {/* ================= MAIN CONTAINER ================= */}
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 sm:py-8">
        
        {!registered ? (
          /* ================= STEP 1: LEAD CAPTURE FORM (Instagram / Direct Registration Style) ================= */
          <div className="space-y-5 animate-in fade-in duration-300">
            
            {/* Event Header Pill & Title */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-[#8C6D1F] text-[11px] font-extrabold tracking-wide shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>Sesión Privada Exclusiva</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                {evento.nombre}
              </h1>

              {/* Fast Highlights Chips (Sin duración) */}
              <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 text-xs">
                <span className="inline-flex items-center gap-1 bg-[#FFF9E6] border border-[#F3DE9A] text-[#8C6D1F] px-2.5 py-1 rounded-full font-bold shadow-xs">
                  <TrendingUp className="w-3 h-3 text-[#C9A84C]" />
                  Retorno: +17%
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-full font-semibold">
                  <Calendar className="w-3 h-3 text-slate-600" />
                  <span className="capitalize">{dateInfo.diaSemana} {dateInfo.fecha}</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-800 px-2.5 py-1 rounded-full font-semibold">
                  <Clock className="w-3 h-3 text-slate-600" />
                  <span>{dateInfo.hora}</span>
                </span>
                <span className="inline-flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-full font-semibold">
                  <Video className="w-3 h-3 text-blue-600" />
                  <span>En Vivo por Zoom</span>
                </span>
              </div>
            </div>

            {/* Registration Card (High-Conversion Instagram / Mobile First Style) */}
            <div className="bg-white border-2 border-[#C9A84C]/70 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-slate-300/70 relative overflow-hidden">
              
              {/* Subtle Gold Accent Bar */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#D4AF37] via-[#F3DE9A] to-[#B38E36]" />

              {/* Card Title */}
              <div className="mb-5 text-center sm:text-left">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#8C6D1F] bg-[#FEF3C7] border border-[#F3DE9A] px-3 py-0.5 rounded-full shadow-xs">
                    Cupos Limitados
                  </span>
                  <span className="text-[11px] text-slate-500 font-semibold flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Registro Inmediato
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  Confirma tu Asistencia
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 mt-1">
                  Ingresa tus datos para acceder a la sala privada de Zoom y conocer los detalles del proyecto.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 mb-4 rounded-2xl bg-red-50 border-2 border-red-200 text-red-700 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Full Name Input (Contraste alto & Touch Friendly 52px) */}
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">
                    Nombres y Apellidos <span className="text-[#C9A84C] font-black">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      placeholder="Ej. Marielisa Valdivia"
                      required
                      className="w-full bg-[#F8FAFC] hover:bg-white focus:bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-[#C9A84C] rounded-2xl py-3.5 pl-11 pr-4 text-sm sm:text-base text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-4 focus:ring-[#C9A84C]/20 transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Email Input (Contraste alto & Touch Friendly 52px) */}
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">
                    Correo Electrónico <span className="text-[#C9A84C] font-black">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      onChange={handleInputChange}
                      placeholder="ejemplo@correo.com"
                      required
                      className="w-full bg-[#F8FAFC] hover:bg-white focus:bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-[#C9A84C] rounded-2xl py-3.5 pl-11 pr-4 text-sm sm:text-base text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-4 focus:ring-[#C9A84C]/20 transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Phone / WhatsApp Input (Contraste alto & Touch Friendly 52px) */}
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">
                    Celular / WhatsApp <span className="text-[#C9A84C] font-black">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-5 h-5 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="tel"
                      name="celular"
                      value={formData.celular}
                      onChange={handleInputChange}
                      placeholder="+51 982 100 208"
                      required
                      className="w-full bg-[#F8FAFC] hover:bg-white focus:bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-[#C9A84C] rounded-2xl py-3.5 pl-11 pr-4 text-sm sm:text-base text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-4 focus:ring-[#C9A84C]/20 transition-all shadow-xs"
                    />
                  </div>
                </div>

                {/* Contact Person / Advisor (Optional) */}
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wide mb-1.5">
                    Persona de Contacto / Asesor <span className="text-slate-400 font-normal lowercase text-[11px]">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    name="persona_contacto"
                    value={formData.persona_contacto}
                    onChange={handleInputChange}
                    placeholder="Nombre de quien te compartió la invitación"
                    className="w-full bg-[#F8FAFC] hover:bg-white focus:bg-white border-2 border-slate-300 hover:border-slate-400 focus:border-[#C9A84C] rounded-2xl py-3 px-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-medium focus:outline-none focus:ring-4 focus:ring-[#C9A84C]/20 transition-all shadow-xs"
                  />
                </div>

                {/* Instagram/Google Style Submit CTA Button (1-Click Calendar Auto-Launch) */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#C9A84C] to-[#B38E36] hover:from-[#C9A84C] hover:to-[#9E7B29] text-slate-950 font-black text-sm sm:text-base tracking-wide shadow-xl shadow-[#C9A84C]/35 hover:shadow-2xl transition-all transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2.5 mt-5 cursor-pointer"
                >
                  {submitting ? (
                    <span>Registrando y abriendo calendario...</span>
                  ) : (
                    <>
                      <CalendarPlus className="w-5 h-5 text-slate-950" />
                      <span>Confirmar Asistencia y Agendar</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

                {/* Micro-indicación de auto apertura */}
                <p className="text-xs text-center text-slate-600 font-semibold pt-1">
                  ⚡ Tu Google Calendar se abrirá automáticamente para guardar el evento.
                </p>

                {/* Security Trust Note */}
                <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 pt-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Registro seguro con Afinitive Wealth Management.</span>
                </div>

              </form>

            </div>

            {/* Host Quick Bio */}
            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-2xl p-3.5 shadow-xs">
              <img 
                src="https://dashbportal.com/afinitive/rbertalmio.png" 
                alt="Ricardo Bertalmio" 
                className="w-11 h-11 rounded-full object-cover border-2 border-[#C9A84C] shadow-xs flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-slate-900 truncate">Ricardo Bertalmio Ruibal</h4>
                  <Award className="w-3.5 h-3.5 text-[#C9A84C] flex-shrink-0" />
                </div>
                <p className="text-[11px] text-[#A68227] font-semibold truncate">CEO Afinitive Wealth Management</p>
                <p className="text-[10px] text-slate-500 truncate">Estructuración Patrimonial & Rentas Inmobiliarias</p>
              </div>
            </div>

          </div>
        ) : (
          /* ================= STEP 2: FULL REVEAL OF ALL EVENT INFO & CONFIRMATION ================= */
          <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            
            {/* Top Success Badge */}
            <div className={`bg-white border-2 ${isAlreadyRegistered ? 'border-amber-400/40' : 'border-emerald-500/30'} rounded-3xl p-6 shadow-xl shadow-slate-200/70 text-center`}>
              <div className={`w-16 h-16 ${isAlreadyRegistered ? 'bg-amber-50 border-2 border-amber-200 text-amber-600' : 'bg-emerald-50 border-2 border-emerald-200 text-emerald-600'} rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm animate-bounce`}>
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <span className={`text-[10px] font-extrabold uppercase tracking-wider ${isAlreadyRegistered ? 'text-amber-800 bg-amber-50 border border-amber-200' : 'text-emerald-800 bg-emerald-50 border border-emerald-200'} px-3 py-1 rounded-full inline-block mb-2`}>
                {isAlreadyRegistered ? '✓ Ya estabas registrado para este evento' : '¡Tu Cupo está Confirmado!'}
              </span>

              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {isAlreadyRegistered ? `¡Hola de nuevo, ${formData.nombre.split(' ')[0]}!` : `¡Listo, ${formData.nombre.split(' ')[0]}!`}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-md mx-auto">
                {isAlreadyRegistered 
                  ? 'Tu lugar ya se encuentra asegurado en nuestra lista. A continuación tienes el enlace oficial de Zoom y los detalles del evento:' 
                  : 'Tu asistencia ha sido registrada exitosamente. A continuación tienes el enlace oficial de Zoom y todos los detalles del evento:'}
              </p>

              {/* Direct Zoom Room Button */}
              <div className="mt-5 p-4 bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 rounded-2xl">
                <p className="text-[11px] text-blue-900 font-bold uppercase tracking-wider mb-2">
                  Enlace Directo de la Sala Zoom
                </p>
                <a
                  href={evento.link_reunion}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-sm shadow-md shadow-blue-600/20 transition-all transform active:scale-98"
                >
                  <Video className="w-4 h-4" />
                  Ingresar a la Sala Zoom Oficial
                </a>
                <p className="text-[10px] text-slate-500 mt-2 truncate font-mono">
                  {evento.link_reunion}
                </p>
              </div>

              {/* Calendar Injections Actions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                <a
                  href={calendarLinks.google_calendar || `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evento.nombre)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 shadow-xs transition-colors"
                >
                  <CalendarPlus className="w-4 h-4 text-[#C9A84C]" />
                  Añadir a Google Calendar
                </a>

                <button
                  onClick={handleDownloadIcs}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold border border-slate-200 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  Descargar (.ICS)
                </button>
              </div>

              {/* WhatsApp Contact Link */}
              <div className="pt-4 mt-4 border-t border-gray-100">
                <a
                  href={`https://wa.me/51982100208?text=${encodeURIComponent(`Hola Ricardo, me acabo de registrar al evento "${evento.nombre}".`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-xs text-emerald-700 hover:text-emerald-800 transition-colors font-semibold"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                  ¿Dudas sobre el evento? Escríbenos por WhatsApp
                </a>
              </div>
            </div>

            {/* Flyer Image Card - IMAGEN 100% COMPLETA SIN RECORTES */}
            {evento.imagen_url && (
              <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-200/80 shadow-md bg-white p-0">
                <img 
                  src={evento.imagen_url} 
                  alt={evento.nombre}
                  className="w-full h-auto max-w-full block rounded-2xl sm:rounded-3xl"
                  style={{ width: '100%', height: 'auto', maxHeight: 'none', objectFit: 'contain', display: 'block' }}
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}

            {/* Complete Event Details & Value Proposition (Sin duración) */}
            <div className="bg-white border border-gray-100 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
              
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                <Building2 className="w-4 h-4 text-[#C9A84C]" />
                <span>Propuesta de Valor & Oportunidad</span>
              </div>

              {/* Badges Grid (Sin duración) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="bg-[#FFF9E6] border border-[#F3DE9A] rounded-xl p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-[#C9A84C] mx-auto mb-1" />
                  <span className="text-[10px] text-[#8C6D1F] font-bold block">Retorno Proyectado</span>
                  <span className="text-sm font-black text-[#8C6D1F]">+ 17%</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <Calendar className="w-4 h-4 text-slate-600 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-500 font-bold block">Fecha</span>
                  <span className="text-xs font-bold text-slate-800 capitalize">{dateInfo.fecha}</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                  <Clock className="w-4 h-4 text-slate-600 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-500 font-bold block">Hora de Lima</span>
                  <span className="text-xs font-bold text-slate-800">{dateInfo.hora}</span>
                </div>
              </div>

              {/* Description Body */}
              <div className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line pt-2 border-t border-gray-100">
                {evento.descripcion || 'Te invitamos a esta sesión privada con Ricardo Bertalmio para descubrir las mejores oportunidades de inversión patrimonial.'}
              </div>

            </div>

            {/* Host Presenter Card */}
            <div className="flex items-center gap-3.5 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
              <img 
                src="https://dashbportal.com/afinitive/rbertalmio.png" 
                alt="Ricardo Bertalmio" 
                className="w-12 h-12 rounded-full object-cover border-2 border-[#C9A84C] shadow-sm flex-shrink-0"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div>
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">Ricardo Bertalmio Ruibal</h4>
                  <Award className="w-3.5 h-3.5 text-[#C9A84C]" />
                </div>
                <p className="text-[11px] text-[#A68227] font-semibold">CEO Afinitive Wealth Management</p>
                <p className="text-[10px] text-slate-500">Estructuración Patrimonial & Rentas Inmobiliarias</p>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* ================= MINIMALIST CLEAN FOOTER ================= */}
      <footer className="border-t border-gray-100 bg-white py-6 px-4 text-center text-xs text-slate-400 mt-auto">
        <p className="font-medium text-slate-600">Afinitive Wealth Management</p>
        <p className="text-[11px] text-slate-400 mt-0.5">San Isidro, Lima, Perú • Todos los derechos reservados</p>
      </footer>

    </div>
  );
}
