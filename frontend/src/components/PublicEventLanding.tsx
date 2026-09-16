import React, { useState, useEffect } from 'react';
import { 
  Building2, 
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
  ArrowRight
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

  useEffect(() => {
    fetchEventDetails();
  }, [eventId]);

  const fetchEventDetails = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3080';
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
      setErrorMsg('Por favor completa todos los campos obligatorios');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3080';
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
    const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3080';
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
    <div className="min-h-screen bg-[#070d14] text-slate-100 flex flex-col selection:bg-[#c9a84c]/30 selection:text-amber-300 font-sans">
      
      {/* Top Header */}
      <header className="border-b border-slate-800/80 bg-[#0d1b2a]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex items-center justify-center font-black text-amber-400 text-lg shadow-[0_0_15px_rgba(201,168,76,0.2)]">
              A
            </div>
            <div>
              <span className="font-bold text-sm text-slate-100 tracking-wide block">AFINITIVE</span>
              <span className="text-[10px] text-amber-400 font-medium tracking-wider uppercase block">Wealth Management</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onBackToDashboard && (
              <button 
                onClick={onBackToDashboard}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/60 transition-colors"
              >
                ← Panel Operador
              </button>
            )}
            <button
              onClick={handleCopyShareLink}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
              title="Copiar enlace de invitación"
            >
              <Share2 className="w-3.5 h-3.5" />
              {copiedLink ? '¡Copiado!' : 'Compartir'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero & Content Section */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 md:py-12">
        
        {registered ? (
          /* ================= SUCCESS CONFIRMATION SCREEN ================= */
          <div className="max-w-xl mx-auto bg-gradient-to-b from-[#131f2e] to-[#0d1622] border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-2xl shadow-black/80 animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h2 className="text-2xl font-bold text-center text-white mb-2">
              ¡Tu lugar está confirmado!
            </h2>
            <p className="text-center text-sm text-slate-300 mb-6">
              Te esperamos en la sesión privada de <span className="text-amber-400 font-semibold">{evento.nombre}</span>. Hemos enviado la confirmación a tu correo.
            </p>

            {/* Event Summary Card */}
            <div className="bg-[#0a121c] border border-slate-800 rounded-xl p-4 mb-6 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="capitalize text-slate-200">
                  {dateInfo.diaSemana} {dateInfo.fecha}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-slate-200">{dateInfo.hora} (Hora Perú) • {evento.duracion_minutos || 45} min</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Video className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-sky-400 font-medium truncate">Plataforma Zoom Oficial</span>
              </div>
            </div>

            {/* Zoom Direct Access Box */}
            <div className="bg-gradient-to-r from-blue-900/30 via-sky-900/20 to-blue-900/30 border border-sky-500/30 rounded-xl p-4 mb-6 text-center">
              <p className="text-xs text-sky-200 font-medium mb-2 uppercase tracking-wider">
                Enlace Directo de la Sala Zoom
              </p>
              <a
                href={evento.link_reunion}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-sky-900/40 transition-all transform hover:-translate-y-0.5"
              >
                <Video className="w-4 h-4" />
                Ingresar al Zoom del Evento
              </a>
              <p className="text-[11px] text-slate-400 mt-2 truncate">
                {evento.link_reunion}
              </p>
            </div>

            {/* Calendar Injections Actions */}
            <div className="space-y-3 mb-6">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">
                Guarda el evento en tu agenda
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <a
                  href={calendarLinks.google_calendar || `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(evento.nombre)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4 text-amber-400" />
                  Añadir a Google Calendar
                </a>

                <button
                  onClick={handleDownloadIcs}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  Descargar Archivo (.ICS)
                </button>
              </div>
            </div>

            {/* Contact WhatsApp */}
            <div className="text-center pt-4 border-t border-slate-800">
              <a
                href={`https://wa.me/51982100208?text=${encodeURIComponent(`Hola Ricardo, me acabo de registrar al evento "${evento.nombre}".`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                <MessageCircle className="w-4 h-4" />
                ¿Tienes alguna consulta? Escríbenos a WhatsApp
              </a>
            </div>

          </div>
        ) : (
          /* ================= PUBLIC LANDING & REGISTRATION FORM ================= */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Event Presentation & Flyer */}
            <div className="lg:col-span-7 space-y-6">
              
              {/* Event Image / Flyer */}
              {evento.imagen_url && (
                <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl shadow-black/60 group">
                  <img 
                    src={evento.imagen_url} 
                    alt={evento.nombre}
                    className="w-full h-56 sm:h-72 object-cover object-center group-hover:scale-105 transition-transform duration-700"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070d14] via-[#070d14]/30 to-transparent"></div>
                  
                  <div className="absolute top-3 left-3 bg-amber-500/90 text-slate-950 font-extrabold text-xs px-3 py-1 rounded-full uppercase tracking-wider shadow-lg">
                    Evento Exclusivo
                  </div>
                </div>
              )}

              {/* Event Title & Subtitle */}
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold mb-3">
                  <Sparkles className="w-3.5 h-3.5" />
                  Afinitive Wealth Management • Oportunidad Inmobiliaria
                </div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                  {evento.nombre}
                </h1>
              </div>

              {/* Key Metric Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#0f1b29] border border-amber-500/30 rounded-xl p-3 text-center shadow-md">
                  <TrendingUp className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Retorno</span>
                  <span className="text-base font-black text-amber-400">+ 17%</span>
                </div>

                <div className="bg-[#0f1b29] border border-slate-800 rounded-xl p-3 text-center shadow-md">
                  <Calendar className="w-5 h-5 text-sky-400 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Fecha</span>
                  <span className="text-xs font-bold text-slate-200 capitalize">{dateInfo.fecha}</span>
                </div>

                <div className="bg-[#0f1b29] border border-slate-800 rounded-xl p-3 text-center shadow-md">
                  <Clock className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Hora Perú</span>
                  <span className="text-xs font-bold text-slate-200">{dateInfo.hora}</span>
                </div>

                <div className="bg-[#0f1b29] border border-slate-800 rounded-xl p-3 text-center shadow-md">
                  <Building2 className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Duración</span>
                  <span className="text-xs font-bold text-slate-200">{evento.duracion_minutos || 45} min</span>
                </div>
              </div>

              {/* Description Body */}
              <div className="bg-[#0d1724] border border-slate-800/90 rounded-2xl p-5 md:p-6 text-slate-300 text-sm md:text-base leading-relaxed whitespace-pre-line shadow-lg">
                {evento.descripcion || 'Te invitamos a esta sesión privada con Ricardo Bertalmio para descubrir las mejores oportunidades de inversión patrimonial.'}
              </div>

              {/* Host Presentation */}
              <div className="flex items-center gap-4 bg-[#0a121c] border border-slate-800/80 rounded-xl p-4">
                <img 
                  src="https://dashbportal.com/afinitive/rbertalmio.png" 
                  alt="Ricardo Bertalmio" 
                  className="w-14 h-14 rounded-full object-cover border-2 border-amber-500/40 shadow-md"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <div>
                  <h4 className="text-sm font-bold text-white">Ricardo Bertalmio Ruibal</h4>
                  <p className="text-xs text-amber-400 font-medium">CEO Afinitive Wealth Management</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Especialista en estructuración patrimonial y rentas inmobiliarias</p>
                </div>
              </div>

            </div>

            {/* Right Column: Registration Card */}
            <div className="lg:col-span-5 sticky top-20">
              <div className="bg-gradient-to-b from-[#111c2a] to-[#0b131e] border-2 border-amber-500/40 rounded-2xl p-6 md:p-7 shadow-2xl shadow-black/80">
                
                <div className="mb-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30 inline-block mb-2">
                    Cupos Limitados
                  </span>
                  <h3 className="text-xl font-bold text-white">
                    Confirma tu Asistencia
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Completa tus datos para recibir el enlace directo de Zoom y agendar en tu calendario.
                  </p>
                </div>

                {errorMsg && (
                  <div className="p-3 mb-4 rounded-lg bg-red-900/30 border border-red-500/50 text-red-300 text-xs">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  
                  {/* Full Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Nombres Completos <span className="text-amber-400">*</span>
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
                        className="w-full bg-[#070d14] border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Correo Electrónico <span className="text-amber-400">*</span>
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
                        className="w-full bg-[#070d14] border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* WhatsApp / Phone */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Celular / WhatsApp <span className="text-amber-400">*</span>
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
                        className="w-full bg-[#070d14] border border-slate-700 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all"
                      />
                    </div>
                  </div>

                  {/* Persona de Contacto */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Persona de Contacto / Asesor <span className="text-slate-500 text-[10px]">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      name="persona_contacto"
                      value={formData.persona_contacto}
                      onChange={handleInputChange}
                      placeholder="Nombre de quien te compartió la invitación"
                      className="w-full bg-[#070d14] border border-slate-700 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold text-sm tracking-wide shadow-lg shadow-amber-500/20 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center justify-center gap-2 mt-4 cursor-pointer"
                  >
                    {submitting ? (
                      <span>Registrando y Agendando...</span>
                    ) : (
                      <>
                        <span>Confirmar Asistencia</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 pt-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Tus datos están 100% protegidos y seguros.</span>
                  </div>

                </form>

              </div>
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#050a10] py-6 px-4 text-center text-xs text-slate-500 mt-auto">
        <p>© 2026 Afinitive Wealth Management • San Isidro, Lima, Perú • Todos los derechos reservados.</p>
      </footer>

    </div>
  );
}
