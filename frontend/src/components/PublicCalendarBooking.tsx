import { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Video, 
  Globe, 
  CheckCircle2, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Mail, 
  Phone, 
  MessageSquare, 
  ShieldCheck, 
  ExternalLink,
  Copy,
  Check,
  TrendingUp
} from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:3080'
    : 'https://operador.afinitive.com.pe'
);

const INVESTMENT_RANGES = [
  { id: 'menos_300k', label: 'Menos de S/300,000', subtitle: 'Patrimonio inicial / Planificación' },
  { id: '350k_450k', label: 'S/350,000 – S/450,000', subtitle: 'Portafolio de crecimiento estructurado' },
  { id: '450k_550k', label: 'S/450,000 – S/550,000', subtitle: 'Diversificación y optimización fiscal' },
  { id: 'mas_550k', label: 'Más de S/550,000', subtitle: 'Cuentas Offshore y Banca Privada Internacional' },
];

export default function PublicCalendarBooking() {
  // Stepper: 'datetime' (1) -> 'investment' (2) -> 'contact_consent' (3) -> 'success' (4)
  const [currentStep, setCurrentStep] = useState<'datetime' | 'investment' | 'contact_consent' | 'success'>('datetime');
  const [isWhatsAppMode, setIsWhatsAppMode] = useState(false);

  // Estado de Calendario y Horarios
  const [currentDate, setCurrentDate] = useState(new Date());
  const [freeSlots, setFreeSlots] = useState<{ [day: string]: string[] }>({});
  const [loadingSlots, setLoadingSlots] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Estado de Inversión (Imagen 1)
  const [selectedInvestmentRange, setSelectedInvestmentRange] = useState<string>('S/350,000 – S/450,000');
  const [configuredWhatsAppNumber, setConfiguredWhatsAppNumber] = useState<string>('51982100208');

  // Estado de Datos de Contacto para Enlazar la Llamada
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');

  // Estado de Consentimiento y Condiciones (Imagen 2)
  const [consentPromo, setConsentPromo] = useState(true);
  const [consentPrivacy, setConsentPrivacy] = useState(true);
  const [consentDemand, setConsentDemand] = useState(true);

  // Estados de Envío y Feedback
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Resultado Confirmado
  const [confirmedBooking, setConfirmedBooking] = useState<{
    name: string;
    email: string;
    phone: string;
    investmentRange: string;
    time?: string;
    advisorName: string;
    meetLink?: string;
    isWhatsApp?: boolean;
    whatsappUrl?: string;
  } | null>(null);

  // Parsear parámetros de URL al montar el componente (para agendamiento directo o redirección de WhatsApp)
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const mode = searchParams.get('mode');
    const source = searchParams.get('source');
    const emailParam = searchParams.get('email');
    const nameParam = searchParams.get('name');
    const phoneParam = searchParams.get('phone');
    const rangeParam = searchParams.get('range');

    if (emailParam) setEmail(emailParam);
    if (nameParam) setFullName(nameParam);
    if (phoneParam) setPhone(phoneParam);
    if (rangeParam) {
      const match = INVESTMENT_RANGES.find(r => r.id === rangeParam || r.label.toLowerCase().includes(rangeParam.toLowerCase()));
      if (match) setSelectedInvestmentRange(match.label);
    }

    if (mode === 'whatsapp' || source === 'whatsapp') {
      setIsWhatsAppMode(true);
      setCurrentStep('investment');
      document.title = 'Afinitive | WhatsApp Directo';
    } else {
      document.title = 'Afinitive | Agendar Asesoría Patrimonial';
    }

    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    try {
      setLoadingSlots(true);
      
      // Consultar configuración dinámica (incluye número de WhatsApp)
      fetch(`${API_BASE_URL}/api/test-email/settings`)
        .then(res => res.json())
        .then(data => {
          if (data?.whatsapp_number) {
            setConfiguredWhatsAppNumber(data.whatsapp_number);
          }
        })
        .catch(() => {});

      const res = await fetch(`${API_BASE_URL}/api/test-email/free-slots?signatureId=ricardo`);
      if (res.ok) {
        const data = await res.json();
        setFreeSlots(data || {});
      } else {
        generateMockSlots();
      }
    } catch {
      generateMockSlots();
    } finally {
      setLoadingSlots(false);
    }
  };

  const generateMockSlots = () => {
    const mock: { [day: string]: string[] } = {};
    const today = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        const key = d.toISOString().split('T')[0];
        mock[key] = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];
      }
    }
    setFreeSlots(mock);
  };

  // Manejo de Calendario (Mes / Días)
  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const firstDayIndex = new Date(year, month, 1).getDay();
  const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const daysArray: (number | null)[] = [];
  for (let i = 0; i < adjustedFirstDay; i++) {
    daysArray.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    daysArray.push(i);
  }

  const formatDayKey = (dayNum: number) => {
    const mm = String(month + 1).padStart(2, '0');
    const dd = String(dayNum).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
  };

  const isDayAvailable = (dayNum: number) => {
    const key = formatDayKey(dayNum);
    return freeSlots[key] && freeSlots[key].length > 0;
  };

  const handleSelectDay = (dayNum: number) => {
    const key = formatDayKey(dayNum);
    if (freeSlots[key] && freeSlots[key].length > 0) {
      setSelectedDay(key);
      setSelectedTime(null);
    }
  };

  const handleSelectTimeSlot = (timeStr: string) => {
    setSelectedTime(timeStr);
    // Avanzar al paso de preguntas de inversión
    setCurrentStep('investment');
  };

  // Envío Final del Formulario
  const handleFinalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setErrorMsg('Por favor completa todos los datos obligatorios (Nombre, Correo y Celular).');
      return;
    }

    if (!isWhatsAppMode && (!selectedDay || !selectedTime)) {
      setErrorMsg('Por favor selecciona una fecha y hora en el calendario antes de confirmar.');
      return;
    }

    if (!consentPrivacy) {
      setErrorMsg('Debes aceptar las Políticas de Privacidad para continuar.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg(null);

      const isoTime = selectedDay && selectedTime ? `${selectedDay}T${selectedTime}:00-05:00` : undefined;
      const source = isWhatsAppMode ? 'whatsapp_profiling' : 'calendario_publico';

      const response = await fetch(`${API_BASE_URL}/api/test-email/book-appointment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          investmentRange: selectedInvestmentRange,
          consentPromo,
          consentPrivacy,
          consentDemand,
          time: isoTime,
          notes: notes.trim(),
          calendarId: 'rbertalmio@afinitive.com',
          bookingSource: source,
        }),
      });

      const resData = await response.json().catch(() => ({ success: true }));

      const waPhone = configuredWhatsAppNumber.replace(/\D/g, '') || '51982100208';
      const whatsappMsg = `Hola Ricardo, deseo coordinar sobre asesoría patrimonial estratégica.\n\n👤 Nombre: ${fullName.trim()}\n✉️ Correo: ${email.trim()}\n📱 Celular: ${phone.trim()}\n💰 Rango de Inversión: ${selectedInvestmentRange}${notes.trim() ? `\n📝 Consulta: ${notes.trim()}` : ''}`;
      const whatsappUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(whatsappMsg)}`;

      setConfirmedBooking({
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        investmentRange: selectedInvestmentRange,
        time: isoTime,
        advisorName: 'Ricardo Bertalmio Ruibal',
        meetLink: resData?.appointment?.meetLink,
        isWhatsApp: isWhatsAppMode,
        whatsappUrl: whatsappUrl,
      });

      setCurrentStep('success');

      if (isWhatsAppMode) {
        // Redirigir suavemente a WhatsApp tras registrar el perfilamiento
        setTimeout(() => {
          window.location.href = whatsappUrl;
        }, 1200);
      }
    } catch {
      setErrorMsg('Error de conexión con el servidor. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateTimeDisplay = (isoOrKey: string, time?: string) => {
    try {
      let d: Date;
      if (isoOrKey.includes('T')) {
        d = new Date(isoOrKey);
      } else if (time) {
        d = new Date(`${isoOrKey}T${time}:00-05:00`);
      } else {
        d = new Date(isoOrKey);
      }

      return d.toLocaleDateString('es-ES', {
        timeZone: 'America/Lima',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return isoOrKey;
    }
  };

  const generateGoogleCalendarLink = () => {
    if (!confirmedBooking || !confirmedBooking.time) return '#';
    const start = new Date(confirmedBooking.time);
    const end = new Date(start.getTime() + 60 * 60000);

    const pad = (n: number) => String(n).padStart(2, '0');
    const toGCalStr = (d: Date) => 
      `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

    const title = encodeURIComponent(`Sesión de Asesoría Patrimonial - Ricardo Bertalmio (${confirmedBooking.name})`);
    const details = encodeURIComponent(`Reunión confirmada con Ricardo Bertalmio Ruibal (CEO Afinitive Wealth Management).\nPlataforma: Google Meet / Videollamada.\nTeléfono Cliente: ${confirmedBooking.phone}\nRango Inversión: ${confirmedBooking.investmentRange}`);
    const dates = `${toGCalStr(start)}/${toGCalStr(end)}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dates}&details=${details}&location=Google+Meet`;
  };

  const handleCopyPublicUrl = () => {
    const url = window.location.origin + (window.location.pathname.startsWith('/agendar') ? window.location.pathname : '/agendar');
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Porcentaje de la barra de progreso
  const getStepProgress = () => {
    if (isWhatsAppMode) {
      switch (currentStep) {
        case 'investment': return 50;
        case 'contact_consent': return 100;
        case 'success': return 100;
        default: return 50;
      }
    }
    switch (currentStep) {
      case 'datetime': return 33;
      case 'investment': return 66;
      case 'contact_consent': return 100;
      case 'success': return 100;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#111827] font-sans antialiased flex flex-col items-center justify-center p-3 sm:p-6 md:p-8">
      
      {/* Barra superior de navegación */}
      <div className="w-full max-w-4xl flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-xs font-medium text-zinc-500">
            {isWhatsAppMode ? 'Perfilamiento para WhatsApp Directo' : 'Calendario Oficial En Vivo'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyPublicUrl}
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:text-zinc-950 px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-zinc-300 shadow-sm transition-all cursor-pointer"
            title="Copiar URL público para compartir"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-zinc-500" />}
            <span>{copiedLink ? '¡Enlace Copiado!' : 'Copiar Enlace'}</span>
          </button>
        </div>
      </div>

      {/* Contenedor Principal (Google Minimalist Elegance) */}
      <div className="w-full max-w-4xl bg-white border border-zinc-200 rounded-2xl md:rounded-3xl shadow-xl shadow-zinc-200/60 overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        
        {/* PANEL IZQUIERDO: Perfil y Datos del Asesor */}
        <div className="w-full md:w-[320px] bg-white border-b md:border-b-0 md:border-r border-zinc-100 p-6 md:p-8 flex flex-col justify-between">
          <div>
            {/* Logo Afinitive (Arbolito Oficial) */}
            <div className="flex items-center gap-2.5 mb-6">
              <img 
                src="https://links.afinitive.com.pe/img/afinitive_logo.png" 
                alt="Afinitive Wealth Management" 
                className="w-10 h-10 object-contain shrink-0"
              />
              <div className="leading-tight">
                <span className="text-[10px] tracking-widest text-zinc-400 font-semibold uppercase block">AFINITIVE</span>
                <span className="text-xs font-bold tracking-wider text-zinc-900 uppercase">WEALTH MANAGEMENT</span>
              </div>
            </div>

            {/* Perfil del Asesor */}
            <div className="flex items-center gap-3.5 mb-6 pb-6 border-b border-zinc-100">
              <div className="relative">
                <img 
                  src="https://dashbportal.com/afinitive/rbertalmio.png" 
                  alt="Ricardo Bertalmio" 
                  className="w-14 h-14 rounded-full object-cover border border-zinc-200 shadow-sm"
                />
                <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900 leading-tight">Ricardo Bertalmio Ruibal</h3>
                <p className="text-xs text-zinc-500 mt-0.5">CEO & Senior Advisor</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-full mt-1">
                  <ShieldCheck className="w-3 h-3 text-zinc-800" /> Asesor Verificado
                </span>
              </div>
            </div>

            {/* Detalles de la Sesión */}
            <div className="space-y-4">
              <div>
                <h1 className="text-lg font-bold text-zinc-950 tracking-tight leading-snug">
                  {isWhatsAppMode ? 'Atención y Consulta Directa por WhatsApp' : 'Sesión de Asesoría Patrimonial Estratégica'}
                </h1>
                <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                  {isWhatsAppMode 
                    ? 'Estructura tu consulta patrimonial directamente con Ricardo Bertalmio vía WhatsApp para recibir propuestas y balances adaptados.'
                    : 'Reunión confidencial de 1 a 1 para estructurar balances, optimizar rentabilidad y explorar cuentas internacionales (Morgan Stanley, BNY Mellon, Coril).'
                  }
                </p>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-zinc-700">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">{isWhatsAppMode ? 'Respuesta inmediata o coordinada' : '45 - 60 minutos'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  {isWhatsAppMode ? <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" /> : <Video className="w-4 h-4 text-zinc-400 shrink-0" />}
                  <span className="font-medium">{isWhatsAppMode ? 'WhatsApp Business Directo' : 'Google Meet (Videollamada)'}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span className="font-medium">Hora de Perú (GMT-5)</span>
                </div>
              </div>

              {/* Resumen del Horario Escogido (si aplica) */}
              {selectedDay && selectedTime && !isWhatsAppMode && (
                <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1 mt-4 text-xs">
                  <span className="text-[10px] uppercase font-bold text-zinc-400 block">Horario Seleccionado:</span>
                  <p className="font-bold text-zinc-900 capitalize">
                    📅 {formatDateTimeDisplay(selectedDay)}
                  </p>
                  <p className="text-xs text-zinc-700 font-semibold">
                    ⏰ {selectedTime} (Hora Lima)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Pie del Panel Izquierdo */}
          <div className="pt-6 mt-6 border-t border-zinc-100 text-[11px] text-zinc-400 flex items-center justify-between">
            <span>Afinitive Inc.</span>
            <span>San Isidro, Lima</span>
          </div>
        </div>

        {/* PANEL DERECHO: Asistente Interactivo Multi-Paso */}
        <div className="flex-1 p-6 md:p-8 flex flex-col justify-between bg-[#FCFCFC] relative">
          
          {/* BARRA DE PROGRESO SUPERIOR (Estilo Stepper - Imagen 1) */}
          {currentStep !== 'success' && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                {isWhatsAppMode ? (
                  <>
                    <span className={currentStep === 'investment' ? 'text-zinc-950 font-bold' : ''}>1. Inversión</span>
                    <span className={currentStep === 'contact_consent' ? 'text-zinc-950 font-bold' : ''}>2. Contacto & Condiciones</span>
                    <span className="text-zinc-400">3. Chat WhatsApp</span>
                  </>
                ) : (
                  <>
                    <span className={currentStep === 'datetime' ? 'text-zinc-950 font-bold' : ''}>1. Horario</span>
                    <span className={currentStep === 'investment' ? 'text-zinc-950 font-bold' : ''}>2. Inversión</span>
                    <span className={currentStep === 'contact_consent' ? 'text-zinc-950 font-bold' : ''}>3. Contacto & Condiciones</span>
                  </>
                )}
              </div>
              <div className="w-full bg-zinc-200 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-zinc-950 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${getStepProgress()}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* PASO 1: SELECCIÓN DE DÍA Y HORA */}
          {currentStep === 'datetime' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div>
                  <h2 className="text-base font-bold text-zinc-900">Selecciona fecha y hora</h2>
                  <p className="text-xs text-zinc-500">Días con disponibilidad en tiempo real de Google Calendar</p>
                </div>
                {loadingSlots && (
                  <span className="text-xs text-zinc-400 animate-pulse flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-zinc-400 animate-ping"></span>
                    Sincronizando...
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Calendario */}
                <div className={`${selectedDay ? 'md:col-span-7' : 'md:col-span-12'} transition-all`}>
                  <div className="flex items-center justify-between mb-4 px-2">
                    <span className="text-sm font-bold text-zinc-900">
                      {monthNames[month]} {year}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={handlePrevMonth}
                        className="p-1.5 rounded-full hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                        aria-label="Mes anterior"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleNextMonth}
                        className="p-1.5 rounded-full hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                        aria-label="Mes siguiente"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-1 text-center mb-2">
                    {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
                      <span key={i} className="text-[11px] font-semibold text-zinc-400 uppercase py-1">
                        {d}
                      </span>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 text-center">
                    {daysArray.map((dayNum, index) => {
                      if (!dayNum) {
                        return <div key={`empty-${index}`} className="h-9"></div>;
                      }

                      const available = isDayAvailable(dayNum);
                      const key = formatDayKey(dayNum);
                      const isSelected = selectedDay === key;

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={!available}
                          onClick={() => handleSelectDay(dayNum)}
                          className={`h-9 w-full rounded-full text-xs font-semibold flex items-center justify-center transition-all ${
                            isSelected
                              ? 'bg-zinc-950 text-white shadow-md'
                              : available
                                ? 'bg-zinc-100 hover:bg-zinc-950 hover:text-white text-zinc-900 cursor-pointer font-bold border border-zinc-200/80'
                                : 'text-zinc-300 cursor-not-allowed opacity-50'
                          }`}
                        >
                          {dayNum}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-4 mt-6 pt-4 border-t border-zinc-100 text-[11px] text-zinc-500">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-950"></span>
                      <span>Seleccionado</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-zinc-200 border border-zinc-300"></span>
                      <span>Día Disponible</span>
                    </div>
                  </div>
                </div>

                {/* Columna de Horarios */}
                {selectedDay && (
                  <div className="md:col-span-5 space-y-3 animate-in fade-in slide-in-from-right-2 duration-200">
                    <div className="border-b border-zinc-100 pb-2">
                      <p className="text-xs font-bold text-zinc-900 capitalize">
                        {formatDateTimeDisplay(selectedDay)}
                      </p>
                      <p className="text-[11px] text-zinc-500">Selecciona una hora disponible:</p>
                    </div>

                    <div className="space-y-2 max-h-[290px] overflow-y-auto pr-1">
                      {freeSlots[selectedDay] && freeSlots[selectedDay].length > 0 ? (
                        freeSlots[selectedDay].map((timeStr) => (
                          <button
                            key={timeStr}
                            type="button"
                            onClick={() => handleSelectTimeSlot(timeStr)}
                            className="w-full py-2.5 px-4 text-xs font-semibold text-zinc-800 bg-white hover:bg-zinc-950 hover:text-white border border-zinc-200 hover:border-zinc-950 rounded-xl transition-all flex items-center justify-between group shadow-sm cursor-pointer"
                          >
                            <span>{timeStr}</span>
                            <span className="text-[10px] text-zinc-400 group-hover:text-zinc-300">Seleccionar →</span>
                          </button>
                        ))
                      ) : (
                        <p className="text-xs text-zinc-400 italic py-4 text-center">
                          No hay turnos libres en este día.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 2: PREGUNTA DE RANGO DE INVERSIÓN (Imagen 1) */}
          {currentStep === 'investment' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                {isWhatsAppMode ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsWhatsAppMode(false);
                      setCurrentStep('datetime');
                    }}
                    className="flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Prefiero agendar por Calendario</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCurrentStep('datetime')}
                    className="flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Volver al horario</span>
                  </button>
                )}
                <span className="text-xs font-bold text-zinc-900 bg-zinc-100 px-3 py-1 rounded-full">
                  {isWhatsAppMode ? 'Paso 1 de 2' : 'Paso 2 de 3'}
                </span>
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <div className="inline-flex p-2 bg-zinc-100 rounded-xl text-zinc-900 mb-1">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h2 className="text-xl font-bold text-zinc-950 tracking-tight">
                  ¿Cuál es el rango de inversión que tienes pensado?
                </h2>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Esta información permite a Ricardo preparar opciones y balances adecuados para tu perfil patrimonial.
                </p>
              </div>

              {/* Opciones de Selección (Radio Cards - Imagen 1) */}
              <div className="space-y-3 pt-2">
                {INVESTMENT_RANGES.map((opt) => {
                  const isSelected = selectedInvestmentRange === opt.label;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedInvestmentRange(opt.label)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'border-zinc-950 bg-zinc-950 text-white shadow-md'
                          : 'border-zinc-200 hover:border-zinc-400 bg-white text-zinc-900 hover:bg-zinc-50/70'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <p className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-zinc-900'}`}>
                          {opt.label}
                        </p>
                        <p className={`text-xs ${isSelected ? 'text-zinc-300' : 'text-zinc-500'}`}>
                          {opt.subtitle}
                        </p>
                      </div>

                      {/* Radio Circle */}
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                        isSelected ? 'border-white bg-white text-zinc-950' : 'border-zinc-300 bg-transparent'
                      }`}>
                        {isSelected && <div className="w-2.5 h-2.5 rounded-full bg-zinc-950"></div>}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Botón Continuar */}
              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => setCurrentStep('contact_consent')}
                  className="w-full py-3.5 px-4 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Continuar con mis datos</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* PASO 3: DATOS DE CONTACTO & CONDICIONES (Imagen 2) */}
          {currentStep === 'contact_consent' && (
            <form onSubmit={handleFinalSubmit} className="space-y-5 animate-in fade-in slide-in-from-right-3 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <button
                  type="button"
                  onClick={() => setCurrentStep('investment')}
                  className="flex items-center gap-1 text-xs font-semibold text-zinc-600 hover:text-zinc-950 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>
                <span className="text-xs font-bold text-zinc-900 bg-zinc-100 px-3 py-1 rounded-full">
                  {isWhatsAppMode ? 'Paso 2 de 2' : 'Paso 3 de 3'}
                </span>
              </div>

              {/* SECCIÓN 1: DATOS PARA ENLAZAR LA LLAMADA O WHATSAPP */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950">
                    {isWhatsAppMode ? 'Datos para iniciar el contacto' : 'Datos para enlazar la llamada'}
                  </h3>
                  <p className="text-[11px] text-zinc-500">
                    {isWhatsAppMode 
                      ? 'Tus datos nos permiten preparar tu perfil patrimonial antes de abrir el chat directo.'
                      : 'Afinitive se comunicará contigo en el horario seleccionado para coordinar el acceso a la reunión.'
                    }
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-800">Nombre Completo *</label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="Ej: Marielisa García"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-800">Celular / WhatsApp *</label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                      <input
                        type="tel"
                        required
                        placeholder="Ej: 982100208"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-800">Correo Electrónico *</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      placeholder="tu.correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-zinc-800">¿Qué temas específicos te gustaría tratar? (Opcional)</label>
                  <div className="relative">
                    <MessageSquare className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
                    <textarea
                      rows={2}
                      placeholder="Ej: Cuentas internacionales en Morgan Stanley, asesoría de portafolios..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-zinc-300 rounded-xl text-zinc-900 placeholder-zinc-400 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN 2: CONDICIONES DE AFINITIVE (Imagen 2) */}
              <div className="space-y-3 pt-2 border-t border-zinc-100">
                <div>
                  <h3 className="text-sm font-bold text-zinc-950 uppercase tracking-wide">Condiciones de Afinitive</h3>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Para brindarle un mejor servicio y mantenerlo informado, solicitamos su consentimiento en los siguientes aspectos:
                  </p>
                </div>

                <div className="space-y-2.5 bg-zinc-50 border border-zinc-200/80 rounded-2xl p-4 text-xs">
                  {/* Item 1 */}
                  <label className="flex items-start gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={consentPromo}
                      onChange={(e) => setConsentPromo(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 mt-0.5 cursor-pointer accent-blue-600"
                    />
                    <span className="text-zinc-700 leading-snug">
                      Autorizo recibir información, promociones, oportunidades y encuestas de <strong>Afinitive Wealth Management</strong>. <span className="text-zinc-400 font-normal">(Opcional)</span>
                    </span>
                  </label>

                  {/* Item 2 (Requerido) */}
                  <label className="flex items-start gap-3 cursor-pointer select-none border-t border-zinc-200/60 pt-2.5">
                    <input
                      type="checkbox"
                      required
                      checked={consentPrivacy}
                      onChange={(e) => setConsentPrivacy(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 mt-0.5 cursor-pointer accent-blue-600"
                    />
                    <span className="text-zinc-900 font-medium leading-snug">
                      He leído y acepto las <span className="underline font-bold">Políticas de Privacidad</span> y Términos de Servicio. <span className="text-rose-600">*</span>
                    </span>
                  </label>

                  {/* Item 3 */}
                  <label className="flex items-start gap-3 cursor-pointer select-none border-t border-zinc-200/60 pt-2.5">
                    <input
                      type="checkbox"
                      checked={consentDemand}
                      onChange={(e) => setConsentDemand(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-zinc-300 mt-0.5 cursor-pointer accent-blue-600"
                    />
                    <span className="text-zinc-700 leading-snug">
                      Autorizo el uso de mis datos para estudios de demanda y perfilamiento patrimonial. <span className="text-zinc-400 font-normal">(Opcional)</span>
                    </span>
                  </label>
                </div>

                <p className="text-[11px] text-zinc-400 text-justify">
                  Al continuar, aceptas enviar tu información a <strong>Afinitive Inc.</strong> y coordinar la atención requerida.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Botones de Acción (Estilo Imagen 2) */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className={`w-full py-3.5 px-4 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isWhatsAppMode 
                      ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800' 
                      : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
                  }`}
                >
                  {submitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                      <span>{isWhatsAppMode ? 'Guardando y Abriendo WhatsApp...' : 'Enviando y Confirmando Cita...'}</span>
                    </>
                  ) : (
                    <>
                      <span>{isWhatsAppMode ? 'Guardar y Abrir Chat de WhatsApp' : 'Enviar y Agendar Cita'}</span>
                      {isWhatsAppMode ? <MessageSquare className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (isWhatsAppMode) {
                      setIsWhatsAppMode(false);
                    }
                    setCurrentStep('datetime');
                  }}
                  className="w-full py-2.5 text-xs text-blue-600 hover:text-blue-800 font-bold transition-colors cursor-pointer"
                >
                  {isWhatsAppMode ? 'O prefiero elegir fecha en el calendario' : 'Ahora no / Cambiar fecha'}
                </button>
              </div>
            </form>
          )}

          {/* PASO 4: ÉXITO Y CONFIRMACIÓN */}
          {currentStep === 'success' && confirmedBooking && (
            <div className="py-6 px-2 text-center space-y-5 animate-in zoom-in-95 duration-200 my-auto">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-lg ${
                confirmedBooking.isWhatsApp 
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20' 
                  : 'bg-blue-600 text-white shadow-blue-600/20'
              }`}>
                {confirmedBooking.isWhatsApp ? <MessageSquare className="w-8 h-8" /> : <CheckCircle2 className="w-8 h-8" />}
              </div>

              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  {confirmedBooking.isWhatsApp ? 'Perfil Registrado' : 'Reserva Confirmada'}
                </span>
                <h2 className="text-2xl font-bold text-zinc-950 tracking-tight">
                  {confirmedBooking.isWhatsApp ? '¡Conectando con WhatsApp!' : '¡Tu reunión está programada!'}
                </h2>
                <p className="text-xs text-zinc-600 max-w-md mx-auto">
                  {confirmedBooking.isWhatsApp 
                    ? `Hemos guardado tus preferencias patrimoniales. Haz clic abajo para continuar tu conversación directa con ${confirmedBooking.advisorName}.`
                    : `Hemos enviado una invitación a tu correo ${confirmedBooking.email} y nos comunicaremos al ${confirmedBooking.phone} para coordinar la llamada con ${confirmedBooking.advisorName}.`
                  }
                </p>
              </div>

              {/* Tarjeta de Resumen */}
              <div className="bg-white border border-zinc-200 rounded-2xl p-5 max-w-md mx-auto text-left shadow-sm space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <span className="text-zinc-500 font-medium">👤 Asesor:</span>
                  <span className="font-bold text-zinc-900">{confirmedBooking.advisorName}</span>
                </div>
                {confirmedBooking.time && (
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                    <span className="text-zinc-500 font-medium">📅 Fecha:</span>
                    <span className="font-bold text-zinc-900 capitalize">
                      {formatDateTimeDisplay(confirmedBooking.time)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <span className="text-zinc-500 font-medium">📱 Contacto:</span>
                  <span className="font-bold text-zinc-900">{confirmedBooking.phone}</span>
                </div>
                <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
                  <span className="text-zinc-500 font-medium">💰 Rango Inversión:</span>
                  <span className="font-bold text-zinc-900">{confirmedBooking.investmentRange}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 font-medium">📹 Modalidad:</span>
                  <span className="font-bold text-emerald-600 flex items-center gap-1">
                    {confirmedBooking.isWhatsApp ? <MessageSquare className="w-3.5 h-3.5" /> : <Video className="w-3.5 h-3.5" />}
                    {confirmedBooking.isWhatsApp ? 'WhatsApp Business Directo' : 'Google Meet / Llamada'}
                  </span>
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                {confirmedBooking.whatsappUrl ? (
                  <a
                    href={confirmedBooking.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Abrir Chat de WhatsApp</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                ) : (
                  <>
                    <a
                      href={generateGoogleCalendarLink()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-5 py-2.5 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <CalendarIcon className="w-3.5 h-3.5" />
                      <span>Añadir a Google Calendar</span>
                    </a>

                    <a
                      href={`https://wa.me/${configuredWhatsAppNumber.replace(/\D/g, '') || '51982100208'}?text=${encodeURIComponent(`Hola Ricardo, acabo de agendar una sesión de asesoría patrimonial en tu calendario oficial (${confirmedBooking.name}).`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all"
                    >
                      <span>Chatear por WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={() => {
                    setIsWhatsAppMode(false);
                    setSelectedDay(null);
                    setSelectedTime(null);
                    setCurrentStep('datetime');
                  }}
                  className="text-xs text-zinc-500 hover:text-zinc-900 font-medium underline cursor-pointer"
                >
                  {confirmedBooking.isWhatsApp ? 'Agendar también una cita por Calendario' : 'Agendar otra cita'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
