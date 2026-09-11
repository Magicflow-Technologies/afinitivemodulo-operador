import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Mail, 
  Send, 
  RefreshCw, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Eye,
  ArrowRight,
  Calendar,
  ExternalLink,
  Paperclip,
  X,
  Upload,
  Sliders,
  Users,
  Play,
  Trash2,
  Settings,
  PauseCircle,
  MessageCircle,
  Search,
  Phone
} from 'lucide-react';

interface EmailRecord {
  id: string;
  recipient_email: string;
  recipient_name?: string | null;
  recipient_phone?: string | null;
  subject: string;
  status: string;
  resend_email_id: string;
  sent_at: string;
  opened_at: string | null;
  proposed_time?: string | null;
  whatsapp_clicked_at?: string | null;
}

interface QueueItem {
  id: string;
  recipient_name: string;
  recipient_email: string;
  recipient_phone?: string | null;
  proposed_time: string;
  status: string;
  error_message: string | null;
  whatsapp_clicked_at?: string | null;
}

interface SkippedContact {
  name: string;
  email: string;
  reason: string;
  lastSentAt?: string;
  daysAgo?: number;
}

interface UploadSummary {
  totalUploaded: number;
  validCount: number;
  skippedCount: number;
  skippedContacts: SkippedContact[];
}

const buildEmailTemplate = (sigId: string, name: string, dateStr: string) => {
  let formattedDate = 'miércoles, 3 de septiembre a las 10:00';
  if (dateStr) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('es-ES', {
        timeZone: 'America/Lima',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  }
  const cleanName = name.trim() || 'Marielisa';
  const isFemale = cleanName.toLowerCase().endsWith('a') || cleanName.toLowerCase().includes('mari');
  const greeting = isFemale ? 'Estimada' : 'Estimado';

  const nameInBody = sigId === 'ricardo' ? 'Ricardo Bertalmio Ruibal' : 'Irina Portilla Farfán';
  const roleInBody = sigId === 'ricardo'
    ? 'Soy economista de la Universidad del Pacífico y dirijo Afinitive Wealth Management'
    : 'Soy Client Experience Manager en Afinitive Wealth Management';

  return `${greeting} ${cleanName}:\n\n` +
    'Le escribo porque encontré su perfil en LinkedIn. Compartimos varios contactos en común, y me pareció oportuno tomar la iniciativa de escribirle.\n\n' +
    `Mi nombre es <strong>${nameInBody}</strong>. ${roleInBody}, una boutique de asesoría patrimonial. Le escribo porque sé perfectamente lo frustrante que es para perfiles como el suyo lidiar con la banca tradicional en Lima, donde casi siempre le intentan colocar sus propios productos financieros masivos, <strong>en lugar de ofrecer asesoría integral, objetiva y profesional</strong>.\n\n` +
    'Nosotros operamos al revés: no tenemos productos propios. Trabajamos con arquitectura abierta para optimizar la estructura de ingresos y el capital de un grupo muy selecto de personas:\n\n' +
    '• Morgan Stanley\n' +
    '• BNY Mellon\n' +
    '• Coril\n\n' +
    'Le adjunto una presentación muy ejecutiva (<em>Afinitive Wealth | Tailor Made</em>) que detalla cómo estructuramos los balances y flujos, y maximizamos ingresos a partir de una inversión más eficiente que la que la oferta masiva puede lograr. Si nos busca en Google o LinkedIn, verá que mi trayectoria y la de mi equipo es transparente y de largo aliento.\n\n' +
    `Entendiendo que sus tiempos son ajustados, le acomodaría una reunión virtual vía Meet o una llamada telefónica de 20 minutos el día <strong>${formattedDate}</strong>?\n\n` +
    '[CONFIRMAR_CITA]\n\n' +
    'Me avisa para agendar,';
};

export default function EmailMonitoringDashboard() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('Marielisa');
  const [proposedTime, setProposedTime] = useState('');
  const [showIndividualSlotPicker, setShowIndividualSlotPicker] = useState(false);
  const [selectedDayIndividual, setSelectedDayIndividual] = useState<string | null>(null);

  const [signatureId, setSignatureId] = useState('ricardo');
  const [senderName, setSenderName] = useState('Ricardo Bertalmio');
  const [senderEmail, setSenderEmail] = useState('rbertalmio@afinitive.com.pe');
  
  const handleSignatureChange = (id: string) => {
    setSignatureId(id);
    if (id === 'irina') {
      setSenderName('Irina Portilla');
      setSenderEmail('iportilla@afinitive.com.pe');
      setEmailBody(buildEmailTemplate('irina', recipientName, proposedTime));
    } else if (id === 'ricardo') {
      setSenderName('Ricardo Bertalmio');
      setSenderEmail('rbertalmio@afinitive.com.pe');
      setEmailBody(buildEmailTemplate('ricardo', recipientName, proposedTime));
    }
    fetchFreeSlots(id);
  };

  const [subject, setSubject] = useState('Invitación Exclusiva - Afinitive');
  const [emailBody, setEmailBody] = useState(buildEmailTemplate('ricardo', 'Marielisa', ''));
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // --- Estados de Campañas y Cola (Nuevos) ---
  const [activeTab, setActiveTab] = useState<'individual' | 'campanas' | 'agenda'>('individual');
  const [slotDuration, setSlotDuration] = useState(60);
  const [morningStart, setMorningStart] = useState('09:00');
  const [morningEnd, setMorningEnd] = useState('12:00');
  const [afternoonStart, setAfternoonStart] = useState('14:00');
  const [afternoonEnd, setAfternoonEnd] = useState('17:00');
  const [sendInterval, setSendInterval] = useState(5);
  const [sendIntervalUnit, setSendIntervalUnit] = useState('minutes');
  const [settingsLoading, setSettingsLoading] = useState(false);

  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [freeSlots, setFreeSlots] = useState<Record<string, string[]>>({});
  const [activePickerId, setActivePickerId] = useState<string | null>(null);
  const [selectedDayForPicker, setSelectedDayForPicker] = useState<string | null>(null);
  const [uploadSummary, setUploadSummary] = useState<UploadSummary | null>(null);
  const [showSkippedModal, setShowSkippedModal] = useState(false);
  const [queueStatus, setQueueStatus] = useState({
    isProcessing: false,
    total: 0,
    sent: 0,
    failed: 0,
    currentId: null as string | null
  });

  // Convertir un archivo a String Base64
  const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve(base64String);
    };
    reader.onerror = error => reject(error);
  });

  // Estados para Filtros y Búsqueda
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Obtener el backend URL de las variables de entorno o usar el puerto de monitoreo del backend
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3080';

  // Lógica de filtrado de correos enriquecida
  const filteredEmails = emails.filter((email) => {
    // 1. Filtro por Estado
    if (filterStatus !== 'Todos') {
      if (filterStatus === 'WhatsApp') {
        if (!email.whatsapp_clicked_at) return false;
      } else if (filterStatus === 'Leído') {
        if (email.status !== 'Leído' && email.status !== 'Agendado' && !email.whatsapp_clicked_at) return false;
      } else if (email.status !== filterStatus) {
        return false;
      }
    }
    // 2. Filtro por Fechas
    if (filterStartDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      const sentDate = new Date(email.sent_at);
      if (sentDate < start) return false;
    }
    if (filterEndDate) {
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      const sentDate = new Date(email.sent_at);
      if (sentDate > end) return false;
    }
    // 3. Filtro por Búsqueda de Texto (Nombre, Correo o Asunto)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchEmail = email.recipient_email?.toLowerCase().includes(q);
      const matchName = email.recipient_name?.toLowerCase().includes(q);
      const matchSubject = email.subject?.toLowerCase().includes(q);
      const matchPhone = email.recipient_phone?.toLowerCase().includes(q);
      if (!matchEmail && !matchName && !matchSubject && !matchPhone) return false;
    }
    return true;
  });

  // Función para obtener los correos desde Supabase
  const fetchEmails = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const { data: trackingData, error: trackingError } = await supabase
        .from('email_tracking_test')
        .select('*')
        .order('sent_at', { ascending: false });

      if (trackingError) {
        throw trackingError;
      }

      // Enriquecer con datos de la cola (proposed_time / recipient_name / recipient_phone / whatsapp_clicked_at) para compatibilidad inmediata
      const { data: queueData } = await supabase
        .from('email_queue')
        .select('recipient_email, recipient_name, recipient_phone, proposed_time, whatsapp_clicked_at');

      const queueMap = new Map<string, { recipient_name?: string; recipient_phone?: string; proposed_time?: string; whatsapp_clicked_at?: string }>();
      if (queueData) {
        queueData.forEach((q: any) => {
          if (q.recipient_email) {
            queueMap.set(q.recipient_email.toLowerCase(), {
              recipient_name: q.recipient_name,
              recipient_phone: q.recipient_phone,
              proposed_time: q.proposed_time,
              whatsapp_clicked_at: q.whatsapp_clicked_at,
            });
          }
        });
      }

      const mergedEmails: EmailRecord[] = (trackingData || []).map((item: any) => {
        const queueMatch = queueMap.get(item.recipient_email?.toLowerCase());
        return {
          ...item,
          recipient_name: item.recipient_name || queueMatch?.recipient_name || null,
          recipient_phone: queueMatch?.recipient_phone || null,
          proposed_time: item.proposed_time || queueMatch?.proposed_time || null,
          whatsapp_clicked_at: item.whatsapp_clicked_at || queueMatch?.whatsapp_clicked_at || null,
        };
      });

      setEmails(mergedEmails);
      setErrorMsg(null);
    } catch (error: any) {
      console.error('Error cargando historial de correos:', error);
      setErrorMsg(`No se pudo conectar a Supabase: ${error.message || error}`);
    } finally {
      if (!isSilent) setRefreshing(false);
    }
  }, []);

  // Ejecutar polling cada 5 segundos
  useEffect(() => {
    fetchEmails();
    const interval = setInterval(() => {
      fetchEmails(true); // Polling silencioso
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchEmails]);

  // Cargar Configuraciones de Agenda
  const fetchSettings = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/test-email/settings`);
      if (response.ok) {
        const data = await response.json();
        setSlotDuration(data.slot_duration);
        setMorningStart(data.morning_start);
        setMorningEnd(data.morning_end);
        setAfternoonStart(data.afternoon_start);
        setAfternoonEnd(data.afternoon_end);
        setSendInterval(data.send_interval);
        setSendIntervalUnit(data.send_interval_unit);
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    }
  }, [BACKEND_URL]);

  // Guardar Configuraciones de Agenda y Envíos
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/test-email/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_duration: Number(slotDuration),
          morning_start: morningStart,
          morning_end: morningEnd,
          afternoon_start: afternoonStart,
          afternoon_end: afternoonEnd,
          send_interval: Number(sendInterval),
          send_interval_unit: sendIntervalUnit,
        }),
      });
      if (response.ok) {
        const unitLabel = sendIntervalUnit === 'minutes' ? 'minuto(s)' : sendIntervalUnit === 'seconds' ? 'segundo(s)' : 'hora(s)';
        setSuccessMsg(`¡Configuraciones guardadas con éxito! Intervalo de envío establecido en ${sendInterval} ${unitLabel}.`);
        await fetchSettings();
      } else {
        const errData = await response.json();
        throw new Error(errData.message || 'No se pudo guardar la configuración');
      }
    } catch (err: any) {
      setErrorMsg(`Error al guardar configuración: ${err.message}`);
    } finally {
      setSettingsLoading(false);
    }
  };

  // Obtener la Cola Pendiente
  const fetchPendingQueue = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/test-email/queue/pending`);
      if (response.ok) {
        const data = await response.json();
        setQueueItems(data || []);
      }
    } catch (err) {
      console.error('Error al obtener cola pendiente:', err);
    }
  }, [BACKEND_URL]);

  // Obtener Slots Libres
  const fetchFreeSlots = useCallback(async (sigId?: string) => {
    try {
      const activeSig = sigId || signatureId;
      const response = await fetch(`${BACKEND_URL}/api/test-email/free-slots?signatureId=${activeSig}`);
      if (response.ok) {
        const data = await response.json();
        setFreeSlots(data || {});
      }
    } catch (err) {
      console.error('Error al obtener slots libres:', err);
    }
  }, [BACKEND_URL, signatureId]);

  // Generar próximos 14 días laborables según la zona horaria de Lima (UTC-5)
  const getNext14Days = () => {
    const days = [];
    const nowInLimaStr = new Date().toLocaleString('en-US', { timeZone: 'America/Lima' });
    const current = new Date(nowInLimaStr);
    current.setDate(current.getDate() + 1);
    
    for (let i = 0; i < 14; i++) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  // Obtener el estado del Worker de la Cola
  const fetchQueueStatus = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/test-email/queue/status`);
      if (response.ok) {
        const data = await response.json();
        setQueueStatus(data);
      }
    } catch (err) {
      console.error('Error al obtener estado de la cola:', err);
    }
  }, [BACKEND_URL]);

  // Cargar contactos a través del CSV
  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setQueueLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/);
        const contacts: { name: string; email: string; phone?: string }[] = [];

        // Ignorar cabecera
        let startIndex = 0;
        if (lines.length > 0) {
          const firstLine = lines[0].toLowerCase();
          if (firstLine.includes('nombre') || firstLine.includes('correo') || firstLine.includes('email') || firstLine.includes('name') || firstLine.includes('telefono') || firstLine.includes('celular') || firstLine.includes('phone')) {
            startIndex = 1;
          }
        }

        for (let i = startIndex; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const cols = line.includes(';') ? line.split(';') : line.split(',');
          if (cols.length >= 2) {
            const name = cols[0].replace(/"/g, '').trim();
            const email = cols[1].replace(/"/g, '').trim();
            const phone = cols.length >= 3 ? cols[2].replace(/"/g, '').trim() : '';
            if (email && email.includes('@')) {
              contacts.push({ name, email, phone });
            }
          }
        }

        if (contacts.length === 0) {
          throw new Error('No se encontraron contactos válidos en el archivo CSV. Asegúrate de tener las columnas: Nombre, Correo, Celular (opcional)');
        }

        const response = await fetch(`${BACKEND_URL}/api/test-email/queue/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contacts }),
        });

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.message || 'Error al procesar el archivo CSV');
        }

        const result = await response.json();

        if (result.skippedCount > 0) {
          setUploadSummary({
            totalUploaded: result.totalUploaded,
            validCount: result.validCount,
            skippedCount: result.skippedCount,
            skippedContacts: result.skippedContacts || [],
          });
          setSuccessMsg(`¡Campaña procesada! ${result.validCount} contactos válidos agendados en Google Calendar. Se omitieron ${result.skippedCount} contactos duplicados o enviados en los últimos 60 días.`);
        } else {
          setUploadSummary(null);
          setSuccessMsg(`¡CSV cargado con éxito! Se procesaron ${result.validCount || contacts.length} contactos y se asignaron horarios de Google Calendar.`);
        }
        await fetchPendingQueue();
      } catch (err: any) {
        setErrorMsg(err.message || 'Error al parsear el archivo CSV');
      } finally {
        setQueueLoading(false);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Modificar slot sugerido o excluir contacto
  const handleUpdateQueueItem = async (id: string, proposedTime?: string, status?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/test-email/queue/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedTime, status }),
      });
      if (response.ok) {
        await fetchPendingQueue();
      }
    } catch (err) {
      console.error('Error al actualizar registro de cola:', err);
    }
  };

  // Procesar e Iniciar el Worker
  const handleProcessQueue = async () => {
    setQueueLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      let attachmentData = undefined;
      if (selectedFile) {
        const base64Content = await toBase64(selectedFile);
        attachmentData = {
          filename: selectedFile.name,
          content: base64Content,
        };
      }

      const response = await fetch(`${BACKEND_URL}/api/test-email/queue/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          signatureId,
          attachment: attachmentData,
          sendInterval: Number(sendInterval),
          sendIntervalUnit: sendIntervalUnit
        }),
      });
      if (response.ok) {
        setSuccessMsg('Campaña de correos iniciada. El despacho secuencial se procesa en segundo plano.');
        await fetchQueueStatus();
        await fetchPendingQueue();
      } else {
        const errData = await response.json();
        throw new Error(errData.message || 'Error al procesar cola');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setQueueLoading(false);
    }
  };

  // Detener / Pausar la cola de envíos activa
  const handleStopQueue = async () => {
    if (!window.confirm('¿Estás seguro de que deseas detener el envío de la cola? Los correos pendientes se mantendrán guardados.')) return;
    setQueueLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/test-email/queue/stop`, {
        method: 'POST',
      });
      if (response.ok) {
        setSuccessMsg('Cola de envíos detenida. Los correos pendientes se mantienen listos en la cola.');
        await fetchQueueStatus();
        await fetchPendingQueue();
      } else {
        const errData = await response.json();
        throw new Error(errData.message || 'Error al detener la cola');
      }
    } catch (err: any) {
      setErrorMsg(`Error al detener envíos: ${err.message}`);
    } finally {
      setQueueLoading(false);
    }
  };

  // Limpiar la cola de envíos
  const handleClearQueue = async () => {
    if (!window.confirm('¿Estás seguro de que deseas limpiar la cola de envíos? Esto detendrá cualquier envío pendiente.')) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/test-email/queue/clear`, {
        method: 'POST',
      });
      if (response.ok) {
        setSuccessMsg('Cola de envíos limpiada y reseteada.');
        setQueueItems([]);
        setUploadSummary(null);
        await fetchQueueStatus();
      }
    } catch (err) {
      console.error('Error al limpiar cola:', err);
    }
  };

  // Sincronizar configuraciones y colas al iniciar
  useEffect(() => {
    fetchSettings();
    fetchPendingQueue();
    fetchQueueStatus();
    fetchFreeSlots();
  }, [fetchSettings, fetchPendingQueue, fetchQueueStatus, fetchFreeSlots]);

  // Polling del progreso del worker
  useEffect(() => {
    let interval: any;
    if (queueStatus.isProcessing) {
      interval = setInterval(() => {
        fetchQueueStatus();
        fetchPendingQueue();
      }, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [queueStatus.isProcessing, fetchQueueStatus, fetchPendingQueue]);

  // Manejar el envío de correo de prueba
  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientEmail) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const fullSender = senderName.trim()
      ? `${senderName.trim()} <${senderEmail.trim()}>`
      : senderEmail.trim();

    try {
      let attachmentData = undefined;
      if (selectedFile) {
        const base64Content = await toBase64(selectedFile);
        attachmentData = {
          filename: selectedFile.name,
          content: base64Content,
        };
      }

      const response = await fetch(`${BACKEND_URL}/api/test-email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          recipientEmail, 
          recipientName: recipientName.trim() || undefined,
          proposedTime: proposedTime ? new Date(proposedTime).toISOString() : undefined,
          senderEmail: fullSender,
          subject, 
          body: emailBody,
          signatureId,
          attachment: attachmentData
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al enviar correo');
      }

      setSuccessMsg(`¡Correo enviado con éxito a ${recipientEmail}!`);
      setRecipientEmail('');
      setSelectedFile(null); // Limpiar adjunto tras el éxito
      // Refrescar la lista de correos inmediatamente
      await fetchEmails(true);
    } catch (error: any) {
      console.error('Error al enviar correo:', error);
      setErrorMsg(`Error de Envío: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // Formatear fechas de manera elegante en zona horaria Lima
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Formatear fechas de agenda propuesta para validación rápida en zona horaria Lima
  const formatProposedDate = (dateString?: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const str = date.toLocaleDateString('es-ES', {
      timeZone: 'America/Lima',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  return (
    <div className="min-h-screen bg-[#08101A] text-slate-100 flex flex-col antialiased selection:bg-brand-gold/30 selection:text-brand-gold">
      
      {/* Cabecera Premium Full-Width */}
      <header className="border-b border-brand-gold/30 bg-[#0D1B2A] py-5 px-4 sm:px-8 shadow-lg shadow-black/40 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
        <div className="max-w-[1780px] w-full mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-brand-gold/10 border border-brand-gold/40 rounded-xl text-brand-gold shadow-md shadow-brand-gold/10">
              <Mail className="w-7 h-7 animate-pulse-gold" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-brand-gold font-sans">
                  AFINITIVE
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-brand-gold/15 border border-brand-gold/30 text-brand-gold text-xxs font-mono uppercase font-bold tracking-wider">
                  Suite Operador
                </span>
              </div>
              <p className="text-xs text-brand-gold font-medium uppercase tracking-widest mt-0.5">
                Monitoreo Omnicanal y Conversión en Vivo — Irina
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap justify-center md:justify-end">
            <a
              href="https://operador.afinitive.com.pe/formEvento/index2.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open("https://operador.afinitive.com.pe/formEvento/index2.html", "_blank");
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-brand-gold/10 hover:bg-brand-gold/25 active:bg-brand-gold/30 border border-brand-gold/40 hover:border-brand-gold/60 text-xs font-semibold text-brand-gold rounded-xl transition-all duration-200 shadow-md shadow-brand-gold/5"
            >
              <Calendar className="w-3.5 h-3.5 text-brand-gold" />
              <span>Formulario de Eventos</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
            <span className="h-6 w-px bg-slate-800 hidden sm:inline"></span>
            <button
              onClick={() => fetchEmails()}
              disabled={refreshing}
              className="flex items-center gap-2 px-3.5 py-2 bg-brand-navy-light hover:bg-[#22334F] active:bg-[#0D1B2A] border border-brand-gold/20 hover:border-brand-gold/40 text-xs font-medium rounded-xl transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-brand-gold ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
            <span className="h-6 w-px bg-slate-800 hidden sm:inline"></span>
            <div className="text-xs text-slate-400 font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
              Backend: <span className="text-brand-gold font-semibold">{BACKEND_URL}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal Full-Width */}
      <main className="flex-1 max-w-[1780px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        {/* Pestañas de Navegación Premium */}
        <div className="flex border-b border-slate-800 gap-2 overflow-x-auto pb-px">
          <button
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2 px-6 py-3.5 font-semibold text-sm transition-all duration-200 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'individual'
                ? 'border-brand-gold text-brand-gold bg-brand-gold/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Envío Individual</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('campanas');
              fetchSettings();
            }}
            className={`flex items-center gap-2 px-6 py-3.5 font-semibold text-sm transition-all duration-200 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'campanas'
                ? 'border-brand-gold text-brand-gold bg-brand-gold/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Campañas Masivas</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('agenda');
              fetchSettings();
            }}
            className={`flex items-center gap-2 px-6 py-3.5 font-semibold text-sm transition-all duration-200 border-b-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'agenda'
                ? 'border-brand-gold text-brand-gold bg-brand-gold/5'
                : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Configuración y Tiempos de Envío</span>
          </button>
        </div>

        {/* Banner de Notificaciones */}
        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/40 text-red-200 px-5 py-4 rounded-xl flex items-start gap-3 shadow-md animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Error detectado</p>
              <p className="text-xs text-red-300/90 mt-1">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/40 text-green-200 px-5 py-4 rounded-xl flex items-start gap-3 shadow-md animate-fade-in">
            <CheckCircle className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-sm">Operación Exitosa</p>
              <p className="text-xs text-green-300/90 mt-1">{successMsg}</p>
            </div>
          </div>
        )}

        {/* Pestaña: Envío Individual */}
        {activeTab === 'individual' && (
          <>
            <section className="bg-gradient-to-b from-[#0D1B2A] to-[#0A1420] border border-brand-gold/20 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10 space-y-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold text-brand-gold">Enviar Correo Electrónico</h2>
                  <p className="text-sm text-slate-400">
                    Envía un correo con pixel de rastreo de apertura integrado. El estado se reflejará en la tabla inferior al ser abierto.
                  </p>
                </div>

                <form onSubmit={handleSendEmail} className="space-y-5 pt-2">
                  {/* Selección de Firma */}
                  <div className="space-y-2">
                    <label className="text-xs text-brand-gold font-medium uppercase tracking-wider block">Firma del Correo (Remitente)</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <button
                        type="button"
                        onClick={() => handleSignatureChange('irina')}
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                          signatureId === 'irina'
                            ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-lg shadow-brand-gold/5'
                            : 'bg-brand-navy-dark border-brand-gold/10 hover:border-brand-gold/30 text-slate-400'
                        }`}
                      >
                        <img src="https://dashbportal.com/afinitive/foto_irina.png" className="w-7 h-7 rounded-full object-cover border border-brand-gold/25" alt="Irina" />
                        <div className="text-left">
                          <p className="font-semibold leading-tight">Irina Portilla Farfán</p>
                          <p className="text-xxs opacity-80 font-normal">Client Experience Manager</p>
                        </div>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => handleSignatureChange('ricardo')}
                        className={`flex items-center gap-3 px-5 py-3 rounded-xl border text-sm font-medium transition-all duration-200 cursor-pointer ${
                          signatureId === 'ricardo'
                            ? 'bg-brand-gold/10 border-brand-gold text-brand-gold shadow-lg shadow-brand-gold/5'
                            : 'bg-brand-navy-dark border-brand-gold/10 hover:border-brand-gold/30 text-slate-400'
                        }`}
                      >
                        <img src="https://dashbportal.com/afinitive/rbertalmio.png" className="w-7 h-7 rounded-full object-cover border border-brand-gold/25" alt="Ricardo" />
                        <div className="text-left">
                          <p className="font-semibold leading-tight">Ricardo Bertalmio Ruibal</p>
                          <p className="text-xxs opacity-80 font-normal">CEO Wealth Management</p>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Fila 1: Datos del Remitente */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-brand-gold font-medium uppercase tracking-wider">Nombre del Remitente (De)</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Irina Portilla"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        className="w-full px-4 py-3 bg-brand-navy-dark border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-brand-gold font-medium uppercase tracking-wider">Correo Remitente (De)</label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: iportilla@afinitive.com.pe"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        className="w-full px-4 py-3 bg-brand-navy-dark border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans"
                      />
                    </div>
                  </div>

                  {/* Fila 2: Datos del Destinatario */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs text-brand-gold font-medium uppercase tracking-wider">Nombre del Contacto (Para)</label>
                      <input
                        type="text"
                        placeholder="Ej: Marielisa o Maycol"
                        value={recipientName}
                        onChange={(e) => {
                          setRecipientName(e.target.value);
                        }}
                        className="w-full px-4 py-3 bg-brand-navy-dark border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-brand-gold font-medium uppercase tracking-wider">Correo del Cliente (Para)</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <Mail className="w-5 h-5 text-slate-400" />
                        </div>
                        <input
                          type="email"
                          required
                          placeholder="cliente@alto-patrimonio.com"
                          value={recipientEmail}
                          onChange={(e) => setRecipientEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-brand-navy-dark border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Fila 3: Fecha/Hora Sugerida & Asunto */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5 relative">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-brand-gold font-medium uppercase tracking-wider">Fecha y Hora Propuesta</label>
                        <button
                          type="button"
                          onClick={() => setShowIndividualSlotPicker(!showIndividualSlotPicker)}
                          className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Calendar className="w-3 h-3" />
                          {showIndividualSlotPicker ? 'Ocultar turnos' : 'Ver turnos libres Calendar'}
                        </button>
                      </div>
                      
                      <div className="relative">
                        <input
                          type="datetime-local"
                          value={proposedTime}
                          onChange={(e) => {
                            setProposedTime(e.target.value);
                            if (e.target.value) {
                              setEmailBody(buildEmailTemplate(signatureId, recipientName, e.target.value));
                            }
                          }}
                          className="w-full px-4 py-3 bg-brand-navy-dark border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans [color-scheme:dark]"
                        />
                      </div>

                      {/* Popover de Slots Libres de Google Calendar */}
                      {showIndividualSlotPicker && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-[#0A1420] border border-brand-gold/40 rounded-xl p-4 shadow-2xl space-y-3">
                          <div className="flex items-center justify-between border-b border-brand-gold/15 pb-2">
                            <span className="text-xs font-semibold text-brand-gold">Seleccionar Turno Libre (Google Calendar)</span>
                            <button
                              type="button"
                              onClick={() => setShowIndividualSlotPicker(false)}
                              className="text-slate-400 hover:text-slate-200 text-xs"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Días */}
                          <div className="grid grid-cols-5 gap-1.5">
                            {getNext14Days().map((date) => {
                              const yyyy = date.getFullYear();
                              const mm = String(date.getMonth() + 1).padStart(2, '0');
                              const dd = String(date.getDate()).padStart(2, '0');
                              const yyyymmdd = `${yyyy}-${mm}-${dd}`;
                              const hasSlots = freeSlots[yyyymmdd] && freeSlots[yyyymmdd].length > 0;
                              const isSelected = selectedDayIndividual === yyyymmdd;
                              const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                              const dayNum = date.getDate();

                              return (
                                <button
                                  key={yyyymmdd}
                                  type="button"
                                  disabled={!hasSlots}
                                  onClick={() => setSelectedDayIndividual(yyyymmdd)}
                                  className={`flex flex-col items-center justify-center p-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed ${
                                    isSelected
                                      ? 'bg-brand-gold text-[#070F1E] font-bold shadow-md'
                                      : hasSlots
                                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30 hover:bg-blue-500/30'
                                        : 'bg-slate-900/40 text-slate-600 border border-slate-800/40'
                                  }`}
                                >
                                  <span className="uppercase text-[9px] opacity-75">{dayName}</span>
                                  <span className="text-xs font-bold">{dayNum}</span>
                                </button>
                              );
                            })}
                          </div>

                          {/* Horarios del día */}
                          {selectedDayIndividual && freeSlots[selectedDayIndividual] && (
                            <div className="space-y-1.5 border-t border-brand-gold/15 pt-2">
                              <p className="text-[10px] text-slate-400 uppercase font-semibold">Horarios disponibles ({selectedDayIndividual}):</p>
                              <div className="grid grid-cols-3 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                                {freeSlots[selectedDayIndividual].map((time) => (
                                  <button
                                    key={time}
                                    type="button"
                                    onClick={() => {
                                      const formattedValue = `${selectedDayIndividual}T${time}:00-05:00`;
                                      setProposedTime(formattedValue);
                                      setEmailBody(buildEmailTemplate(signatureId, recipientName, formattedValue));
                                      setShowIndividualSlotPicker(false);
                                    }}
                                    className="py-1.5 px-2 text-xs font-mono bg-brand-navy-dark hover:bg-brand-gold hover:text-[#070F1E] border border-brand-gold/20 rounded-lg text-slate-200 text-center transition-all cursor-pointer font-semibold"
                                  >
                                    {time}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs text-brand-gold font-medium uppercase tracking-wider">Asunto de la Invitación</label>
                      <input
                        type="text"
                        required
                        placeholder="Asunto de la invitación"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full px-4 py-3 bg-brand-navy-dark border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans"
                      />
                    </div>
                  </div>

                  {/* Cuerpo del Mensaje */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-brand-gold font-medium uppercase tracking-wider">Cuerpo del Mensaje (Invitación)</label>
                      <button
                        type="button"
                        onClick={() => setEmailBody(buildEmailTemplate(signatureId, recipientName, proposedTime))}
                        className="text-[11px] text-brand-gold/80 hover:text-brand-gold font-medium flex items-center gap-1 cursor-pointer transition-colors"
                        title="Regenerar mensaje con el nombre y fecha seleccionados"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Actualizar texto con fecha/nombre</span>
                      </button>
                    </div>
                    <textarea
                      required
                      rows={6}
                      placeholder="Escribe el mensaje de invitación para el cliente de alto patrimonio..."
                      value={emailBody}
                      onChange={(e) => setEmailBody(e.target.value)}
                      className="w-full px-4 py-3 bg-brand-navy-dark border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans resize-none"
                    />
                  </div>

                  {/* Archivo Adjunto (Opcional) */}
                  <div className="space-y-1.5 pt-2">
                    <label className="text-xs text-brand-gold font-medium uppercase tracking-wider block">
                      Documento Adjunto (Opcional - Máx. 10MB)
                    </label>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-2 px-4 py-2.5 bg-brand-navy-dark border border-brand-gold/20 hover:border-brand-gold/50 rounded-xl text-slate-300 hover:text-slate-100 cursor-pointer transition-all duration-200 text-xs font-sans select-none">
                        <Paperclip className="w-4 h-4 text-brand-gold" />
                        <span>Seleccionar archivo</span>
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                alert("El archivo excede el tamaño máximo permitido de 10MB");
                                e.target.value = '';
                                return;
                              }
                              setSelectedFile(file);
                            }
                          }}
                        />
                      </label>
                      {selectedFile && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-brand-gold/10 border border-brand-gold/30 rounded-xl text-xs text-brand-gold font-sans max-w-full sm:max-w-xs truncate">
                          <span className="truncate">{selectedFile.name}</span>
                          <span className="text-[10px] text-slate-400 shrink-0">({(selectedFile.size / (1024 * 1024)).toFixed(2)} MB)</span>
                          <button
                            type="button"
                            onClick={() => setSelectedFile(null)}
                            className="p-1 hover:bg-brand-gold/20 rounded-full text-brand-gold/80 hover:text-brand-gold transition-all duration-100 shrink-0"
                            title="Quitar archivo"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botón de Envío */}
                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={loading || !recipientEmail || !subject || !emailBody}
                      className="px-8 py-3.5 bg-gradient-to-r from-brand-gold-dark to-brand-gold hover:from-brand-gold hover:to-brand-gold-light active:from-brand-gold-dark active:to-brand-gold text-brand-navy font-bold rounded-xl shadow-lg shadow-brand-gold/10 hover:shadow-brand-gold/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 min-w-[220px]"
                    >
                      {loading ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin" />
                          <span>Enviando Invitación...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          <span>Enviar Invitación</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </section>

            {/* Sección de Historial - Panel de Control Rediseñado Full-Width */}
            <section className="bg-gradient-to-b from-[#0D1B2A] to-[#0A1420] border border-brand-gold/20 rounded-2xl shadow-2xl overflow-hidden w-full">
              {/* Header de la sección */}
              <div className="p-6 border-b border-brand-gold/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-950/40">
                <div>
                  <h2 className="text-xl font-bold text-brand-gold flex items-center gap-2.5">
                    <span>Panel de Rastreos en Tiempo Real</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold font-mono font-normal border border-brand-gold/30">
                      {emails.length} envíos
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Monitorea qué prospectos abren el correo, quiénes hacen clic en WhatsApp y quiénes confirman su reunión.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono rounded-full flex items-center gap-2 shadow-sm">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    Live Polling 5s
                  </span>
                </div>
              </div>

              {/* Tarjetas de Métricas Interactivas (Funnel y Filtro Rápido en 1 Clic) */}
              <div className="p-6 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 border-b border-brand-gold/10 bg-slate-950/20">
                {/* Card 1: Total Enviados */}
                <button
                  type="button"
                  onClick={() => setFilterStatus('Todos')}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                    filterStatus === 'Todos'
                      ? 'bg-[#112338] border-blue-400/80 ring-2 ring-blue-500/40 shadow-xl shadow-blue-950/50 scale-[1.01]'
                      : 'bg-[#08101A] border-brand-gold/15 hover:border-blue-500/40 hover:bg-[#0c1827]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Enviados</p>
                      {filterStatus === 'Todos' && <span className="w-2 h-2 rounded-full bg-blue-400"></span>}
                    </div>
                    <p className="text-3xl font-extrabold text-slate-100 font-mono mt-1">{emails.length}</p>
                    <p className="text-xxs text-slate-500 mt-1 group-hover:text-blue-400 transition-colors">
                      {filterStatus === 'Todos' ? '✓ Viendo todo el historial' : '⚡ Clic para ver todos'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border transition-colors ${
                    filterStatus === 'Todos' ? 'bg-blue-500/20 border-blue-400/50 text-blue-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                  }`}>
                    <Mail className="w-6 h-6" />
                  </div>
                </button>

                {/* Card 2: Correos Leídos */}
                <button
                  type="button"
                  onClick={() => setFilterStatus('Leído')}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                    filterStatus === 'Leído'
                      ? 'bg-[#09261C] border-emerald-400/80 ring-2 ring-emerald-500/40 shadow-xl shadow-emerald-950/50 scale-[1.01]'
                      : 'bg-[#08101A] border-brand-gold/15 hover:border-emerald-500/40 hover:bg-[#0c1827]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-emerald-400 font-bold uppercase tracking-wider">Correos Leídos</p>
                      {filterStatus === 'Leído' && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-3xl font-extrabold text-emerald-400 font-mono">
                        {emails.filter(e => e.status === 'Leído' || e.status === 'Agendado' || e.whatsapp_clicked_at).length}
                      </p>
                      <span className="text-xs font-bold text-emerald-400/80 font-mono">
                        ({emails.length > 0 ? Math.round((emails.filter(e => e.status === 'Leído' || e.status === 'Agendado' || e.whatsapp_clicked_at).length / emails.length) * 100) : 0}%)
                      </span>
                    </div>
                    <p className="text-xxs text-emerald-500/80 mt-1 group-hover:text-emerald-400 font-medium transition-colors">
                      {filterStatus === 'Leído' ? '✓ Viendo correos abiertos' : '⚡ Clic para ver leídos'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border transition-colors ${
                    filterStatus === 'Leído' ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  }`}>
                    <Eye className="w-6 h-6" />
                  </div>
                </button>

                {/* Card 3: Clicks WhatsApp (Destacado) */}
                <button
                  type="button"
                  onClick={() => setFilterStatus('WhatsApp')}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                    filterStatus === 'WhatsApp'
                      ? 'bg-[#082B18] border-[#25D366] ring-2 ring-[#25D366]/50 shadow-2xl shadow-emerald-950/70 scale-[1.01]'
                      : 'bg-[#08101A] border-[#25D366]/30 hover:border-[#25D366]/70 hover:bg-[#0a1e17]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-[#25D366] font-bold uppercase tracking-wider flex items-center gap-1.5">
                        Clicks WhatsApp
                      </p>
                      {filterStatus === 'WhatsApp' && <span className="w-2 h-2 rounded-full bg-[#25D366] animate-ping"></span>}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-3xl font-extrabold text-[#25D366] font-mono">
                        {emails.filter(e => e.whatsapp_clicked_at).length}
                      </p>
                      <span className="text-xs font-bold text-[#25D366]/80 font-mono">
                        ({emails.length > 0 ? Math.round((emails.filter(e => e.whatsapp_clicked_at).length / emails.length) * 100) : 0}%)
                      </span>
                    </div>
                    <p className="text-xxs text-emerald-400 mt-1 font-semibold group-hover:underline">
                      {filterStatus === 'WhatsApp' ? '✓ Viendo quiénes clickearon' : '👉 Clic para filtrar leads de WhatsApp'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border transition-colors ${
                    filterStatus === 'WhatsApp' ? 'bg-[#25D366]/25 border-[#25D366]/60 text-[#25D366]' : 'bg-[#25D366]/15 border-[#25D366]/30 text-[#25D366]'
                  }`}>
                    <MessageCircle className="w-6 h-6" />
                  </div>
                </button>

                {/* Card 4: Citas Agendadas */}
                <button
                  type="button"
                  onClick={() => setFilterStatus('Agendado')}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between group ${
                    filterStatus === 'Agendado'
                      ? 'bg-[#241336] border-purple-400 ring-2 ring-purple-500/50 shadow-2xl shadow-purple-950/70 scale-[1.01]'
                      : 'bg-[#08101A] border-purple-500/30 hover:border-purple-400/60 hover:bg-[#160d24]'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs text-purple-300 font-bold uppercase tracking-wider">Citas Agendadas</p>
                      {filterStatus === 'Agendado' && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-3xl font-extrabold text-purple-400 font-mono">
                        {emails.filter(e => e.status === 'Agendado').length}
                      </p>
                      <span className="text-xs font-bold text-purple-300/80 font-mono">
                        ({emails.length > 0 ? Math.round((emails.filter(e => e.status === 'Agendado').length / emails.length) * 100) : 0}% conv.)
                      </span>
                    </div>
                    <p className="text-xxs text-purple-300 mt-1 font-semibold group-hover:underline">
                      {filterStatus === 'Agendado' ? '✓ Viendo citas confirmadas' : '👉 Clic para filtrar agendados'}
                    </p>
                  </div>
                  <div className={`p-3 rounded-xl border transition-colors ${
                    filterStatus === 'Agendado' ? 'bg-purple-500/25 border-purple-400/60 text-purple-300' : 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                  }`}>
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </button>
              </div>

              {/* Barra de Búsqueda y Filtros en Tiempo Real */}
              <div className="p-6 bg-slate-950/40 border-b border-brand-gold/10 flex flex-col lg:flex-row gap-4 items-stretch lg:items-end justify-between">
                {/* Búsqueda inteligente por nombre, correo o asunto */}
                <div className="w-full lg:w-96 space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-brand-gold" />
                    Buscar Prospecto
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Escribe nombre, correo o asunto..."
                      className="w-full pl-10 pr-9 py-2.5 bg-[#08101A] border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans"
                    />
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 p-1"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtros de Estado y Fechas */}
                <div className="flex flex-wrap sm:flex-nowrap gap-3 items-end w-full lg:w-auto">
                  <div className="w-full sm:w-52 space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Estado</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#08101A] border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans"
                    >
                      <option value="Todos">Todos los Estados ({emails.length})</option>
                      <option value="WhatsApp">💬 Clicks WhatsApp ({emails.filter(e => e.whatsapp_clicked_at).length})</option>
                      <option value="Agendado">📅 Cita Agendada ({emails.filter(e => e.status === 'Agendado').length})</option>
                      <option value="Leído">👁️ Leído ({emails.filter(e => e.status === 'Leído' || e.status === 'Agendado').length})</option>
                      <option value="Enviado">✉️ Solo Enviado ({emails.filter(e => e.status === 'Enviado').length})</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-36 space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Desde</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#08101A] border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 text-sm font-sans"
                    />
                  </div>

                  <div className="w-full sm:w-36 space-y-1.5">
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Hasta</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[#08101A] border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 text-sm font-sans"
                    />
                  </div>

                  {(filterStatus !== 'Todos' || filterStartDate || filterEndDate || searchQuery) && (
                    <button
                      onClick={() => {
                        setFilterStatus('Todos');
                        setFilterStartDate('');
                        setFilterEndDate('');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 active:bg-red-500/30 border border-red-500/30 text-red-300 text-sm font-medium rounded-xl transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap h-[42px]"
                      title="Restablecer todos los filtros"
                    >
                      <X className="w-4 h-4" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Banner visual de Filtro Activo */}
              {filterStatus !== 'Todos' && (
                <div className="px-6 py-3 bg-brand-gold/10 border-b border-brand-gold/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-400 font-medium">Mostrando únicamente:</span>
                    <span className="font-bold text-white px-2.5 py-1 rounded-lg bg-slate-900 border border-brand-gold/40 flex items-center gap-1.5">
                      {filterStatus === 'WhatsApp' && (
                        <>
                          <MessageCircle className="w-3.5 h-3.5 text-[#25D366]" />
                          <span>Prospectos que hicieron clic en WhatsApp</span>
                        </>
                      )}
                      {filterStatus === 'Agendado' && (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-purple-400" />
                          <span>Prospectos con Cita Agendada</span>
                        </>
                      )}
                      {filterStatus === 'Leído' && (
                        <>
                          <Eye className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Prospectos que abrieron el correo</span>
                        </>
                      )}
                      {filterStatus === 'Enviado' && (
                        <>
                          <Mail className="w-3.5 h-3.5 text-blue-400" />
                          <span>Prospectos en estado enviado</span>
                        </>
                      )}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full bg-brand-gold/20 text-brand-gold font-mono font-bold">
                      {filteredEmails.length} {filteredEmails.length === 1 ? 'prospecto encontrado' : 'prospectos encontrados'}
                    </span>
                  </div>
                  <button
                    onClick={() => setFilterStatus('Todos')}
                    className="text-brand-gold hover:text-white font-semibold underline cursor-pointer text-xs transition-colors"
                  >
                    Mostrar todos los registros
                  </button>
                </div>
              )}

              {/* Tabla de Rastreos Full-Width */}
              <div className="overflow-x-auto w-full">
                {emails.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500 shadow-lg">
                      <Mail className="w-10 h-10 text-brand-gold/60" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg text-slate-300 font-semibold">No hay registros de envío en este entorno</p>
                      <p className="text-xs text-slate-500">Usa el formulario superior para enviar tu primer correo de prueba.</p>
                    </div>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center mx-auto text-slate-500 shadow-lg">
                      <Search className="w-10 h-10 text-brand-gold/60" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-lg text-slate-300 font-semibold">Ningún prospecto coincide con los filtros</p>
                      <p className="text-xs text-slate-500">
                        Prueba ajustando la búsqueda <span className="text-brand-gold font-mono">"{searchQuery}"</span> o cambiando el estado seleccionado.
                      </p>
                      <button
                        onClick={() => {
                          setFilterStatus('Todos');
                          setSearchQuery('');
                          setFilterStartDate('');
                          setFilterEndDate('');
                        }}
                        className="mt-3 px-4 py-2 bg-brand-gold/15 hover:bg-brand-gold/25 border border-brand-gold/40 text-brand-gold text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        Restablecer Filtros
                      </button>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#07111D] text-slate-300 text-xs font-bold tracking-wider uppercase border-b border-brand-gold/20">
                        <th className="py-4 px-6 md:px-8">Prospecto / Lead</th>
                        <th className="py-4 px-6">Interacción y Estado</th>
                        <th className="py-4 px-6">Agenda Propuesta (Calendar)</th>
                        <th className="py-4 px-6">Fecha de Envío</th>
                        <th className="py-4 px-6">Asunto del Correo</th>
                        <th className="py-4 px-6 text-right">Acción Rápida</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {filteredEmails.map((email) => (
                        <tr 
                          key={email.id} 
                          className={`transition-colors duration-150 group ${
                            email.whatsapp_clicked_at 
                              ? 'bg-[#0B2018]/50 hover:bg-[#0E2D22]/80 border-l-4 border-l-[#25D366]' 
                              : email.status === 'Agendado'
                              ? 'bg-[#1C102E]/50 hover:bg-[#281742]/80 border-l-4 border-l-purple-500'
                              : 'hover:bg-slate-900/60 border-l-4 border-l-transparent'
                          }`}
                        >
                          {/* Columna 1: Prospecto / Destinatario */}
                          <td className="py-4 px-6 md:px-8 font-medium">
                            <div className="flex items-center gap-3.5">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-md ${
                                email.whatsapp_clicked_at
                                  ? 'bg-[#25D366]/20 border border-[#25D366]/50 text-[#25D366] shadow-[#25D366]/10'
                                  : email.status === 'Agendado'
                                  ? 'bg-purple-500/20 border border-purple-500/50 text-purple-300 shadow-purple-950/40'
                                  : email.status === 'Leído'
                                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-800 border border-slate-700 text-slate-300'
                              }`}>
                                {(email.recipient_name || email.recipient_email).charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-slate-100 font-bold text-sm flex items-center gap-2">
                                  <span className="truncate">{email.recipient_name || 'Prospecto sin nombre'}</span>
                                  {email.whatsapp_clicked_at && (
                                    <span 
                                      className="px-2 py-0.5 rounded-md bg-[#25D366]/20 border border-[#25D366]/40 text-[#25D366] text-xxs font-bold uppercase tracking-wider"
                                      title="Este cliente hizo clic en el enlace de WhatsApp"
                                    >
                                      WhatsApp
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs font-mono text-slate-400 mt-0.5 truncate">{email.recipient_email}</div>
                                {email.recipient_phone && (
                                  <div className="text-xxs font-mono text-brand-gold flex items-center gap-1 mt-0.5 font-semibold">
                                    <Phone className="w-2.5 h-2.5" />
                                    <span>{email.recipient_phone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Columna 2: Interacciones y Estado */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5 items-start">
                              {/* Badge WhatsApp si hizo clic */}
                              {email.whatsapp_clicked_at && (
                                <span 
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#25D366]/20 border border-[#25D366]/60 text-[#25D366] shadow-md shadow-emerald-950/40"
                                  title={`Clic registrado: ${formatDate(email.whatsapp_clicked_at)}`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                                  <span>Clic en WhatsApp:</span>
                                  <span className="font-mono text-xxs opacity-90">{formatDate(email.whatsapp_clicked_at)}</span>
                                </span>
                              )}

                              {/* Badge de Estado Cita o Leído */}
                              {email.status === 'Agendado' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-purple-500/20 border border-purple-500/60 text-purple-300 shadow-md shadow-purple-950/40">
                                  <CheckCircle className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                  <span>Cita Agendada</span>
                                </span>
                              ) : email.status === 'Leído' ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 shadow-sm">
                                  <Eye className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <span>Leído</span>
                                  {email.opened_at && (
                                    <span className="text-xxs font-mono text-emerald-400/80">({formatDate(email.opened_at)})</span>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-brand-navy-light border border-blue-500/30 text-blue-400">
                                  <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  <span>Enviado</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Columna 3: Agenda Propuesta */}
                          <td className="py-4 px-6 whitespace-nowrap">
                            {email.proposed_time ? (
                              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-semibold shadow-sm">
                                <Calendar className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                                <span>{formatProposedDate(email.proposed_time)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Columna 4: Fecha de Envío */}
                          <td className="py-4 px-6 text-slate-300 text-xs whitespace-nowrap">
                            <div className="flex items-center gap-2 font-mono">
                              <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              <span>{formatDate(email.sent_at)}</span>
                            </div>
                          </td>

                          {/* Columna 5: Asunto del Correo */}
                          <td className="py-4 px-6 text-slate-300 text-xs max-w-sm" title={email.subject}>
                            <div className="truncate font-medium">{email.subject}</div>
                          </td>

                          {/* Columna 6: Acción Rápida Directa */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <a
                              href={`https://wa.me/${email.recipient_phone?.replace(/[^0-9]/g, '') || '51902821992'}?text=${encodeURIComponent(`Hola ${email.recipient_name || ''}, te contacto de Afinitive Wealth Management sobre la reunión coordinada.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/30 active:bg-[#25D366]/40 border border-[#25D366]/40 hover:border-[#25D366]/70 text-[#25D366] text-xs font-bold transition-all duration-150 shadow-md shadow-emerald-950/30"
                              title="Abrir chat de WhatsApp con este prospecto"
                            >
                              <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Chatear</span>
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>
          </>
        )}

        {/* Pestaña: Campañas Masivas */}
        {activeTab === 'campanas' && (
          <div className="space-y-8 animate-fade-in">
            {/* Sección de Carga de CSV y Control Global */}
            <section className="bg-gradient-to-b from-[#0D1B2A] to-[#0A1420] border border-brand-gold/20 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10 space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-brand-gold">Carga de Campaña Masiva</h2>
                    <p className="text-xs text-slate-400">
                      Sube un archivo CSV con columnas "Nombre, Correo, Celular". El sistema calculará la disponibilidad en Google Calendar automáticamente.
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {queueStatus.isProcessing && (
                      <button
                        onClick={handleStopQueue}
                        disabled={queueLoading}
                        className="px-4 py-2 border border-red-500/50 hover:border-red-400 bg-red-600/20 hover:bg-red-600/30 text-red-300 hover:text-red-200 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-lg shadow-red-950/40 animate-pulse disabled:opacity-50"
                      >
                        <PauseCircle className="w-4 h-4 text-red-400" />
                        <span>Detener Envíos</span>
                      </button>
                    )}
                    <button
                      onClick={handleClearQueue}
                      disabled={queueLoading}
                      className="px-4 py-2 border border-red-500/30 hover:border-red-500 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl text-sm font-semibold transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Limpiar Cola</span>
                    </button>
                  </div>
                </div>

                {/* Subidor de Archivo Drag & Drop */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="border-2 border-dashed border-brand-gold/25 hover:border-brand-gold/50 rounded-xl p-8 text-center bg-slate-950/20 transition-all duration-200 relative group">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      disabled={queueLoading || queueStatus.isProcessing}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <Upload className="w-10 h-10 text-brand-gold/60 group-hover:text-brand-gold mx-auto mb-3 transition-colors duration-205" />
                    <p className="text-sm font-medium text-slate-300">Arrastra tu archivo CSV o haz clic aquí</p>
                    <p className="text-xs text-slate-500 mt-1">Formato admitido: .csv (Nombre, Correo, Celular)</p>
                  </div>

                  {/* Panel de Estado / Progreso del Envió */}
                  <div className="bg-[#08101A] border border-brand-gold/10 rounded-xl p-6 space-y-4">
                    <h3 className="text-sm font-semibold text-brand-gold uppercase tracking-wider">Estado de Cola de Envíos</h3>
                    
                    {queueStatus.isProcessing ? (
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                            Enviando correos...
                          </span>
                          <span>{queueStatus.sent + queueStatus.failed} / {queueStatus.total} completados</span>
                        </div>
                        
                        {/* Barra de progreso */}
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div 
                            className="bg-gradient-to-r from-brand-gold-dark to-brand-gold h-full transition-all duration-300"
                            style={{ width: `${((queueStatus.sent + queueStatus.failed) / queueStatus.total) * 100}%` }}
                          ></div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center pt-2">
                          <div className="bg-slate-950/40 p-2 rounded border border-slate-800/40">
                            <p className="text-[10px] text-slate-500 uppercase">Enviados</p>
                            <p className="text-lg font-bold text-emerald-400">{queueStatus.sent}</p>
                          </div>
                          <div className="bg-slate-950/40 p-2 rounded border border-slate-800/40">
                            <p className="text-[10px] text-slate-500 uppercase">Fallidos</p>
                            <p className="text-lg font-bold text-red-400">{queueStatus.failed}</p>
                          </div>
                          <div className="bg-slate-950/40 p-2 rounded border border-slate-800/40">
                            <p className="text-[10px] text-slate-500 uppercase">Pendientes</p>
                            <p className="text-lg font-bold text-slate-300">{queueStatus.total - (queueStatus.sent + queueStatus.failed)}</p>
                          </div>
                        </div>

                        {/* Botón directo para detener desde la tarjeta de progreso */}
                        <div className="pt-2 border-t border-slate-800/60">
                          <button
                            onClick={handleStopQueue}
                            disabled={queueLoading}
                            className="w-full py-2.5 bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 hover:border-red-500/70 text-red-300 hover:text-red-200 font-semibold rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                          >
                            <PauseCircle className="w-4 h-4 text-red-400" />
                            <span>Pausar / Detener Envío de Cola</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="py-2 space-y-4">
                        <p className="text-sm text-slate-400">
                          {queueItems.length > 0 
                            ? `Cola lista con ${queueItems.length} contactos cargados en memoria. Revisa los horarios abajo antes de enviar.`
                            : "No hay ninguna campaña cargada actualmente. Sube un archivo CSV para comenzar."
                          }
                        </p>
                        {queueItems.length > 0 && (
                          <div className="space-y-3">
                            <p className="text-xs text-brand-gold/85 italic bg-brand-gold/5 border border-brand-gold/15 rounded-lg px-3 py-2 text-center">
                              Los correos se enviarán con la firma de: <strong>{signatureId === 'irina' ? 'Irina Portilla Farfán' : 'Ricardo Bertalmio Ruibal'}</strong>. (Puedes cambiarla en el selector en la parte superior).
                            </p>
                            {selectedFile && (
                              <p className="text-xs text-emerald-400/90 italic bg-emerald-500/5 border border-emerald-500/15 rounded-lg px-3 py-2 text-center">
                                📎 Se adjuntará el archivo: <strong>{selectedFile.name}</strong> a todos los correos.
                              </p>
                            )}
                            {/* Control directo del Intervalo de Envío */}
                            <div className="bg-slate-950/70 border border-brand-gold/25 rounded-xl p-3.5 space-y-2 text-xs">
                              <div className="flex items-center justify-between">
                                <label className="text-brand-gold font-semibold uppercase tracking-wider flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-brand-gold" />
                                  Intervalo entre Envíos:
                                </label>
                                <span className="text-[10px] text-slate-400">Control directo</span>
                              </div>
                              <div className="flex gap-2">
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={sendInterval}
                                  onChange={(e) => setSendInterval(Number(e.target.value))}
                                  disabled={queueLoading || queueStatus.isProcessing}
                                  className="w-1/2 px-3 py-2 bg-[#08101A] border border-brand-gold/30 focus:border-brand-gold rounded-lg text-slate-100 font-mono text-xs outline-none"
                                />
                                <select
                                  value={sendIntervalUnit}
                                  onChange={(e) => setSendIntervalUnit(e.target.value)}
                                  disabled={queueLoading || queueStatus.isProcessing}
                                  className="w-1/2 px-3 py-2 bg-[#08101A] border border-brand-gold/30 focus:border-brand-gold rounded-lg text-slate-100 font-sans text-xs outline-none"
                                >
                                  <option value="seconds">Segundos</option>
                                  <option value="minutes">Minutos</option>
                                  <option value="hours">Horas</option>
                                </select>
                              </div>
                              <p className="text-[11px] text-slate-400">
                                ⏱️ Se esperará exactamente <strong className="text-brand-gold font-mono">{sendInterval} {sendIntervalUnit === 'minutes' ? 'minutos' : sendIntervalUnit === 'seconds' ? 'segundos' : 'horas'}</strong> entre cada correo despachado.
                              </p>
                            </div>
                            <button
                              onClick={handleProcessQueue}
                              disabled={queueLoading}
                              className="w-full py-3 bg-gradient-to-r from-brand-gold-dark to-brand-gold hover:from-brand-gold hover:to-brand-gold-light text-brand-navy font-bold rounded-xl shadow-lg shadow-brand-gold/10 hover:shadow-brand-gold/20 transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                              <Play className="w-4 h-4 fill-current animate-pulse" />
                              <span>Comenzar Envíos en Cola</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Banner de Resumen de Duplicados / Enfriamiento */}
            {uploadSummary && uploadSummary.skippedCount > 0 && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-300">
                      Control de Duplicados y Enfriamiento: {uploadSummary.skippedCount} contacto(s) omitido(s)
                    </p>
                    <p className="text-xs text-amber-200/80">
                      De los {uploadSummary.totalUploaded} contactos del CSV, se asignó turno a {uploadSummary.validCount} contactos nuevos. Se descartaron {uploadSummary.skippedCount} por contacto reciente (&lt; 60 días) o duplicidad en el archivo.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSkippedModal(true)}
                  className="px-3.5 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors"
                >
                  Ver {uploadSummary.skippedCount} Omitidos
                </button>
              </div>
            )}

            {/* Modal de Contactos Omitidos */}
            {showSkippedModal && uploadSummary && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-[#0D1B2A] border border-brand-gold/40 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-fade-in max-h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-brand-gold">Contactos Omitidos por Duplicidad / Enfriamiento</h3>
                      <p className="text-xs text-slate-400">Estos prospectos no consumieron horarios de agenda para proteger la exclusividad de Afinitive.</p>
                    </div>
                    <button
                      onClick={() => setShowSkippedModal(false)}
                      className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                    {uploadSummary.skippedContacts.map((c, idx) => (
                      <div key={idx} className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                        <div>
                          <p className="font-semibold text-slate-200">{c.name} <span className="font-normal text-slate-400">({c.email})</span></p>
                          <p className="text-amber-400/90 text-[11px] mt-0.5">{c.reason}</p>
                        </div>
                        {c.daysAgo !== undefined && (
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] whitespace-nowrap shrink-0">
                            {c.daysAgo === 0 ? 'Hoy' : `Hace ${c.daysAgo} días`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-800">
                    <button
                      onClick={() => setShowSkippedModal(false)}
                      className="px-5 py-2 bg-brand-gold text-brand-navy font-bold rounded-xl text-xs hover:bg-brand-gold-light cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla de Previsualización y Edición de Citas */}
            {queueItems.length > 0 && (
              <section className="bg-gradient-to-b from-[#0D1B2A] to-[#0A1420] border border-brand-gold/20 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6 border-b border-brand-gold/15 flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-brand-gold">Previsualización de Envíos Soportados</h2>
                    <p className="text-sm text-slate-400">Verifica o cambia la cita asignada para cada cliente antes del despacho.</p>
                  </div>
                  <span className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-mono rounded-full">
                    {queueItems.length} Contactos
                  </span>
                </div>

                <div className="overflow-x-auto min-h-[450px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 text-slate-400 text-xs font-semibold tracking-wider uppercase border-b border-slate-800">
                        <th className="py-4 px-6">Cliente</th>
                        <th className="py-4 px-6">Correo</th>
                        <th className="py-4 px-6">Teléfono</th>
                        <th className="py-4 px-6">Cita Sugerida (Edición Libre)</th>
                        <th className="py-4 px-6">Estado</th>
                        <th className="py-4 px-6 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-sm">
                      {queueItems.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-900/40 transition-colors duration-150 group ${item.status === 'excluded' ? 'opacity-40' : ''}`}
                        >
                          <td className="py-4 px-6 font-medium text-slate-200">
                            {item.recipient_name}
                          </td>
                          <td className="py-4 px-6 text-slate-400">
                            {item.recipient_email}
                          </td>
                          <td className="py-4 px-6 text-slate-400">
                            {item.recipient_phone || <span className="text-slate-600 italic text-xs">No disponible</span>}
                          </td>
                          <td className="py-4 px-6 relative">
                            {activePickerId === item.id ? (
                              <div className="absolute z-50 top-full mt-1 left-0 w-[285px] bg-[#0b1420] border border-brand-gold/30 rounded-xl p-4 shadow-2xl space-y-3 text-slate-100">
                                <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                                  <span className="text-xs font-bold text-brand-gold">Seleccionar Fecha Libre</span>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setActivePickerId(null);
                                      setSelectedDayForPicker(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-200 text-xs font-bold cursor-pointer"
                                  >
                                    Cerrar
                                  </button>
                                </div>

                                {/* Listado de Días Disponibles */}
                                <div className="grid grid-cols-5 gap-1">
                                  {getNext14Days().map((date) => {
                                    const yyyy = date.getFullYear();
                                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                                    const dd = String(date.getDate()).padStart(2, '0');
                                    const yyyymmdd = `${yyyy}-${mm}-${dd}`;
                                    const hasSlots = freeSlots[yyyymmdd] && freeSlots[yyyymmdd].length > 0;
                                    const isSelected = selectedDayForPicker === yyyymmdd;
                                    
                                    const dayName = date.toLocaleDateString('es-ES', { weekday: 'short' });
                                    const dayNum = date.getDate();

                                    return (
                                      <button
                                        key={yyyymmdd}
                                        type="button"
                                        disabled={!hasSlots}
                                        onClick={() => setSelectedDayForPicker(yyyymmdd)}
                                        className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] font-semibold transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                          isSelected 
                                            ? 'bg-brand-gold text-[#070F1E] border border-brand-gold shadow-md'
                                            : hasSlots
                                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/35 hover:text-blue-300'
                                              : 'bg-slate-900/40 text-slate-600 border border-slate-800/40'
                                        }`}
                                        title={hasSlots ? `${freeSlots[yyyymmdd].length} horarios libres` : 'Sin turnos libres'}
                                      >
                                        <span className="uppercase text-[8px] opacity-75">{dayName}</span>
                                        <span className="text-xs font-bold mt-0.5">{dayNum}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Listado de Horarios del Día Seleccionado */}
                                {selectedDayForPicker && freeSlots[selectedDayForPicker] && (
                                  <div className="space-y-1.5 border-t border-slate-800/60 pt-2">
                                    <p className="text-[9px] text-slate-400 uppercase font-semibold">Horarios Libres ({selectedDayForPicker}):</p>
                                    <div className="grid grid-cols-3 gap-1 max-h-[100px] overflow-y-auto pr-1">
                                      {freeSlots[selectedDayForPicker].map((time) => (
                                        <button
                                          key={time}
                                          type="button"
                                          onClick={() => {
                                            const [hours, minutes] = time.split(':').map(Number);
                                            const [year, month, day] = selectedDayForPicker.split('-').map(Number);
                                            const pad = (n: number) => String(n).padStart(2, '0');
                                            const isoTime = `${year}-${pad(month)}-${pad(day)}T${pad(hours)}:${pad(minutes)}:00-05:00`;
                                            handleUpdateQueueItem(item.id, isoTime, undefined);
                                            setActivePickerId(null);
                                            setSelectedDayForPicker(null);
                                          }}
                                          className="py-1 px-1.5 text-[9px] font-mono bg-slate-950/60 hover:bg-brand-gold hover:text-[#070F1E] rounded text-slate-300 text-center transition-colors duration-150 cursor-pointer"
                                        >
                                          {time}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Entrada Manual de Fecha y Hora */}
                                <div className="border-t border-slate-800/60 pt-2 flex flex-col gap-1">
                                  <span className="text-[9px] text-slate-500">¿Fecha libre manual?</span>
                                  <input
                                    type="datetime-local"
                                    defaultValue={item.proposed_time ? item.proposed_time.slice(0, 16) : ''}
                                    onChange={(e) => {
                                      const localTime = e.target.value;
                                      if (localTime) {
                                        const isoTime = `${localTime}:00-05:00`;
                                        handleUpdateQueueItem(item.id, isoTime, undefined);
                                        setActivePickerId(null);
                                        setSelectedDayForPicker(null);
                                      }
                                    }}
                                    className="w-full px-2 py-1 bg-[#08101A] border border-slate-800 focus:border-brand-gold rounded text-[10px] font-mono text-slate-300 outline-none"
                                  />
                                </div>
                              </div>
                            ) : null}

                            <button
                              type="button"
                              disabled={queueStatus.isProcessing || item.status === 'excluded'}
                              onClick={() => {
                                setActivePickerId(item.id);
                                if (item.proposed_time) {
                                  const dateObj = new Date(item.proposed_time);
                                  if (!isNaN(dateObj.getTime())) {
                                    const dateInLima = new Date(dateObj.toLocaleString('en-US', { timeZone: 'America/Lima' }));
                                    const yyyy = dateInLima.getFullYear();
                                    const mm = String(dateInLima.getMonth() + 1).padStart(2, '0');
                                    const dd = String(dateInLima.getDate()).padStart(2, '0');
                                    setSelectedDayForPicker(`${yyyy}-${mm}-${dd}`);
                                  }
                                }
                              }}
                              className="px-3 py-1.5 w-full bg-[#08101A] border border-brand-gold/25 focus:border-brand-gold/90 hover:border-brand-gold/60 rounded-lg text-slate-100 text-xs font-mono text-left disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-1 group/btn cursor-pointer transition-colors duration-150"
                            >
                              <span>
                                {item.proposed_time 
                                  ? new Date(item.proposed_time).toLocaleDateString('es-ES', {
                                      timeZone: 'America/Lima',
                                      day: '2-digit',
                                      month: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                      hour12: false
                                    })
                                  : 'Sin fecha'}
                              </span>
                              <Calendar className="w-3.5 h-3.5 text-brand-gold/60 group-hover/btn:text-brand-gold transition-colors duration-150" />
                            </button>
                          </td>
                          <td className="py-4 px-6">
                            {item.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-amber-500/10 border border-amber-500/30 text-amber-400">
                                Pendiente
                              </span>
                            )}
                            {item.status === 'processing' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-blue-500/10 border border-blue-500/30 text-blue-400 animate-pulse">
                                Enviando...
                              </span>
                            )}
                            {item.status === 'sent' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                                Enviado
                              </span>
                            )}
                            {item.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-red-500/10 border border-red-500/30 text-red-400" title={item.error_message || ''}>
                                Error
                              </span>
                            )}
                            {item.status === 'agendado' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-purple-500/20 border border-purple-500/50 text-purple-300 shadow-sm">
                                <CheckCircle className="w-3 h-3 text-purple-400" />
                                Cita Agendada
                              </span>
                            )}
                            {item.status === 'excluded' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xxs font-semibold bg-slate-500/10 border border-slate-500/30 text-slate-400">
                                Excluido
                              </span>
                            )}

                            {item.whatsapp_clicked_at && (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xxs font-semibold bg-[#25D366]/20 border border-[#25D366]/50 text-[#25D366] shadow-sm ml-1.5"
                                title={`Clic en WhatsApp: ${formatDate(item.whatsapp_clicked_at)}`}
                              >
                                <MessageCircle className="w-2.5 h-2.5 text-[#25D366]" />
                                WhatsApp
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-center">
                            {item.status === 'excluded' ? (
                              <button
                                onClick={() => handleUpdateQueueItem(item.id, undefined, 'pending')}
                                disabled={queueStatus.isProcessing}
                                className="text-xs text-brand-gold hover:text-brand-gold-light font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Incluir de nuevo
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateQueueItem(item.id, undefined, 'excluded')}
                                disabled={queueStatus.isProcessing || item.status === 'sent'}
                                className="text-xs text-red-400 hover:text-red-300 font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Excluir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </div>
        )}

        {activeTab === 'agenda' && (
          <section className="bg-gradient-to-b from-[#0D1B2A] to-[#0A1420] border border-brand-gold/20 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden animate-fade-in">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="relative z-10 space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl font-semibold text-brand-gold">Configuración de Disponibilidad y Envíos</h2>
                <p className="text-sm text-slate-400">
                  Establece los bloques de horario hábil del asesor Ricardo, la duración de citas y el intervalo dinámico para envíos.
                </p>
              </div>

              <form onSubmit={handleSaveSettings} className="space-y-6 pt-2">
                
                {/* Fila 1: Duración de Slot */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-xs text-brand-gold font-medium uppercase tracking-wider block">Duración de la Cita</label>
                    <select
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-[#08101A] border border-brand-gold/20 hover:border-brand-gold/45 focus:border-brand-gold/90 rounded-xl text-slate-100 outline-none transition-all duration-200 text-sm font-sans"
                    >
                      <option value={30}>30 Minutos</option>
                      <option value={45}>45 Minutos</option>
                      <option value={60}>1 Hora</option>
                      <option value={90}>1.5 Horas</option>
                      <option value={120}>2 Horas</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <label className="text-xs text-brand-gold font-medium uppercase tracking-wider block">Intervalo entre Envíos de Correo</label>
                    <div className="flex gap-3">
                      <input
                        type="number"
                        min="1"
                        required
                        value={sendInterval}
                        onChange={(e) => setSendInterval(Number(e.target.value))}
                        className="w-1/2 px-4 py-3 bg-[#08101A] border border-brand-gold/20 focus:border-brand-gold/90 rounded-xl text-slate-100 outline-none transition-all duration-200 text-sm font-mono"
                      />
                      <select
                        value={sendIntervalUnit}
                        onChange={(e) => setSendIntervalUnit(e.target.value)}
                        className="w-1/2 px-4 py-3 bg-[#08101A] border border-brand-gold/20 hover:border-brand-gold/45 focus:border-brand-gold/90 rounded-xl text-slate-100 outline-none transition-all duration-200 text-sm font-sans"
                      >
                        <option value="seconds">Segundos</option>
                        <option value="minutes">Minutos</option>
                        <option value="hours">Horas</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fila 2: Rangos Horarios */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  
                  {/* Bloque Mañana */}
                  <div className="bg-[#08101A]/60 border border-brand-gold/10 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-gold" />
                      Bloque Horario de Mañana
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-mono">Hora de Inicio</label>
                        <input
                          type="time"
                          required
                          value={morningStart}
                          onChange={(e) => setMorningStart(e.target.value)}
                          className="w-full px-3 py-2 bg-[#08101A] border border-brand-gold/20 focus:border-brand-gold/90 rounded-lg text-slate-100 outline-none transition-all duration-200 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-mono">Hora de Fin</label>
                        <input
                          type="time"
                          required
                          value={morningEnd}
                          onChange={(e) => setMorningEnd(e.target.value)}
                          className="w-full px-3 py-2 bg-[#08101A] border border-brand-gold/20 focus:border-brand-gold/90 rounded-lg text-slate-100 outline-none transition-all duration-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Bloque Tarde */}
                  <div className="bg-[#08101A]/60 border border-brand-gold/10 rounded-xl p-5 space-y-4">
                    <h3 className="text-xs font-semibold text-brand-gold uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-brand-gold" />
                      Bloque Horario de Tarde
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-mono">Hora de Inicio</label>
                        <input
                          type="time"
                          required
                          value={afternoonStart}
                          onChange={(e) => setAfternoonStart(e.target.value)}
                          className="w-full px-3 py-2 bg-[#08101A] border border-brand-gold/20 focus:border-brand-gold/90 rounded-lg text-slate-100 outline-none transition-all duration-200 text-xs font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] text-slate-400 uppercase font-mono">Hora de Fin</label>
                        <input
                          type="time"
                          required
                          value={afternoonEnd}
                          onChange={(e) => setAfternoonEnd(e.target.value)}
                          className="w-full px-3 py-2 bg-[#08101A] border border-brand-gold/20 focus:border-brand-gold/90 rounded-lg text-slate-100 outline-none transition-all duration-200 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>

                </div>

                {/* Botón de Guardado */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={settingsLoading}
                    className="px-8 py-3.5 bg-gradient-to-r from-brand-gold-dark to-brand-gold hover:from-brand-gold hover:to-brand-gold-light text-brand-navy font-bold rounded-xl shadow-lg shadow-brand-gold/10 hover:shadow-brand-gold/20 transition-all duration-200 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {settingsLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Guardando Configuraciones...</span>
                      </>
                    ) : (
                      <>
                        <Settings className="w-4 h-4" />
                        <span>Guardar Cambios de Disponibilidad y Envíos</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

      </main>

      {/* Pie de página */}
      <footer className="py-6 px-8 text-center text-xs text-slate-500 border-t border-slate-900 mt-auto bg-slate-950/20">
        <p className="flex items-center justify-center gap-1.5">
          <span>Afinitive Inc. — Monitoreo Omnicanal</span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span className="text-brand-gold font-semibold flex items-center gap-0.5">
            Operadora Irina <ArrowRight className="w-3 h-3 inline" /> Módulo de Correo Omnicanal
          </span>
        </p>
      </footer>
    </div>
  );
}
