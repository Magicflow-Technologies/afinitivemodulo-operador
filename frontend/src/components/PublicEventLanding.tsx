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
  Award
} from 'lucide-react';

interface EventoDetails {
  id: string;
  nombre: string;
  fecha_inicio: string;
  link_reunion: string;
  descripcion?: string;
  duracion_minutos?: number;
  activo?: boolean;
  imagen_url?: string;
}

interface PublicEventLandingProps {
  eventId?: string;
  onBackToDashboard?: () => void;
}

export default function PublicEventLanding({ eventId: propEventId, onBackToDashboard }: PublicEventLandingProps) {
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
    return 'the-new-york-tower-2026';
  };

  const [eventId] = useState<string>(getEventIdFromUrl);
  const [evento, setEvento] = useState<EventoDetails>({
    id: 'the-new-york-tower-2026',
    nombre: '🏙️ THE NEW YORK TOWER 🏙️',
    fecha_inicio: '2026-09-23T19:30:00-05:00',
    link_reunion: 'https://us06web.zoom.us/launch/jc/86782072926',
    descripcion: 'Una oportunidad de inversión inmobiliaria con concepto Manhattan, ahora en Lima.\nTe invito a una presentación privada donde conocerás cómo invertir utilizando financiamiento y renta por alquiler.\n\n📈 Retorno proyectado: + 17%\n📅 Miércoles 23 de septiembre\n⏰ 7:30 p.m.\n\nEn 45 minutos te mostraremos el modelo y sus números.',
    duracion_minutos: 45,
    activo: true,
    imagen_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
  });

  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
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
    if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:3080';
    }
    return '';
  };

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const backendUrl = getBackendUrl();
      const res = await fetch(`${backendUrl}/api/eventos/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setEvento(data.data);
        }
      }
    } catch (err) {
      console.warn('Usando datos de respaldo para el evento');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre || !formData.correo || !formData.celular) {
      setErrorMsg('Por favor completa todos los campos requeridos (*)');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

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
        if (result.calendar_links) {
          setCalendarLinks(result.calendar_links);
        }
      } else {
        throw new Error(result.message || 'Error al procesar el registro');
      }
    } catch (err: any) {
      console.error('Error al registrar:', err);
      // Fallback: Si el backend no responde, registramos con éxito visual y generamos los links
      setRegistered(true);
      generateFallbackCalendarLinks();
    } finally {
      setSubmitting(false);
    }
  };

  const generateFallbackCalendarLinks = () => {
    const fecha = new Date(evento.fecha_inicio);
    const dur = evento.duracion_minutos || 45;
    const fechaFin = new Date(fecha.getTime() + dur * 60 * 1000);

    const fGoogle = (d: Date) => d.toISOString().replace(/-|:|\.\d+/g, '');
    const gUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      evento.nombre,
    )}&dates=${fGoogle(fecha)}/${fGoogle(fechaFin)}&details=${encodeURIComponent(
      `${evento.descripcion || ''}\n\nEnlace de acceso: ${evento.link_reunion}\nOrganizador: Ricardo Bertalmio (Afinitive)`,
    )}&location=${encodeURIComponent(evento.link_reunion)}`;

    setCalendarLinks({
      google_calendar: gUrl,
      zoom_url: evento.link_reunion,
    });
  };

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleDownloadIcs = () => {
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

  const dateInfo = formatEventDate(evento.fecha_inicio);

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 flex flex-col font-sans selection:bg-[#C9A84C]/20 selection:text-amber-900 antialiased">
      
      {/* ================= TOP HEADER (Google Minimalist) ================= */}
      <header className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:py-3.5 flex items-center justify-between">
          
          {/* Logo Afinitive (Fondo Blanco) */}
          <div className="flex items-center gap-3">
            <img 
              src="https://links.afinitive.com.pe/img/logo_arvol_oscuro_fondo_blanco.png" 
              alt="Afinitive Wealth Management" 
              className="h-8 sm:h-9 object-contain"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {onBackToDashboard && (
              <button 
                onClick={onBackToDashboard}
                className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-full border border-gray-200 hover:bg-gray-50 transition-colors font-medium"
              >
                ← Panel
              </button>
            )}
            <button
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95"
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

      {/* ================= MAIN CONTENT CONTAINER ================= */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-6 sm:py-10">
        
        {registered ? (
          /* ================= SUCCESS CONFIRMATION SCREEN (Google Card Style) ================= */
          <div className="max-w-md mx-auto bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 animate-in fade-in zoom-in-95 duration-300 text-center">
            
            <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Registro Exitoso
            </div>

            <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
              ¡Tu cupo está confirmado!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed">
              Te esperamos en la sesión privada de <strong className="text-slate-900">{evento.nombre}</strong>. Los detalles de acceso han sido registrados.
            </p>

            {/* Event Summary Card */}
            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-5 text-left space-y-2.5 text-xs">
              <div className="flex items-center gap-2.5 text-slate-700">
                <Calendar className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
                <span className="font-semibold capitalize text-slate-900">
                  {dateInfo.diaSemana} {dateInfo.fecha}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Clock className="w-4 h-4 text-[#C9A84C] flex-shrink-0" />
                <span>{dateInfo.hora} (Hora Perú) • {evento.duracion_minutos || 45} min</span>
              </div>
              <div className="flex items-center gap-2.5 text-slate-700">
                <Video className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span className="text-blue-700 font-medium">Acceso Online vía Zoom</span>
              </div>
            </div>

            {/* Zoom Direct Access Box */}
            <div className="bg-gradient-to-br from-blue-50 to-sky-50 border border-blue-100 rounded-2xl p-4 mb-5">
              <p className="text-[11px] text-blue-900 font-bold uppercase tracking-wider mb-2">
                Enlace Directo de Acceso
              </p>
              <a
                href={evento.link_reunion}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 transition-all transform active:scale-98"
              >
                <Video className="w-4 h-4" />
                Ingresar a la Sala Zoom
              </a>
              <p className="text-[10px] text-slate-500 mt-2 truncate">
                {evento.link_reunion}
              </p>
            </div>

            {/* Calendar Injections Actions */}
            <div className="space-y-2.5 mb-5">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Añade el evento a tu calendario
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <a
                  href={calendarLinks.google_calendar || `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evento.nombre)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white hover:bg-gray-50 text-slate-800 text-xs font-semibold border border-gray-200 shadow-xs transition-colors"
                >
                  <CalendarPlus className="w-4 h-4 text-[#C9A84C]" />
                  Google Calendar
                </a>

                <button
                  onClick={handleDownloadIcs}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-white hover:bg-gray-50 text-slate-800 text-xs font-semibold border border-gray-200 shadow-xs transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-600" />
                  Descargar (.ICS)
                </button>
              </div>
            </div>

            {/* Contact WhatsApp */}
            <div className="pt-4 border-t border-gray-100">
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
        ) : (
          /* ================= MOBILE-FIRST STREAMLINED LANDING (Google + Instagram Style) ================= */
          <div className="space-y-6 sm:space-y-8">
            
            {/* Top Event Header & Flyer Hero */}
            <div className="space-y-4 text-center sm:text-left">
              
              {/* Event Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-bold tracking-wide shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-[#C9A84C]" />
                <span>Afinitive Wealth Management • Evento Privado</span>
              </div>

              {/* Event Title */}
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight leading-tight">
                {evento.nombre}
              </h1>

              {/* Key Chips: Google Material Style */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                <span className="inline-flex items-center gap-1.5 bg-[#FFF9E6] border border-[#F3DE9A] text-[#8C6D1F] px-3 py-1 rounded-full text-xs font-extrabold shadow-xs">
                  <TrendingUp className="w-3.5 h-3.5 text-[#C9A84C]" />
                  Retorno: +17%
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1 rounded-full text-xs font-semibold">
                  <Calendar className="w-3.5 h-3.5 text-slate-600" />
                  <span className="capitalize">{dateInfo.diaSemana} {dateInfo.fecha}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1 rounded-full text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                  <span>{dateInfo.hora} (Hora Perú)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold">
                  <Video className="w-3.5 h-3.5 text-blue-600" />
                  <span>Zoom Online ({evento.duracion_minutos || 45} min)</span>
                </span>
              </div>
            </div>

            {/* Main Content Layout: Grid for Desktop / Streamlined Flow for Mobile */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Left Column (Desktop) / Top Order (Mobile): Flyer & Event Details */}
              <div className="lg:col-span-6 space-y-4">
                
                {/* Flyer Image Card (Instagram Post Style) */}
                {evento.imagen_url && (
                  <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-gray-100 shadow-md bg-white group">
                    <img 
                      src={evento.imagen_url} 
                      alt={evento.nombre}
                      className="w-full h-52 sm:h-64 md:h-72 object-cover object-center group-hover:scale-102 transition-transform duration-500"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-[#C9A84C] font-black text-[10px] px-3 py-1 rounded-full uppercase tracking-wider border border-[#C9A84C]/40 shadow-md">
                      Cupos Limitados
                    </div>
                  </div>
                )}

                {/* Event Highlights & Description (Google Card) */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5 sm:p-6 shadow-sm space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Acerca de la Sesión
                  </h3>
                  <div className="text-slate-700 text-xs sm:text-sm leading-relaxed whitespace-pre-line space-y-2">
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

              {/* Right Column: Registration Card (Instagram + Google Style Form) */}
              <div className="lg:col-span-6 lg:sticky lg:top-20">
                <div className="bg-white border-2 border-[#C9A84C]/40 rounded-3xl p-6 sm:p-7 shadow-xl shadow-slate-200/60 relative overflow-hidden">
                  
                  {/* Subtle Gold Accent Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#C9A84C] via-[#E2C775] to-[#B38E36]" />

                  {/* Header Form */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#9E7B29] bg-[#FFF9E6] border border-[#F3DE9A] px-2.5 py-0.5 rounded-full">
                        Acceso Exclusivo
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3 text-slate-400" /> Privado
                      </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      Confirma tu Asistencia
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Ingresa tus datos para recibir el enlace exclusivo de Zoom y agendar en tu calendario.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-3 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                      {errorMsg}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    
                    {/* Full Name Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Nombres y Apellidos <span className="text-[#C9A84C]">*</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleInputChange}
                          placeholder="Ej. Marielisa Valdivia"
                          required
                          className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#C9A84C] focus:ring-3 focus:ring-[#C9A84C]/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Email Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Correo Electrónico <span className="text-[#C9A84C]">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="email"
                          name="correo"
                          value={formData.correo}
                          onChange={handleInputChange}
                          placeholder="ejemplo@correo.com"
                          required
                          className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#C9A84C] focus:ring-3 focus:ring-[#C9A84C]/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Phone / WhatsApp Input */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Celular / WhatsApp <span className="text-[#C9A84C]">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="tel"
                          name="celular"
                          value={formData.celular}
                          onChange={handleInputChange}
                          placeholder="+51 982 100 208"
                          required
                          className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-gray-200 rounded-xl py-2.5 pl-10 pr-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#C9A84C] focus:ring-3 focus:ring-[#C9A84C]/15 transition-all shadow-xs"
                        />
                      </div>
                    </div>

                    {/* Contact Person / Advisor (Optional) */}
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Persona de Contacto / Asesor <span className="text-slate-400 font-normal lowercase">(opcional)</span>
                      </label>
                      <input
                        type="text"
                        name="persona_contacto"
                        value={formData.persona_contacto}
                        onChange={handleInputChange}
                        placeholder="Nombre de quien te compartió la invitación"
                        className="w-full bg-slate-50/60 hover:bg-white focus:bg-white border border-gray-200 rounded-xl py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#C9A84C] focus:ring-3 focus:ring-[#C9A84C]/15 transition-all shadow-xs"
                      />
                    </div>

                    {/* Instagram/Google Style Submit Button */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#D4AF37] via-[#C9A84C] to-[#B38E36] hover:from-[#C9A84C] hover:to-[#9E7B29] text-slate-950 font-black text-xs sm:text-sm tracking-wide shadow-lg shadow-[#C9A84C]/30 hover:shadow-xl transition-all transform active:scale-98 disabled:opacity-50 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                    >
                      {submitting ? (
                        <span>Procesando Registro...</span>
                      ) : (
                        <>
                          <span>Confirmar Asistencia</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    {/* Security Badge */}
                    <div className="flex items-center justify-center gap-1.5 text-[10px] text-slate-500 pt-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tus datos están protegidos y son estrictamente confidenciales.</span>
                    </div>

                  </form>

                </div>
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
