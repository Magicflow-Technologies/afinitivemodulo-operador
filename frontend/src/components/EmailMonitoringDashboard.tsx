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
  Phone,
  LayoutTemplate,
  FolderOpen,
  Copy,
  Check,
  Tag,
  Building2,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Inbox
} from 'lucide-react';
import { LiveEmailPreview } from './LiveEmailPreview';
import { TemplateManagerModal } from './TemplateManagerModal';
import EventManagerTab from './EventManagerTab';
import type { EmailTemplateItem } from './TemplateManagerModal';
import { buildEventEmailTemplate } from '../utils/eventEmailTemplate';

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
  tag?: string | null;
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
  tag?: string | null;
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

const buildEmailTemplate = (name: string, dateStr: string) => {
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

  const nameInBody = 'Ricardo Bertalmio Ruibal';
  const roleInBody = 'Soy economista de la Universidad del Pacífico y dirijo Afinitive Wealth Management';

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

interface EmailMonitoringDashboardProps {
  onNavigateToBooking?: () => void;
}

export default function EmailMonitoringDashboard({ onNavigateToBooking }: EmailMonitoringDashboardProps) {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('Marielisa');
  const [proposedTime, setProposedTime] = useState('');
  const [showIndividualSlotPicker, setShowIndividualSlotPicker] = useState(false);
  const [selectedDayIndividual, setSelectedDayIndividual] = useState<string | null>(null);

  const [signatureId] = useState('ricardo');
  const [senderName, setSenderName] = useState('Ricardo Bertalmio');
  const [senderEmail, setSenderEmail] = useState('rbertalmio@afinitive.com.pe');

  useEffect(() => {
    document.title = 'Afinitive | Módulo Operador';
  }, []);

  const [copiedBookingUrl, setCopiedBookingUrl] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopyToClipboard = (text: string, key: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const [subject, setSubject] = useState('Invitación Exclusiva - Afinitive');
  const [emailBody, setEmailBody] = useState(buildEmailTemplate('Marielisa', ''));
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // --- Estados de Plantillas de Correo (Arquitectura Desacoplada) ---
  const [templates, setTemplates] = useState<EmailTemplateItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>('00000000-0000-0000-0000-000000000001');
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateItem | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // --- Estados de Campañas y Cola (Nuevos) ---
  const [activeTab, setActiveTab] = useState<'metricas' | 'individual' | 'campanas' | 'agenda' | 'eventos'>('metricas');
  const [campaignTag, setCampaignTag] = useState('');
  const [individualTag, setIndividualTag] = useState('');
  const [slotDuration, setSlotDuration] = useState(60);
  const [morningStart, setMorningStart] = useState('09:00');
  const [morningEnd, setMorningEnd] = useState('12:00');
  const [afternoonStart, setAfternoonStart] = useState('14:00');
  const [afternoonEnd, setAfternoonEnd] = useState('17:00');
  const [sendInterval, setSendInterval] = useState(5);
  const [sendIntervalUnit, setSendIntervalUnit] = useState('minutes');
  const [whatsappNumber, setWhatsappNumber] = useState('51982100208');
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
  const [filterTag, setFilterTag] = useState('Todas');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // --- Estados de Paginación para la Tabla de Prospectos ---
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Resetear a página 1 cuando los filtros cambien
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterTag, filterStartDate, filterEndDate, searchQuery]);

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
    // 2. Filtro por Etiqueta
    if (filterTag !== 'Todas') {
      if (filterTag === 'Sin Etiqueta') {
        if (email.tag && email.tag.trim() !== '') return false;
      } else if (!email.tag || email.tag.trim().toLowerCase() !== filterTag.trim().toLowerCase()) {
        return false;
      }
    }
    // 3. Filtro por Fechas
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
    // 4. Filtro por Búsqueda de Texto (Nombre, Correo, Asunto o Etiqueta)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchEmail = email.recipient_email?.toLowerCase().includes(q);
      const matchName = email.recipient_name?.toLowerCase().includes(q);
      const matchSubject = email.subject?.toLowerCase().includes(q);
      const matchPhone = email.recipient_phone?.toLowerCase().includes(q);
      const matchTag = email.tag?.toLowerCase().includes(q);
      if (!matchEmail && !matchName && !matchSubject && !matchPhone && !matchTag) return false;
    }
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedEmails = filteredEmails.slice(startIndex, startIndex + pageSize);

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

      // 1. Enriquecer con datos de email_queue
      const { data: queueData } = await supabase
        .from('email_queue')
        .select('recipient_email, recipient_name, recipient_phone, proposed_time, whatsapp_clicked_at, tag');

      const phoneMap = new Map<string, string>();
      const nameMap = new Map<string, string>();
      const proposedTimeMap = new Map<string, string>();
      const whatsappMap = new Map<string, string>();
      const tagMap = new Map<string, string>();

      if (queueData) {
        queueData.forEach((q: any) => {
          const key = q.recipient_email?.toLowerCase().trim();
          if (key) {
            if (q.recipient_phone) phoneMap.set(key, q.recipient_phone);
            if (q.recipient_name) nameMap.set(key, q.recipient_name);
            if (q.proposed_time) proposedTimeMap.set(key, q.proposed_time);
            if (q.whatsapp_clicked_at) whatsappMap.set(key, q.whatsapp_clicked_at);
            if (q.tag) tagMap.set(key, q.tag);
          }
        });
      }

      // 2. Enriquecer con datos de asistentes_evento si existen
      try {
        const { data: asistentesData } = await supabase
          .from('asistentes_evento')
          .select('correo, celular, nombre');
        if (asistentesData) {
          asistentesData.forEach((a: any) => {
            const key = a.correo?.toLowerCase().trim();
            if (key) {
              if (a.celular && !phoneMap.has(key)) phoneMap.set(key, a.celular);
              if (a.nombre && !nameMap.has(key)) nameMap.set(key, a.nombre);
            }
          });
        }
      } catch (e) {
        // Ignorar si la tabla no está accesible
      }

      // 3. Enriquecer con datos de public_appointments si existen
      try {
        const { data: appData } = await supabase
          .from('public_appointments')
          .select('recipient_email, recipient_phone, recipient_name');
        if (appData) {
          appData.forEach((ap: any) => {
            const key = ap.recipient_email?.toLowerCase().trim();
            if (key) {
              if (ap.recipient_phone && !phoneMap.has(key)) phoneMap.set(key, ap.recipient_phone);
              if (ap.recipient_name && !nameMap.has(key)) nameMap.set(key, ap.recipient_name);
            }
          });
        }
      } catch (e) {
        // Ignorar si la tabla no está accesible
      }

      const mergedEmails: EmailRecord[] = (trackingData || []).map((item: any) => {
        const key = item.recipient_email?.toLowerCase().trim();
        const phone = item.recipient_phone || item.phone || item.celular || phoneMap.get(key) || null;
        const name = item.recipient_name || nameMap.get(key) || null;
        const proposed = item.proposed_time || proposedTimeMap.get(key) || null;
        const waClick = item.whatsapp_clicked_at || whatsappMap.get(key) || null;
        const tagVal = item.tag || tagMap.get(key) || null;

        return {
          ...item,
          recipient_name: name || item.recipient_name || null,
          recipient_phone: phone,
          proposed_time: proposed || item.proposed_time || null,
          whatsapp_clicked_at: waClick || item.whatsapp_clicked_at || null,
          tag: tagVal || item.tag || null,
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

  // Cargar Plantillas desde el Backend
  const fetchTemplates = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/templates`);
      if (response.ok) {
        const data: EmailTemplateItem[] = await response.json();
        setTemplates(data || []);
        if (data && data.length > 0) {
          const current = data.find((t) => t.id === selectedTemplateId) || data[0];
          setSelectedTemplate(current);
          setSelectedTemplateId(current.id);
        }
      }
    } catch (err) {
      console.error('Error al cargar plantillas:', err);
    }
  }, [BACKEND_URL, selectedTemplateId]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelectTemplate = (tpl: EmailTemplateItem) => {
    setSelectedTemplateId(tpl.id);
    setSelectedTemplate(tpl);
    setSubject(tpl.subject);
    const content = tpl.html_content || tpl.htmlContent || '';
    setEmailBody(content);
  };

  // Cargar un evento como plantilla de correo masivo
  const handleUseEventAsCampaign = (ev: any) => {
    const tpl = buildEventEmailTemplate(ev);
    setSelectedTemplateId(tpl.id);
    setSelectedTemplate({
      id: tpl.id,
      name: tpl.name,
      subject: tpl.subject,
      type: 'standard_wrapper',
      htmlContent: tpl.htmlContent,
      category: tpl.category,
      isActive: true,
    });
    setSubject(tpl.subject);
    setEmailBody(tpl.htmlContent);
    const evTag = `EVENTO-${ev.id}`.toUpperCase().substring(0, 30);
    setIndividualTag(evTag);
    setCampaignTag(evTag);
    setActiveTab('campanas');
    setSuccessMsg(`¡Plantilla del evento "${ev.nombre}" cargada con éxito para tu campaña masiva!`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUploadHtml = async (file: File, name: string, subj: string, category: string, actionType?: string) => {
    const text = await file.text();
    const response = await fetch(`${BACKEND_URL}/api/templates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        subject: subj,
        htmlContent: text,
        type: 'full_html',
        actionType: actionType || 'whatsapp_lead',
        category,
        createdBy: 'manual',
      }),
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.message || 'Error al guardar plantilla');
    }
    const newTpl = await response.json();
    await fetchTemplates();
    handleSelectTemplate(newTpl);
    setSuccessMsg(`¡Plantilla "${name}" guardada y lista para usar!`);
  };

  const handleDeleteTemplate = async (id: string) => {
    const response = await fetch(`${BACKEND_URL}/api/templates/${id}`, {
      method: 'DELETE',
    });
    if (response.ok) {
      await fetchTemplates();
      setSuccessMsg('Plantilla eliminada correctamente.');
    }
  };

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
        if (data.whatsapp_number) {
          setWhatsappNumber(data.whatsapp_number);
        }
      }
    } catch (err) {
      console.error('Error al cargar configuración:', err);
    }
  }, [BACKEND_URL]);

  // Guardar Configuraciones de Agenda, Envíos y WhatsApp
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
          whatsapp_number: whatsappNumber.trim(),
        }),
      });
      if (response.ok) {
        const unitLabel = sendIntervalUnit === 'minutes' ? 'minuto(s)' : sendIntervalUnit === 'seconds' ? 'segundo(s)' : 'hora(s)';
        setSuccessMsg(`¡Configuraciones guardadas con éxito! Intervalo: ${sendInterval} ${unitLabel}, WhatsApp: +${whatsappNumber.replace(/\D/g, '') || '51982100208'}.`);
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

        const isLeadGen = selectedTemplate?.actionType === 'whatsapp_lead' || 
                          selectedTemplate?.action_type === 'whatsapp_lead' ||
                          selectedTemplate?.name?.toLowerCase().includes('whatsapp');
        const uploadMode = isLeadGen ? 'lead_generation' : 'calendar_booking';

        const response = await fetch(`${BACKEND_URL}/api/test-email/queue/load`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contacts, 
            tag: campaignTag.trim() || undefined,
            mode: uploadMode
          }),
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
          const modeDetail = isLeadGen 
            ? 'listos para envío directo por WhatsApp' 
            : 'agendados en Google Calendar';
          setSuccessMsg(`¡Campaña procesada! ${result.validCount} contactos válidos ${modeDetail}. Se omitieron ${result.skippedCount} contactos duplicados o enviados en los últimos 60 días.`);
        } else {
          setUploadSummary(null);
          const modeDetail = isLeadGen 
            ? 'listos para envío directo con enlace a WhatsApp (sin ocupar agenda).' 
            : 'y se asignaron horarios de Google Calendar.';
          setSuccessMsg(`¡CSV cargado con éxito! Se procesaron ${result.validCount || contacts.length} contactos ${modeDetail}`);
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
  const handleUpdateQueueItem = async (id: string, proposedTime?: string, status?: string, tag?: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/test-email/queue/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposedTime, status, tag }),
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
          sendIntervalUnit: sendIntervalUnit,
          templateId: selectedTemplateId || undefined,
          customSubject: subject,
          customBody: emailBody,
          customTemplateType: selectedTemplate?.type || undefined,
          tag: campaignTag.trim() || undefined,
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
          attachment: attachmentData,
          templateId: selectedTemplateId || undefined,
          templateType: selectedTemplate?.type || undefined,
          tag: individualTag.trim() || undefined,
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
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased selection:bg-amber-100 selection:text-amber-900 font-sans">
      
      {/* Cabecera Profesional Estilo Google / Apple Minimalism */}
      <header className="border-b border-slate-200/80 bg-white/95 backdrop-blur-md py-3.5 px-4 sm:px-8 shadow-xs sticky top-0 z-50">
        <div className="max-w-[1780px] w-full mx-auto flex flex-col md:flex-row justify-between items-center gap-3">
          
          {/* Logo y Branding Afinitive */}
          <div className="flex items-center gap-3.5">
            <div className="p-2 bg-slate-50 border border-slate-200 rounded-xl shadow-xs shrink-0 flex items-center justify-center">
              <img 
                src="https://links.afinitive.com.pe/img/afinitive_logo.png" 
                alt="Afinitive Wealth Management" 
                className="w-7 h-7 object-contain"
              />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-slate-900 font-sans">
                  AFINITIVE
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-semibold tracking-wide">
                  Suite Operador
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
                  En Vivo
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Monitoreo Omnicanal y Conversión de Prospectos — Ricardo Bertalmio
              </p>
            </div>
          </div>
          
          {/* Accesos Rápidos y Estado */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center md:justify-end">
            <button
              onClick={() => {
                if (onNavigateToBooking) {
                  onNavigateToBooking();
                } else {
                  window.open('/agendar', '_blank');
                }
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 text-xs font-semibold text-slate-700 rounded-xl transition-all shadow-xs cursor-pointer"
              title="Abrir página pública de calendario"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-600" />
              <span>Calendario Público</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </button>

            <a
              href="https://operador.afinitive.com.pe/formEvento/index2.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open("https://operador.afinitive.com.pe/formEvento/index2.html", "_blank");
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 rounded-xl transition-all shadow-xs"
            >
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Formulario Eventos</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>

            <button
              onClick={() => fetchEmails()}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white border border-slate-900 text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
              title="Sincronizar datos con la base de datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Contenido Principal Full-Width */}
      <main className="flex-1 max-w-[1780px] w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Banner Informativo / Acceso Rápido al Link de Agendamiento */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-amber-700 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Enlace Permanente de Agendamiento Online
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-bold">
                  Sincronizado con Google Calendar
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                Enlace universal para colocar en firmas de correo o enviar por WhatsApp. Muestra los horarios disponibles de Ricardo y confirma reuniones automáticamente.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 select-all max-w-full overflow-x-auto">
              <span>{typeof window !== 'undefined' ? `${window.location.origin}/agendar` : 'https://operador.afinitive.com.pe/agendar'}</span>
            </div>

            <button
              onClick={() => {
                const url = `${window.location.origin}/agendar`;
                navigator.clipboard.writeText(url);
                setCopiedBookingUrl(true);
                setTimeout(() => setCopiedBookingUrl(false), 2500);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              {copiedBookingUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedBookingUrl ? '¡Copiado!' : 'Copiar'}</span>
            </button>

            <button
              onClick={() => {
                if (onNavigateToBooking) {
                  onNavigateToBooking();
                } else {
                  window.open('/agendar', '_blank');
                }
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
            >
              <span>Abrir Agenda</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <a
              href={`https://wa.me/${whatsappNumber.replace(/\D/g, '') || '51982100208'}?text=${encodeURIComponent(`Hola, puedes agendar una reunión directamente en mi calendario en el siguiente enlace: ${typeof window !== 'undefined' ? window.location.origin : ''}/agendar`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#25D366] hover:bg-[#20BA56] text-white font-bold rounded-xl text-xs shadow-xs transition-all cursor-pointer"
              title="Compartir por WhatsApp"
            >
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Pestañas de Navegación Estilo Google Workspace (Limpias y Jerárquicas) */}
        <div className="flex border-b border-slate-200 gap-2 overflow-x-auto bg-white px-2 py-1 rounded-2xl shadow-xs">
          
          <button
            onClick={() => setActiveTab('metricas')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'metricas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>📊 Analítica & Prospectos</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-bold ${
              activeTab === 'metricas' ? 'bg-slate-800 text-amber-300' : 'bg-slate-100 text-slate-600'
            }`}>
              {emails.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('individual')}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'individual'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>✉️ Envío Individual</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab('campanas');
              fetchSettings();
            }}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'campanas'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 Campañas Masivas</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('eventos');
            }}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'eventos'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-500" />
            <span className="font-semibold">📅 Eventos & Landings</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('agenda');
              fetchSettings();
            }}
            className={`flex items-center gap-2 px-5 py-3 font-semibold text-sm rounded-xl transition-all duration-150 cursor-pointer whitespace-nowrap ${
              activeTab === 'agenda'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>⚙️ Configuración y Agenda</span>
          </button>
        </div>

        {/* Banner de Notificaciones de Error / Éxito */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-5 py-3.5 rounded-2xl flex items-start gap-3 shadow-xs animate-fade-in">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Aviso de Operación</p>
              <p className="text-xs text-red-700 mt-0.5">{errorMsg}</p>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-5 py-3.5 rounded-2xl flex items-start gap-3 shadow-xs animate-fade-in">
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Operación Exitosa</p>
              <p className="text-xs text-emerald-700 mt-0.5">{successMsg}</p>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 1: 📊 ANALÍTICA & PROSPECTOS (Estadísticas y Tabla Paginada)      */}
        {/* ========================================================================= */}
        {activeTab === 'metricas' && (
          <div className="space-y-6 animate-fade-in">
            
            {/* Tarjetas de Métricas Interactivas (Funnel en 1 Clic) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Enviados */}
              <button
                type="button"
                onClick={() => setFilterStatus('Todos')}
                className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between group shadow-xs ${
                  filterStatus === 'Todos'
                    ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-400/30'
                    : 'bg-white border-slate-200/90 hover:border-blue-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">Total Enviados</p>
                    {filterStatus === 'Todos' && <span className="w-2 h-2 rounded-full bg-blue-600"></span>}
                  </div>
                  <p className="text-3xl font-extrabold text-slate-900 font-mono mt-1">{emails.length}</p>
                  <p className="text-xs text-slate-500 mt-1 group-hover:text-blue-600 font-medium transition-colors">
                    {filterStatus === 'Todos' ? '✓ Viendo todo el historial' : '⚡ Clic para ver todos'}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border transition-colors ${
                  filterStatus === 'Todos' ? 'bg-blue-600 text-white border-blue-600' : 'bg-blue-50 border-blue-100 text-blue-600'
                }`}>
                  <Mail className="w-6 h-6" />
                </div>
              </button>

              {/* Card 2: Correos Leídos */}
              <button
                type="button"
                onClick={() => setFilterStatus('Leído')}
                className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between group shadow-xs ${
                  filterStatus === 'Leído'
                    ? 'bg-emerald-50/70 border-emerald-400 ring-2 ring-emerald-400/30'
                    : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider">Correos Leídos</p>
                    {filterStatus === 'Leído' && <span className="w-2 h-2 rounded-full bg-emerald-600"></span>}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-extrabold text-emerald-700 font-mono">
                      {emails.filter(e => e.status === 'Leído' || e.status === 'Agendado' || e.whatsapp_clicked_at).length}
                    </p>
                    <span className="text-xs font-bold text-emerald-700/80 font-mono">
                      ({emails.length > 0 ? Math.round((emails.filter(e => e.status === 'Leído' || e.status === 'Agendado' || e.whatsapp_clicked_at).length / emails.length) * 100) : 0}%)
                    </span>
                  </div>
                  <p className="text-xs text-emerald-600 mt-1 font-medium group-hover:underline">
                    {filterStatus === 'Leído' ? '✓ Viendo correos abiertos' : '⚡ Clic para ver leídos'}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border transition-colors ${
                  filterStatus === 'Leído' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                }`}>
                  <Eye className="w-6 h-6" />
                </div>
              </button>

              {/* Card 3: Clicks WhatsApp */}
              <button
                type="button"
                onClick={() => setFilterStatus('WhatsApp')}
                className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between group shadow-xs ${
                  filterStatus === 'WhatsApp'
                    ? 'bg-emerald-50/80 border-[#25D366] ring-2 ring-[#25D366]/30'
                    : 'bg-white border-slate-200/90 hover:border-emerald-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-[#128C7E] font-bold uppercase tracking-wider flex items-center gap-1.5">
                      Clicks WhatsApp
                    </p>
                    {filterStatus === 'WhatsApp' && <span className="w-2 h-2 rounded-full bg-[#25D366] animate-ping"></span>}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-extrabold text-[#128C7E] font-mono">
                      {emails.filter(e => e.whatsapp_clicked_at).length}
                    </p>
                    <span className="text-xs font-bold text-[#128C7E]/80 font-mono">
                      ({emails.length > 0 ? Math.round((emails.filter(e => e.whatsapp_clicked_at).length / emails.length) * 100) : 0}%)
                    </span>
                  </div>
                  <p className="text-xs text-emerald-700 mt-1 font-semibold group-hover:underline">
                    {filterStatus === 'WhatsApp' ? '✓ Viendo quiénes clickearon' : '👉 Clic para filtrar leads WhatsApp'}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border transition-colors ${
                  filterStatus === 'WhatsApp' ? 'bg-[#25D366] text-white border-[#25D366]' : 'bg-emerald-50 border-emerald-100 text-[#128C7E]'
                }`}>
                  <MessageCircle className="w-6 h-6" />
                </div>
              </button>

              {/* Card 4: Citas Agendadas */}
              <button
                type="button"
                onClick={() => setFilterStatus('Agendado')}
                className={`p-5 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center justify-between group shadow-xs ${
                  filterStatus === 'Agendado'
                    ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/30'
                    : 'bg-white border-slate-200/90 hover:border-purple-300 hover:bg-slate-50/50'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-purple-700 font-bold uppercase tracking-wider">Citas Agendadas</p>
                    {filterStatus === 'Agendado' && <span className="w-2 h-2 rounded-full bg-purple-600"></span>}
                  </div>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-3xl font-extrabold text-purple-800 font-mono">
                      {emails.filter(e => e.status === 'Agendado').length}
                    </p>
                    <span className="text-xs font-bold text-purple-700/80 font-mono">
                      ({emails.length > 0 ? Math.round((emails.filter(e => e.status === 'Agendado').length / emails.length) * 100) : 0}% conv.)
                    </span>
                  </div>
                  <p className="text-xs text-purple-700 mt-1 font-semibold group-hover:underline">
                    {filterStatus === 'Agendado' ? '✓ Viendo citas confirmadas' : '👉 Clic para filtrar citas'}
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border transition-colors ${
                  filterStatus === 'Agendado' ? 'bg-purple-700 text-white border-purple-700' : 'bg-purple-50 border-purple-100 text-purple-700'
                }`}>
                  <CheckCircle className="w-6 h-6" />
                </div>
              </button>
            </div>

            {/* Panel Principal de Prospectos: Filtros y Tabla Paginada */}
            <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
              
              {/* Barra de Filtros y Búsqueda */}
              <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col lg:flex-row gap-4 items-stretch lg:items-end justify-between">
                
                {/* Búsqueda inteligente por nombre, correo, teléfono o etiqueta */}
                <div className="w-full lg:w-96 space-y-1.5">
                  <label className="text-xs text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-slate-500" />
                    Buscar Prospecto
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Nombre, correo, teléfono o asunto..."
                      className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 focus:ring-1 focus:ring-slate-800 rounded-xl text-slate-800 placeholder-slate-400 outline-none transition-all text-sm font-sans"
                    />
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Filtros de Estado, Etiqueta, Fechas y Limpiar */}
                <div className="flex flex-wrap sm:flex-nowrap gap-3 items-end w-full lg:w-auto">
                  <div className="w-full sm:w-44 space-y-1.5">
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider">Estado</label>
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 text-sm font-sans outline-none"
                    >
                      <option value="Todos">Todos ({emails.length})</option>
                      <option value="WhatsApp">💬 Clicks WhatsApp ({emails.filter(e => e.whatsapp_clicked_at).length})</option>
                      <option value="Agendado">📅 Cita Agendada ({emails.filter(e => e.status === 'Agendado').length})</option>
                      <option value="Leído">👁️ Leído ({emails.filter(e => e.status === 'Leído' || e.status === 'Agendado').length})</option>
                      <option value="Enviado">✉️ Solo Enviado ({emails.filter(e => e.status === 'Enviado').length})</option>
                    </select>
                  </div>

                  <div className="w-full sm:w-48 space-y-1.5">
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-slate-500" />
                      Etiqueta
                    </label>
                    <select
                      value={filterTag}
                      onChange={(e) => setFilterTag(e.target.value)}
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 text-sm font-sans outline-none"
                    >
                      <option value="Todas">Todas ({emails.length})</option>
                      {Array.from(new Set(emails.map(e => e.tag?.trim()).filter(Boolean) as string[])).sort().map((t) => (
                        <option key={t} value={t}>
                          🏷️ {t} ({emails.filter(e => e.tag?.trim().toLowerCase() === t.toLowerCase()).length})
                        </option>
                      ))}
                      {emails.some(e => !e.tag || e.tag.trim() === '') && (
                        <option value="Sin Etiqueta">
                          Sin Etiqueta ({emails.filter(e => !e.tag || e.tag.trim() === '').length})
                        </option>
                      )}
                    </select>
                  </div>

                  <div className="w-full sm:w-32 space-y-1.5">
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider">Desde</label>
                    <input
                      type="date"
                      value={filterStartDate}
                      onChange={(e) => setFilterStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 text-sm font-sans"
                    />
                  </div>

                  <div className="w-full sm:w-32 space-y-1.5">
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider">Hasta</label>
                    <input
                      type="date"
                      value={filterEndDate}
                      onChange={(e) => setFilterEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 text-sm font-sans"
                    />
                  </div>

                  {(filterStatus !== 'Todos' || filterTag !== 'Todas' || filterStartDate || filterEndDate || searchQuery) && (
                    <button
                      onClick={() => {
                        setFilterStatus('Todos');
                        setFilterTag('Todas');
                        setFilterStartDate('');
                        setFilterEndDate('');
                        setSearchQuery('');
                      }}
                      className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 text-sm font-semibold rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap h-[42px] cursor-pointer"
                      title="Restablecer todos los filtros"
                    >
                      <X className="w-4 h-4" />
                      <span>Limpiar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Banner visual de Filtro Activo */}
              {(filterStatus !== 'Todos' || filterTag !== 'Todas' || searchQuery) && (
                <div className="px-5 py-2.5 bg-amber-50/70 border-b border-amber-200/60 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-600 font-medium">Filtrando por:</span>
                    {filterStatus !== 'Todos' && (
                      <span className="font-bold text-slate-800 px-2.5 py-1 rounded-lg bg-white border border-amber-200 shadow-xs flex items-center gap-1.5">
                        Estado: {filterStatus}
                      </span>
                    )}
                    {filterTag !== 'Todas' && (
                      <span className="font-bold text-slate-800 px-2.5 py-1 rounded-lg bg-white border border-amber-200 shadow-xs flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-600" />
                        Etiqueta: {filterTag}
                      </span>
                    )}
                    {searchQuery && (
                      <span className="font-bold text-slate-800 px-2.5 py-1 rounded-lg bg-white border border-amber-200 shadow-xs">
                        Búsqueda: "{searchQuery}"
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-mono font-bold">
                      {filteredEmails.length} {filteredEmails.length === 1 ? 'prospecto encontrado' : 'prospectos encontrados'}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setFilterStatus('Todos');
                      setFilterTag('Todas');
                      setSearchQuery('');
                    }}
                    className="text-amber-800 hover:text-amber-950 font-semibold underline cursor-pointer text-xs"
                  >
                    Mostrar todos los registros
                  </button>
                </div>
              )}

              {/* Controles de Paginación Superior (Selector de Tamaño de Página) */}
              <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-white">
                <div className="flex items-center gap-2">
                  <span>Mostrando {filteredEmails.length > 0 ? startIndex + 1 : 0}–{Math.min(startIndex + pageSize, filteredEmails.length)} de <strong className="text-slate-800 font-mono">{filteredEmails.length}</strong> prospectos</span>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-slate-500 font-medium">Filas por página:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              {/* Tabla de Rastreos Full-Width */}
              <div className="overflow-x-auto w-full">
                {emails.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400 shadow-xs">
                      <Inbox className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-base text-slate-700 font-bold">No hay registros de envío en este entorno</p>
                      <p className="text-xs text-slate-500">Usa la pestaña "Envío Individual" o "Campañas Masivas" para comenzar.</p>
                    </div>
                  </div>
                ) : filteredEmails.length === 0 ? (
                  <div className="py-20 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 border border-slate-200 rounded-2xl flex items-center justify-center mx-auto text-slate-400 shadow-xs">
                      <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-base text-slate-700 font-bold">Ningún prospecto coincide con los filtros</p>
                      <p className="text-xs text-slate-500">
                        Prueba ajustando la búsqueda o restableciendo los filtros seleccionados.
                      </p>
                      <button
                        onClick={() => {
                          setFilterStatus('Todos');
                          setSearchQuery('');
                          setFilterStartDate('');
                          setFilterEndDate('');
                        }}
                        className="mt-3 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                      >
                        Restablecer Filtros
                      </button>
                    </div>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs font-bold tracking-wider uppercase border-b border-slate-200">
                        <th className="py-3.5 px-6">Prospecto / Lead</th>
                        <th className="py-3.5 px-5">Etiqueta</th>
                        <th className="py-3.5 px-5">Interacción y Estado</th>
                        <th className="py-3.5 px-5">Agenda Propuesta</th>
                        <th className="py-3.5 px-5">Fecha Envío</th>
                        <th className="py-3.5 px-5">Asunto</th>
                        <th className="py-3.5 px-6 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {paginatedEmails.map((email) => (
                        <tr 
                          key={email.id} 
                          className={`transition-colors duration-150 group ${
                            email.whatsapp_clicked_at 
                              ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border-l-4 border-l-[#25D366]' 
                              : email.status === 'Agendado'
                              ? 'bg-purple-50/40 hover:bg-purple-50/70 border-l-4 border-l-purple-600'
                              : 'hover:bg-slate-50/80 border-l-4 border-l-transparent'
                          }`}
                        >
                          {/* Columna 1: Prospecto / Destinatario */}
                          <td className="py-4 px-6 font-medium">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm uppercase shrink-0 shadow-xs ${
                                email.whatsapp_clicked_at
                                  ? 'bg-[#25D366]/20 border border-[#25D366]/40 text-[#128C7E]'
                                  : email.status === 'Agendado'
                                  ? 'bg-purple-100 border border-purple-200 text-purple-700'
                                  : email.status === 'Leído'
                                  ? 'bg-emerald-100 border border-emerald-200 text-emerald-700'
                                  : 'bg-slate-100 border border-slate-200 text-slate-700'
                              }`}>
                                {(email.recipient_name || email.recipient_email).charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <div className="text-slate-900 font-bold text-sm flex items-center gap-2">
                                  <span className="truncate">{email.recipient_name || 'Prospecto sin nombre'}</span>
                                  {email.whatsapp_clicked_at && (
                                    <span 
                                      className="px-2 py-0.5 rounded-md bg-[#25D366]/15 border border-[#25D366]/30 text-[#128C7E] text-[10px] font-bold uppercase tracking-wider"
                                      title="Este prospecto hizo clic en el enlace de WhatsApp"
                                    >
                                      WhatsApp
                                    </span>
                                  )}
                                </div>
                                
                                {/* Correo con botón de copiado rápido */}
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-xs font-mono text-slate-500 truncate max-w-[190px]" title={email.recipient_email}>
                                    {email.recipient_email}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={(e) => handleCopyToClipboard(email.recipient_email, `email-${email.id}`, e)}
                                    className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                                    title="Copiar correo"
                                  >
                                    {copiedKey === `email-${email.id}` ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                </div>

                                {/* Celular con botón de copiado rápido y enlace WhatsApp */}
                                {email.recipient_phone ? (
                                  <div className="flex items-center gap-1.5 mt-1">
                                    <a
                                      href={`https://wa.me/${email.recipient_phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hola ${email.recipient_name || ''}, te contacto de Afinitive Wealth Management.`)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-mono text-xs font-bold transition-all shadow-xs w-fit"
                                      title="Abrir chat de WhatsApp directo con este cliente"
                                    >
                                      <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span>{email.recipient_phone}</span>
                                    </a>
                                    <button
                                      type="button"
                                      onClick={(e) => handleCopyToClipboard(email.recipient_phone || '', `phone-${email.id}`, e)}
                                      className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer shrink-0"
                                      title="Copiar número de celular"
                                    >
                                      {copiedKey === `phone-${email.id}` ? (
                                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                                      ) : (
                                        <Copy className="w-3.5 h-3.5" />
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="text-[11px] font-mono text-slate-400 italic mt-0.5 flex items-center gap-1">
                                    <Phone className="w-2.5 h-2.5 opacity-40" />
                                    <span>Sin teléfono</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Columna 2: Etiqueta */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {email.tag ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 border border-amber-200/80 text-amber-900 shadow-xs">
                                <Tag className="w-3 h-3 text-amber-700 shrink-0" />
                                <span className="truncate max-w-[140px]" title={email.tag}>{email.tag}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs italic">—</span>
                            )}
                          </td>

                          {/* Columna 3: Interacciones y Estado */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            <div className="flex flex-col gap-1.5 items-start">
                              {/* Badge WhatsApp si hizo clic */}
                              {email.whatsapp_clicked_at && (
                                <span 
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#25D366]/15 border border-[#25D366]/40 text-[#128C7E] shadow-xs"
                                  title={`Clic registrado: ${formatDate(email.whatsapp_clicked_at)}`}
                                >
                                  <MessageCircle className="w-3.5 h-3.5 text-[#25D366] shrink-0" />
                                  <span>Clic en WhatsApp</span>
                                </span>
                              )}

                              {/* Badge de Estado Cita o Leído */}
                              {email.status === 'Agendado' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 border border-purple-300 text-purple-800 shadow-xs">
                                  <CheckCircle className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                  <span>Cita Agendada</span>
                                </span>
                              ) : email.status === 'Leído' ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 border border-emerald-200 text-emerald-700 shadow-xs">
                                  <Eye className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                  <span>Leído</span>
                                  {email.opened_at && (
                                    <span className="text-[10px] font-mono text-emerald-700/80">({formatDate(email.opened_at)})</span>
                                  )}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 border border-slate-200 text-slate-600">
                                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                  <span>Enviado</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Columna 4: Agenda Propuesta */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {email.proposed_time ? (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium">
                                <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{formatProposedDate(email.proposed_time)}</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs">—</span>
                            )}
                          </td>

                          {/* Columna 5: Fecha de Envío */}
                          <td className="py-4 px-5 text-slate-600 text-xs whitespace-nowrap font-mono">
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>{formatDate(email.sent_at)}</span>
                            </div>
                          </td>

                          {/* Columna 6: Asunto del Correo */}
                          <td className="py-4 px-5 text-slate-700 text-xs max-w-xs" title={email.subject}>
                            <div className="truncate font-medium">{email.subject}</div>
                          </td>

                          {/* Columna 7: Acción Rápida Directa */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <a
                              href={`https://wa.me/${email.recipient_phone?.replace(/[^0-9]/g, '') || '51982100208'}?text=${encodeURIComponent(`Hola ${email.recipient_name || ''}, te contacto de Afinitive Wealth Management sobre la reunión coordinada.`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 active:bg-[#25D366]/30 border border-[#25D366]/30 hover:border-[#25D366]/60 text-[#128C7E] text-xs font-bold transition-all shadow-xs"
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

              {/* Controles de Paginación Inferior Estilo Google */}
              {filteredEmails.length > 0 && (
                <div className="p-4 border-t border-slate-200/80 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-slate-600">
                    Página <strong className="font-mono font-bold text-slate-900">{currentPage}</strong> de <strong className="font-mono font-bold text-slate-900">{totalPages}</strong> ({filteredEmails.length} registros totales)
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Primera Página */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                      title="Primera página"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Página Anterior */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Anterior</span>
                    </button>

                    {/* Botones de Número de Página (Compacto) */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                        .map((pageNumber, idx, arr) => {
                          const prev = arr[idx - 1];
                          const showEllipsis = prev && pageNumber - prev > 1;
                          return (
                            <React.Fragment key={pageNumber}>
                              {showEllipsis && <span className="px-1 text-slate-400 text-xs font-mono">...</span>}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(pageNumber)}
                                className={`w-8 h-8 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                                  currentPage === pageNumber
                                    ? 'bg-slate-900 text-white shadow-xs'
                                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 shadow-xs'
                                }`}
                              >
                                {pageNumber}
                              </button>
                            </React.Fragment>
                          );
                        })}
                    </div>

                    {/* Página Siguiente */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                    >
                      <span className="hidden sm:inline">Siguiente</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Última Página */}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-xs"
                      title="Última página"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 2: ✉️ ENVÍO INDIVIDUAL (Split View: Formulario Izq + Preview Der)  */}
        {/* ========================================================================= */}
        {activeTab === 'individual' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start animate-fade-in">
            
            {/* Columna Izquierda (45%): Formulario Paso a Paso */}
            <section className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-slate-900">Enviar Invitación Directa</h2>
                <p className="text-xs text-slate-500">
                  Completa los datos del prospecto y ajusta la fecha sugerida. La previsualización de la derecha se actualiza al instante.
                </p>
              </div>

              {/* Selector de Plantillas & Biblioteca */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                    <LayoutTemplate className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Plantilla</label>
                    <select
                      value={selectedTemplateId || ''}
                      onChange={(e) => {
                        const found = templates.find((t) => t.id === e.target.value);
                        if (found) handleSelectTemplate(found);
                      }}
                      className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-slate-800 max-w-[200px] truncate"
                    >
                      {templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowTemplateModal(true)}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-amber-600" />
                  <span>Biblioteca</span>
                </button>
              </div>

              <form onSubmit={handleSendEmail} className="space-y-4">
                
                {/* Remitente Oficial */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider block">Firma Remitente Oficial</label>
                    <span className="text-[10px] text-slate-400 font-mono">rbertalmio@afinitive.com.pe</span>
                  </div>
                  <div className="flex items-center gap-3 p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                    <img src="https://dashbportal.com/afinitive/rbertalmio.png" className="w-7 h-7 rounded-full object-cover border border-slate-300" alt="Ricardo" />
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Nombre Remitente"
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-bold text-slate-800 outline-none focus:border-slate-800"
                        title="Nombre del Remitente"
                      />
                      <input
                        type="email"
                        value={senderEmail}
                        onChange={(e) => setSenderEmail(e.target.value)}
                        placeholder="Correo Remitente"
                        className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono text-slate-700 outline-none focus:border-slate-800"
                        title="Correo del Remitente"
                      />
                    </div>
                  </div>
                </div>

                {/* Datos del Prospecto (Nombre, Correo y Etiqueta) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider">Nombre del Contacto</label>
                    <input
                      type="text"
                      placeholder="Ej: Marielisa o Maycol"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 placeholder-slate-400 outline-none text-xs font-sans"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider">Correo Electrónico</label>
                    <input
                      type="email"
                      required
                      placeholder="cliente@dominio.com"
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 placeholder-slate-400 outline-none text-xs font-sans"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-bold uppercase tracking-wider flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    Etiqueta (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Inversión, VIP, LinkedIn..."
                    value={individualTag}
                    onChange={(e) => setIndividualTag(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 placeholder-slate-400 outline-none text-xs font-sans"
                  />
                </div>

                {/* Fecha y Hora Propuesta con Selector de Google Calendar */}
                <div className="space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider">Fecha / Hora Propuesta</label>
                    <button
                      type="button"
                      onClick={() => setShowIndividualSlotPicker(!showIndividualSlotPicker)}
                      className="text-[11px] text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Calendar className="w-3 h-3" />
                      {showIndividualSlotPicker ? 'Ocultar turnos' : 'Ver turnos libres Calendar'}
                    </button>
                  </div>
                  
                  <input
                    type="datetime-local"
                    value={proposedTime}
                    onChange={(e) => {
                      setProposedTime(e.target.value);
                      if (e.target.value) {
                        setEmailBody(buildEmailTemplate(recipientName, e.target.value));
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 text-xs font-sans"
                  />

                  {/* Popover de Slots Libres de Google Calendar */}
                  {showIndividualSlotPicker && (
                    <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl p-4 shadow-xl space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800">Seleccionar Turno Libre (Google Calendar)</span>
                        <button
                          type="button"
                          onClick={() => setShowIndividualSlotPicker(false)}
                          className="text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Días */}
                      <div className="grid grid-cols-5 gap-1">
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
                                  ? 'bg-slate-900 text-white shadow-xs'
                                  : hasSlots
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                    : 'bg-slate-50 text-slate-400 border border-slate-200'
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
                        <div className="space-y-1.5 border-t border-slate-100 pt-2">
                          <p className="text-[10px] text-slate-500 uppercase font-semibold">Horarios disponibles ({selectedDayIndividual}):</p>
                          <div className="grid grid-cols-3 gap-1.5 max-h-[120px] overflow-y-auto pr-1">
                            {freeSlots[selectedDayIndividual].map((time) => (
                              <button
                                key={time}
                                type="button"
                                onClick={() => {
                                  const formattedValue = `${selectedDayIndividual}T${time}:00-05:00`;
                                  setProposedTime(formattedValue);
                                  setEmailBody(buildEmailTemplate(recipientName, formattedValue));
                                  setShowIndividualSlotPicker(false);
                                }}
                                className="py-1 px-2 text-xs font-mono bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 rounded-lg text-slate-700 text-center transition-all cursor-pointer font-semibold"
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

                {/* Asunto */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-600 font-bold uppercase tracking-wider">Asunto</label>
                  <input
                    type="text"
                    required
                    placeholder="Asunto de la invitación"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 outline-none text-xs font-sans"
                  />
                </div>

                {/* Cuerpo del Mensaje */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-600 font-bold uppercase tracking-wider">Mensaje</label>
                    <button
                      type="button"
                      onClick={() => setEmailBody(buildEmailTemplate(recipientName, proposedTime))}
                      className="text-[11px] text-amber-700 hover:text-amber-900 font-semibold flex items-center gap-1 cursor-pointer"
                      title="Regenerar texto con variables"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Regenerar variables</span>
                    </button>
                  </div>
                  <textarea
                    required
                    rows={5}
                    placeholder="Escribe el mensaje..."
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 outline-none text-xs font-sans resize-none"
                  />
                </div>

                {/* Documento Adjunto */}
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-600 font-bold uppercase tracking-wider block">
                    Documento Adjunto (Opcional - Máx 10MB)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl text-slate-700 cursor-pointer transition-all text-xs select-none">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500" />
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
                      <div className="flex items-center gap-2 px-2.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 truncate">
                        <span className="truncate max-w-[150px]">{selectedFile.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedFile(null)}
                          className="text-amber-700 hover:text-amber-950 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Botón de Envío */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !recipientEmail || !subject || !emailBody}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer text-sm"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                        <span>Enviando Invitación...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 text-amber-400" />
                        <span>Enviar Invitación Directa</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </section>

            {/* Columna Derecha (55%): Previsualización en Vivo Sticky */}
            <section className="lg:col-span-7 sticky top-20">
              <LiveEmailPreview
                templateName={selectedTemplate?.name || 'Plantilla Personalizada'}
                templateType={selectedTemplate?.type || 'standard_wrapper'}
                rawHtmlOrBody={emailBody}
                subject={subject}
                signatureId={signatureId}
                senderName={senderName}
                testRecipientName={recipientName}
                testProposedDate={proposedTime}
                createdBy={selectedTemplate?.createdBy || selectedTemplate?.created_by || 'manual'}
                onRefresh={() => fetchTemplates()}
              />
            </section>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 3: 👥 CAMPAÑAS MASIVAS (Wizard Claro en 3 Pasos)                  */}
        {/* ========================================================================= */}
        {activeTab === 'campanas' && (
          <div className="space-y-6 animate-fade-in">
            <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Campañas Masivas de Captación</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sube una lista en formato CSV (Nombre, Correo, Celular). El sistema aplicará filtros de enfriamiento y despachará los correos respetando la cadencia programada.
                  </p>
                </div>
                
                <div className="flex items-center gap-2">
                  {queueStatus.isProcessing && (
                    <button
                      onClick={handleStopQueue}
                      disabled={queueLoading}
                      className="px-3.5 py-2 border border-red-300 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs animate-pulse disabled:opacity-50"
                    >
                      <PauseCircle className="w-4 h-4 text-red-600" />
                      <span>Detener Envíos</span>
                    </button>
                  )}
                  <button
                    onClick={handleClearQueue}
                    disabled={queueLoading}
                    className="px-3.5 py-2 border border-slate-200 hover:border-red-200 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Limpiar Cola</span>
                  </button>
                </div>
              </div>

              {/* Paso 1: Selección de Plantilla de la Campaña */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-amber-700 shadow-xs">
                    <LayoutTemplate className="w-5 h-5" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-700 font-bold uppercase tracking-wider block">
                      Paso 1: Seleccionar Plantilla de Campaña
                    </label>
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={selectedTemplateId || ''}
                        onChange={(e) => {
                          const found = templates.find((t) => t.id === e.target.value);
                          if (found) handleSelectTemplate(found);
                        }}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none focus:border-slate-800 max-w-xs sm:max-w-sm truncate"
                      >
                        {templates.map((tpl) => {
                          const isWhatsapp = tpl.actionType === 'whatsapp_lead' || tpl.action_type === 'whatsapp_lead' || tpl.name?.toLowerCase().includes('whatsapp');
                          const isEvent = tpl.actionType === 'event_invitation' || tpl.category === 'Eventos & Landings';
                          const badgeLabel = isWhatsapp ? '💬 WhatsApp' : isEvent ? '🎟️ Evento' : '📅 Agenda 1 a 1';
                          return (
                            <option key={tpl.id} value={tpl.id}>
                              {tpl.name} ({badgeLabel})
                            </option>
                          );
                        })}
                      </select>
                      {selectedTemplate && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium hidden md:inline">
                          {selectedTemplate.category || 'General'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <FolderOpen className="w-4 h-4 text-amber-600" />
                    <span>Biblioteca / Subir .HTML</span>
                  </button>
                </div>
              </div>

              {/* Banner Informativo del Modo de la Plantilla */}
              {selectedTemplate?.actionType === 'whatsapp_lead' || selectedTemplate?.action_type === 'whatsapp_lead' || selectedTemplate?.name?.toLowerCase().includes('whatsapp') ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
                  <div className="p-2 rounded-lg bg-emerald-100 text-emerald-800 shrink-0">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-emerald-900">Modo de Captación Directa por WhatsApp (Protección de Agenda)</h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-bold">
                        Recomendado para listas frías
                      </span>
                    </div>
                    <p className="text-xs text-emerald-800 leading-relaxed">
                      Esta plantilla <strong>no consume turnos de Google Calendar</strong>. Los prospectos reciben la invitación personalizada y un enlace directo a tu WhatsApp oficial (+{whatsappNumber.replace(/\D/g, '') || '51982100208'}) para coordinar antes de agendar.
                    </p>
                  </div>
                </div>
              ) : selectedTemplate?.actionType === 'event_invitation' || selectedTemplate?.category === 'Eventos & Landings' ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
                  <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-amber-900">Modo Invitación a Evento & Landing</h4>
                    <p className="text-xs text-amber-800 leading-relaxed">
                      El correo redirigirá a la Landing Page oficial del evento para registro de asistentes y reservas masivas.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-800 shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold text-blue-900">Modo Agendamiento Individual 1 a 1</h4>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      El sistema consultará Google Calendar para asignar automáticamente una fecha y hora libre a cada prospecto.
                    </p>
                  </div>
                </div>
              )}

              {/* Paso 2: Definir Etiqueta y Subir Archivo CSV */}
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Tag className="w-4 h-4 text-amber-600" />
                      Paso 2: Asignar Nombre de Etiqueta a esta Campaña
                    </label>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-semibold">
                      Recomendado
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ej: Inversores Marzo 2026, Leads LinkedIn, Conferencia Lima..."
                      value={campaignTag}
                      onChange={(e) => setCampaignTag(e.target.value)}
                      disabled={queueLoading || queueStatus.isProcessing}
                      className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 hover:border-slate-400 focus:border-slate-800 rounded-xl text-slate-800 placeholder-slate-400 outline-none text-sm font-sans"
                    />
                    <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
                  {/* Zona de Arrastrar CSV */}
                  <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 rounded-2xl p-8 text-center bg-slate-50/50 transition-all relative group flex flex-col items-center justify-center">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleCsvUpload}
                      disabled={queueLoading || queueStatus.isProcessing}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <Upload className="w-10 h-10 text-slate-400 group-hover:text-slate-700 mx-auto mb-3 transition-colors" />
                    <p className="text-sm font-bold text-slate-800">Arrastra tu archivo CSV o haz clic aquí</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Columnas requeridas: Nombre, Correo, Celular {campaignTag.trim() ? `• Etiqueta: "${campaignTag.trim()}"` : ''}
                    </p>
                  </div>

                  {/* Panel de Estado / Progreso de Envíos */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Estado de Cola de Envíos</h3>
                      
                      {queueStatus.isProcessing ? (
                        <div className="space-y-3 mt-3">
                          <div className="flex justify-between text-xs text-slate-600 font-semibold">
                            <span className="flex items-center gap-1.5 text-emerald-700">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                              Enviando correos...
                            </span>
                            <span>{queueStatus.sent + queueStatus.failed} / {queueStatus.total} completados</span>
                          </div>
                          
                          <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                            <div 
                              className="bg-slate-900 h-full transition-all duration-300"
                              style={{ width: `${((queueStatus.sent + queueStatus.failed) / queueStatus.total) * 100}%` }}
                            ></div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-center pt-2">
                            <div className="bg-white p-2 rounded-xl border border-slate-200">
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Enviados</p>
                              <p className="text-lg font-bold text-emerald-700">{queueStatus.sent}</p>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-slate-200">
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Fallidos</p>
                              <p className="text-lg font-bold text-red-600">{queueStatus.failed}</p>
                            </div>
                            <div className="bg-white p-2 rounded-xl border border-slate-200">
                              <p className="text-[10px] text-slate-500 uppercase font-bold">Pendientes</p>
                              <p className="text-lg font-bold text-slate-800">{queueStatus.total - (queueStatus.sent + queueStatus.failed)}</p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="py-2 space-y-3">
                          <p className="text-xs text-slate-600">
                            {queueItems.length > 0 
                              ? `Cola lista con ${queueItems.length} contactos cargados en memoria. Configura el intervalo e inicia el despacho.`
                              : "No hay ninguna campaña cargada actualmente. Sube un archivo CSV para comenzar."
                            }
                          </p>

                          {queueItems.length > 0 && (
                            <div className="space-y-3 pt-1">
                              {/* Control directo del Intervalo de Envío */}
                              <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
                                <div className="flex items-center justify-between">
                                  <label className="text-slate-800 font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-slate-600" />
                                    Intervalo entre Envíos:
                                  </label>
                                  <span className="text-[10px] text-slate-500 font-mono">Control de cadencia</span>
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    min="1"
                                    required
                                    value={sendInterval}
                                    onChange={(e) => setSendInterval(Number(e.target.value))}
                                    disabled={queueLoading || queueStatus.isProcessing}
                                    className="w-1/2 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-mono text-xs outline-none"
                                  />
                                  <select
                                    value={sendIntervalUnit}
                                    onChange={(e) => setSendIntervalUnit(e.target.value)}
                                    disabled={queueLoading || queueStatus.isProcessing}
                                    className="w-1/2 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 text-xs outline-none"
                                  >
                                    <option value="seconds">Segundos</option>
                                    <option value="minutes">Minutos</option>
                                    <option value="hours">Horas</option>
                                  </select>
                                </div>
                              </div>

                              <button
                                onClick={handleProcessQueue}
                                disabled={queueLoading}
                                className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
                              >
                                <Play className="w-4 h-4 fill-current text-amber-400" />
                                <span>Comenzar Envíos en Cola</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Banner de Resumen de Duplicados / Enfriamiento */}
            {uploadSummary && uploadSummary.skippedCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                  <div>
                    <p className="font-bold text-amber-950">
                      Control de Duplicados y Enfriamiento: {uploadSummary.skippedCount} contacto(s) omitido(s)
                    </p>
                    <p className="text-xs text-amber-800">
                      De los {uploadSummary.totalUploaded} contactos del CSV, se agregaron {uploadSummary.validCount} nuevos. Se omitieron {uploadSummary.skippedCount} por contacto reciente (&lt; 60 días) o duplicidad.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSkippedModal(true)}
                  className="px-3.5 py-1.5 bg-amber-100 hover:bg-amber-200 border border-amber-300 text-amber-900 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors"
                >
                  Ver {uploadSummary.skippedCount} Omitidos
                </button>
              </div>
            )}

            {/* Modal de Contactos Omitidos */}
            {showSkippedModal && uploadSummary && (
              <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl animate-fade-in max-h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">Contactos Omitidos por Enfriamiento</h3>
                      <p className="text-xs text-slate-500">Contactos protegidos para evitar saturación de correos.</p>
                    </div>
                    <button
                      onClick={() => setShowSkippedModal(false)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="overflow-y-auto flex-1 space-y-2 pr-1">
                    {uploadSummary.skippedContacts.map((c, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{c.name} <span className="font-normal text-slate-500">({c.email})</span></p>
                          <p className="text-amber-800 text-[11px] mt-0.5">{c.reason}</p>
                        </div>
                        {c.daysAgo !== undefined && (
                          <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[10px] whitespace-nowrap shrink-0">
                            {c.daysAgo === 0 ? 'Hoy' : `Hace ${c.daysAgo} días`}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-100">
                    <button
                      onClick={() => setShowSkippedModal(false)}
                      className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-slate-800 cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabla de Previsualización y Edición de Citas */}
            {queueItems.length > 0 && (
              <section className="bg-white border border-slate-200/90 rounded-2xl shadow-xs overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Previsualización de Envíos en Cola</h2>
                    <p className="text-xs text-slate-500">Verifica o ajusta los datos antes de iniciar los despachos.</p>
                  </div>
                  <span className="px-3 py-1 bg-slate-200/80 text-slate-800 text-xs font-mono font-bold rounded-full">
                    {queueItems.length} Contactos
                  </span>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 text-xs font-bold tracking-wider uppercase border-b border-slate-200">
                        <th className="py-3.5 px-6">Cliente</th>
                        <th className="py-3.5 px-5">Etiqueta</th>
                        <th className="py-3.5 px-5">Correo</th>
                        <th className="py-3.5 px-5">Teléfono</th>
                        <th className="py-3.5 px-5">Cita Sugerida</th>
                        <th className="py-3.5 px-5">Estado</th>
                        <th className="py-3.5 px-6 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {queueItems.map((item) => (
                        <tr 
                          key={item.id} 
                          className={`hover:bg-slate-50/80 transition-colors duration-150 group ${item.status === 'excluded' ? 'opacity-40' : ''}`}
                        >
                          <td className="py-3.5 px-6 font-bold text-slate-800">
                            {item.recipient_name}
                          </td>
                          <td className="py-3.5 px-5 whitespace-nowrap">
                            {item.tag ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-amber-50 border border-amber-200 text-amber-900">
                                <Tag className="w-3 h-3 text-amber-700 shrink-0" />
                                <span className="truncate max-w-[130px]" title={item.tag}>{item.tag}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs italic">—</span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono text-xs">{item.recipient_email}</span>
                              <button
                                type="button"
                                onClick={(e) => handleCopyToClipboard(item.recipient_email, `queue-email-${item.id}`, e)}
                                className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer shrink-0"
                                title="Copiar correo"
                              >
                                {copiedKey === `queue-email-${item.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="py-3.5 px-5 text-slate-600">
                            {item.recipient_phone ? (
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs text-emerald-700 font-bold">{item.recipient_phone}</span>
                                <button
                                  type="button"
                                  onClick={(e) => handleCopyToClipboard(item.recipient_phone || '', `queue-phone-${item.id}`, e)}
                                  className="p-1 rounded-md hover:bg-slate-100 text-slate-400 hover:text-emerald-700 transition-colors cursor-pointer shrink-0"
                                  title="Copiar número"
                                >
                                  {copiedKey === `queue-phone-${item.id}` ? (
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-xs">Sin teléfono</span>
                            )}
                          </td>
                          <td className="py-3.5 px-5 relative">
                            {activePickerId === item.id ? (
                              <div className="absolute z-50 top-full mt-1 left-0 w-[285px] bg-white border border-slate-200 rounded-xl p-4 shadow-xl space-y-3 text-slate-800">
                                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                  <span className="text-xs font-bold text-slate-900">Seleccionar Fecha Libre</span>
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setActivePickerId(null);
                                      setSelectedDayForPicker(null);
                                    }}
                                    className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer"
                                  >
                                    Cerrar
                                  </button>
                                </div>

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
                                        className={`flex flex-col items-center justify-center p-1 rounded-lg text-[10px] font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                                          isSelected 
                                            ? 'bg-slate-900 text-white shadow-xs'
                                            : hasSlots
                                              ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                                              : 'bg-slate-50 text-slate-400 border border-slate-200'
                                        }`}
                                      >
                                        <span className="uppercase text-[8px] opacity-75">{dayName}</span>
                                        <span className="text-xs font-bold mt-0.5">{dayNum}</span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {selectedDayForPicker && freeSlots[selectedDayForPicker] && (
                                  <div className="space-y-1.5 border-t border-slate-100 pt-2">
                                    <p className="text-[9px] text-slate-500 uppercase font-semibold">Horarios Libres ({selectedDayForPicker}):</p>
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
                                          className="py-1 px-1.5 text-[9px] font-mono bg-slate-50 hover:bg-slate-900 hover:text-white rounded text-slate-700 text-center transition-colors cursor-pointer"
                                        >
                                          {time}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
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
                              className="px-3 py-1.5 w-full bg-slate-50 border border-slate-200 focus:border-slate-800 rounded-lg text-slate-800 text-xs font-mono text-left disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between gap-1 cursor-pointer transition-colors"
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
                              <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            </button>
                          </td>
                          <td className="py-3.5 px-5">
                            {item.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 border border-amber-200 text-amber-800">
                                Pendiente
                              </span>
                            )}
                            {item.status === 'processing' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 border border-blue-200 text-blue-700 animate-pulse">
                                Enviando...
                              </span>
                            )}
                            {item.status === 'sent' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 border border-emerald-200 text-emerald-800">
                                Enviado
                              </span>
                            )}
                            {item.status === 'failed' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-50 border border-red-200 text-red-700" title={item.error_message || ''}>
                                Error
                              </span>
                            )}
                            {item.status === 'agendado' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 border border-purple-200 text-purple-800">
                                <CheckCircle className="w-3 h-3 text-purple-600" />
                                Cita Agendada
                              </span>
                            )}
                            {item.status === 'excluded' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 border border-slate-200 text-slate-500">
                                Excluido
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-6 text-center">
                            {item.status === 'excluded' ? (
                              <button
                                onClick={() => handleUpdateQueueItem(item.id, undefined, 'pending')}
                                disabled={queueStatus.isProcessing}
                                className="text-xs text-slate-700 hover:text-slate-900 font-semibold cursor-pointer disabled:opacity-40"
                              >
                                Incluir
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateQueueItem(item.id, undefined, 'excluded')}
                                disabled={queueStatus.isProcessing || item.status === 'sent'}
                                className="text-xs text-red-600 hover:text-red-800 font-semibold cursor-pointer disabled:opacity-40"
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

        {/* ========================================================================= */}
        {/* PESTAÑA 4: 📅 EVENTOS & LANDINGS (Integración de EventManagerTab)          */}
        {/* ========================================================================= */}
        {activeTab === 'eventos' && (
          <div className="animate-fade-in">
            <EventManagerTab onUseAsCampaign={handleUseEventAsCampaign} />
          </div>
        )}

        {/* ========================================================================= */}
        {/* PESTAÑA 5: ⚙️ CONFIGURACIÓN Y AGENDA                                      */}
        {/* ========================================================================= */}
        {activeTab === 'agenda' && (
          <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6 animate-fade-in max-w-4xl">
            <div className="space-y-1 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-bold text-slate-900">Configuración de Disponibilidad y Parámetros</h2>
              <p className="text-xs text-slate-500">
                Establece los bloques de horario hábil de Ricardo, la duración de citas y el número de atención de WhatsApp.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              
              {/* Fila 1: Duración de Slot e Intervalo de Envíos */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs text-slate-700 font-bold uppercase tracking-wider block">Duración de Cita</label>
                  <select
                    value={slotDuration}
                    onChange={(e) => setSlotDuration(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 outline-none text-xs font-sans"
                  >
                    <option value={30}>30 Minutos</option>
                    <option value={45}>45 Minutos</option>
                    <option value={60}>1 Hora</option>
                    <option value={90}>1.5 Horas</option>
                    <option value={120}>2 Horas</option>
                  </select>
                </div>

                <div className="space-y-1.5 col-span-2">
                  <label className="text-xs text-slate-700 font-bold uppercase tracking-wider block">Intervalo entre Envíos de Correo</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      required
                      value={sendInterval}
                      onChange={(e) => setSendInterval(Number(e.target.value))}
                      className="w-1/2 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 outline-none text-xs font-mono"
                    />
                    <select
                      value={sendIntervalUnit}
                      onChange={(e) => setSendIntervalUnit(e.target.value)}
                      className="w-1/2 px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 outline-none text-xs font-sans"
                    >
                      <option value="seconds">Segundos</option>
                      <option value="minutes">Minutos</option>
                      <option value="hours">Horas</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Fila 2: Rangos Horarios Mañana y Tarde */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Bloque Mañana */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Horario de Mañana
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Inicio</label>
                      <input
                        type="time"
                        required
                        value={morningStart}
                        onChange={(e) => setMorningStart(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Fin</label>
                      <input
                        type="time"
                        required
                        value={morningEnd}
                        onChange={(e) => setMorningEnd(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* Bloque Tarde */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Horario de Tarde
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Inicio</label>
                      <input
                        type="time"
                        required
                        value={afternoonStart}
                        onChange={(e) => setAfternoonStart(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 uppercase font-mono font-bold">Fin</label>
                      <input
                        type="time"
                        required
                        value={afternoonEnd}
                        onChange={(e) => setAfternoonEnd(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-800 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fila 3: Configuración de WhatsApp */}
              <div className="bg-emerald-50/50 border border-emerald-200 rounded-xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageCircle className="w-4 h-4 text-[#25D366]" />
                      Número de Atención WhatsApp (Chat Directo)
                    </h3>
                    <p className="text-xs text-emerald-800 mt-0.5">
                      Los prospectos que hagan clic en el botón de WhatsApp serán redirigidos a este chat.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-emerald-200 text-[#128C7E] font-mono text-xs font-bold rounded-lg shadow-xs">
                    +{whatsappNumber.replace(/\D/g, '') || '51982100208'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs text-slate-700 font-bold">Número de Celular con Código de País</label>
                    <input
                      type="text"
                      required
                      value={whatsappNumber}
                      onChange={(e) => setWhatsappNumber(e.target.value)}
                      placeholder="Ej: 51982100208"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 text-xs font-mono"
                    />
                  </div>

                  <a
                    href={`https://wa.me/${whatsappNumber.replace(/\D/g, '') || '51982100208'}?text=${encodeURIComponent('Hola Ricardo, prueba de enlace de WhatsApp desde Afinitive.')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-2.5 bg-white hover:bg-emerald-50 border border-emerald-300 text-[#128C7E] font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Probar Chat</span>
                  </a>
                </div>
              </div>

              {/* Botón de Guardado */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={settingsLoading}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 text-xs"
                >
                  {settingsLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Guardando Cambios...</span>
                    </>
                  ) : (
                    <>
                      <Settings className="w-4 h-4 text-amber-400" />
                      <span>Guardar Cambios de Disponibilidad</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Modal de Gestión y Carga de Plantillas */}
        <TemplateManagerModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          templates={templates}
          selectedTemplateId={selectedTemplateId}
          onSelectTemplate={handleSelectTemplate}
          onUploadHtml={handleUploadHtml}
          onDeleteTemplate={handleDeleteTemplate}
        />

      </main>

      {/* Pie de página Limpio */}
      <footer className="py-5 px-8 text-center text-xs text-slate-500 border-t border-slate-200 mt-auto bg-white">
        <p className="flex items-center justify-center gap-2">
          <span>Afinitive Inc.</span>
          <span>•</span>
          <span className="font-semibold text-slate-700">Ricardo Bertalmio Ruibal</span>
          <span>•</span>
          <span>Suite de Monitoreo y Conversión</span>
        </p>
      </footer>
    </div>
  );
}
