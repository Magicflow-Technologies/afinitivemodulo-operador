import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Calendar, 
  Users, 
  Video, 
  Share2, 
  Edit3, 
  Trash2, 
  Eye, 
  Download, 
  Search, 
  Check, 
  Building2, 
  MessageCircle,
  X,
  Upload,
  Loader2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Mail,
  FileText,
  Filter,
  Sparkles,
  Globe,
  Briefcase,
  RotateCcw,
  Save,
  ExternalLink,
  BarChart3,
  TrendingUp,
  Clock,
  Flame,
  Zap,
  PhoneOff,
  Activity,
  Smartphone,
  Timer,
  ChevronRight,
  Repeat,
  Target
} from 'lucide-react';
import type { BioButtonItem } from '../utils/bioLinkConfig';
import { 
  getStoredBioButtonsSync, 
  fetchBioButtons, 
  saveBioButtons, 
  DEFAULT_BIO_BUTTONS 
} from '../utils/bioLinkConfig';

export interface Evento {
  id: string;
  nombre: string;
  tipo?: 'webinar' | 'lead_form';
  fecha_inicio?: string;
  link_reunion?: string;
  generar_meet?: boolean;
  descripcion?: string;
  duracion_minutos?: number;
  activo?: boolean;
  imagen_url?: string;
  asistentes_count?: number;
  created_at?: string;
}

export interface Asistente {
  id: string;
  evento_id: string;
  nombre: string;
  correo: string;
  celular: string;
  pais?: string;
  interes_inversion?: string;
  persona_contacto?: string;
  created_at: string;
  evento_nombre?: string;
  evento_tipo?: 'webinar' | 'lead_form';
  evento_fecha?: string;
  estado?: 'pendiente' | 'atendido' | 'en_proceso' | 'no_responde' | 'descartado' | string;
  notas?: string;
  fecha_atencion?: string;
}

interface EventManagerTabProps {
  onUseAsCampaign?: (evento: Evento) => void;
}

export default function EventManagerTab({ onUseAsCampaign }: EventManagerTabProps = {}) {
  // Navigation tabs: 'eventos' | 'registrados' | 'estadisticas' | 'tendencias' | 'biolink'
  const [activeSubTab, setActiveSubTab] = useState<'eventos' | 'registrados' | 'estadisticas' | 'tendencias' | 'biolink'>('eventos');

  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState<'todos' | 'webinar' | 'lead_form'>('todos');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedWspId, setCopiedWspId] = useState<string | null>(null);
  const [copiedBio, setCopiedBio] = useState(false);

  // Global Attendees State (Sección Clientes Registrados)
  const [allAttendees, setAllAttendees] = useState<Asistente[]>([]);
  const [loadingAllAttendees, setLoadingAllAttendees] = useState(false);
  const [selectedEventFilter, setSelectedEventFilter] = useState<string>('todos');
  const [attendeeSearchGlobal, setAttendeeSearchGlobal] = useState('');
  const [interestFilter, setInterestFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [channelFilter, setChannelFilter] = useState<'todos' | 'con_celular' | 'solo_correo'>('todos');
  const [ageFilter, setAgeFilter] = useState<'todos' | 'hoy' | 'semana' | 'mes' | 'antiguo'>('todos');
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'all' | '30d' | '7d' | 'today'>('all');
  const [cadenceFilter, setCadenceFilter] = useState<'todos' | 'urgente_dia2' | 'negociacion_dia5' | 'reactivacion_dia15'>('todos');
  const [trendDaysRange, setTrendDaysRange] = useState<7 | 14 | 30>(14);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEvento, setEditingEvento] = useState<Partial<Evento> | null>(null);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [selectedEventoAttendees, setSelectedEventoAttendees] = useState<Evento | null>(null);
  const [attendeesList, setAttendeesList] = useState<Asistente[]>([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; nombre: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bio Link Buttons Customization State
  const [isBioConfigModalOpen, setIsBioConfigModalOpen] = useState(false);
  const [bioButtonsConfig, setBioButtonsConfig] = useState<BioButtonItem[]>(getStoredBioButtonsSync);
  const [savingBioButtons, setSavingBioButtons] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Cargar configuración de botones de Bio Link desde Supabase / Backend al iniciar
  useEffect(() => {
    fetchBioButtons().then((btns) => {
      if (btns && btns.length > 0) {
        setBioButtonsConfig(btns);
      }
    });
  }, []);

  const handleOpenBioConfig = () => {
    fetchBioButtons().then((btns) => {
      setBioButtonsConfig(btns);
      setIsBioConfigModalOpen(true);
    });
  };

  const handleUpdateBioButton = (id: string, field: keyof BioButtonItem, value: any) => {
    setBioButtonsConfig((prev) =>
      prev.map((b) => (b.id === id ? { ...b, [field]: value } : b))
    );
  };

  const handleSaveBioConfig = async () => {
    setSavingBioButtons(true);
    try {
      const ok = await saveBioButtons(bioButtonsConfig);
      if (ok) {
        showToast('¡Botones y enlaces del Bio Link actualizados con éxito!', 'success');
        setIsBioConfigModalOpen(false);
      } else {
        showToast('Se guardó localmente. Verifica la conexión con Supabase.', 'info');
        setIsBioConfigModalOpen(false);
      }
    } catch (err: any) {
      console.error('Error al guardar configuración de Bio Link:', err);
      showToast('Error al guardar la configuración de botones.', 'error');
    } finally {
      setSavingBioButtons(false);
    }
  };

  const handleResetBioConfig = () => {
    if (window.confirm('¿Deseas restablecer todos los botones a sus nombres y enlaces originales?')) {
      setBioButtonsConfig(DEFAULT_BIO_BUTTONS);
      showToast('Botones restablecidos a los valores predeterminados', 'info');
    }
  };

  // Storage Image Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Estado para Modal de Agendamiento Rápido de Cita 1 a 1 con Meet
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [scheduleContact, setScheduleContact] = useState<Asistente | null>(null);
  const [schedulingLoading, setSchedulingLoading] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    titulo: '',
    fecha_inicio: '',
    duracion_minutos: 45,
    generar_meet: true,
    notas: '',
  });

  const getBackendUrl = () => {
    if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
    if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      return 'http://localhost:3080';
    }
    return '';
  };
  const backendUrl = getBackendUrl();

  const handleUploadImageFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('La imagen no debe superar los 10MB');
      return;
    }

    setUploadingImage(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(`${backendUrl}/api/eventos/upload-imagen`, {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();
      if (res.ok && result.success && result.url) {
        setEditingEvento(prev => prev ? { ...prev, imagen_url: result.url } : prev);
        showToast('Flyer subido correctamente a Supabase Storage', 'success');
      } else {
        throw new Error(result.message || 'Error al subir la imagen a Supabase Storage');
      }
    } catch (err: any) {
      console.error('Error al subir imagen:', err);
      setUploadError(err.message || 'No se pudo subir la imagen al Storage');
      showToast(err.message || 'Error al subir la imagen', 'error');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  useEffect(() => {
    fetchEventos();
    fetchAllAttendees();
  }, []);

  const fetchEventos = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${backendUrl}/api/eventos`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setEventos(data.data);
        }
      }
    } catch (err) {
      console.error('Error al cargar eventos:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllAttendees = async () => {
    setLoadingAllAttendees(true);
    try {
      const res = await fetch(`${backendUrl}/api/eventos/asistentes/todos`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.data)) {
          setAllAttendees(data.data);
        }
      }
    } catch (err) {
      console.error('Error al cargar todos los asistentes:', err);
    } finally {
      setLoadingAllAttendees(false);
    }
  };

  const handleOpenCreate = (tipoPredeterminado: 'webinar' | 'lead_form' = 'webinar') => {
    setEditingEvento({
      id: '',
      nombre: '',
      tipo: tipoPredeterminado,
      fecha_inicio: tipoPredeterminado === 'webinar' ? new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 16) : '',
      duracion_minutos: 60,
      generar_meet: true, // Por defecto siempre crea con Google Meet
      link_reunion: '',
      descripcion: tipoPredeterminado === 'webinar' 
        ? `Una oportunidad de inversión inmobiliaria exclusiva con Afinitive Wealth Management.\n\n📈 Retorno proyectado: + 17%\n⏰ Hora Perú: 7:30 p.m.\n\nTe mostraremos el modelo financiero y sus números.`
        : `Completa tus datos para recibir asesoría personalizada y acceso exclusivo a nuestras oportunidades de inversión patrimonial.`,
      imagen_url: '',
      activo: true,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEdit = (evento: Evento) => {
    let formattedDate = '';
    if (evento.fecha_inicio) {
      try {
        const d = new Date(evento.fecha_inicio);
        formattedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
      } catch {
        formattedDate = evento.fecha_inicio;
      }
    }

    setEditingEvento({
      ...evento,
      tipo: evento.tipo || 'webinar',
      fecha_inicio: formattedDate,
      generar_meet: evento.generar_meet !== false, // Por defecto true
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEvento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvento || !editingEvento.nombre) {
      showToast('Por favor completa el nombre del evento o formulario', 'error');
      return;
    }

    const esWebinar = (editingEvento.tipo || 'webinar') === 'webinar';
    const generarMeet = editingEvento.generar_meet !== false;

    if (esWebinar && !editingEvento.fecha_inicio) {
      showToast('Para un Webinar / Cita en agenda, la fecha de inicio es obligatoria', 'error');
      return;
    }

    if (esWebinar && !generarMeet && !editingEvento.link_reunion) {
      showToast('Si no generas Google Meet automáticamente, debes ingresar un enlace de reunión (Zoom, Teams u otro)', 'error');
      return;
    }

    try {
      const isUpdating = !!editingEvento.id && eventos.some(ev => ev.id === editingEvento.id);
      const url = isUpdating ? `${backendUrl}/api/eventos/${editingEvento.id}` : `${backendUrl}/api/eventos`;
      const method = isUpdating ? 'PUT' : 'POST';

      const payload = {
        ...editingEvento,
        tipo: editingEvento.tipo || 'webinar',
        fecha_inicio: esWebinar ? editingEvento.fecha_inicio : null,
        generar_meet: esWebinar ? generarMeet : false,
        link_reunion: esWebinar ? (editingEvento.link_reunion || (generarMeet ? 'Google Meet (Generación Automática)' : '')) : '',
      };

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        setIsEditModalOpen(false);
        showToast(isUpdating ? 'Guardado correctamente' : 'Creado exitosamente', 'success');
        fetchEventos();
        fetchAllAttendees();
      } else {
        showToast(result.error || result.message || 'Error al guardar', 'error');
      }
    } catch (err: any) {
      showToast('Error de conexión con el servidor: ' + err.message, 'error');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`${backendUrl}/api/eventos/${deleteModal.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (res.ok && result.success) {
        showToast('Eliminado definitivamente', 'success');
        setDeleteModal(null);
        fetchEventos();
        fetchAllAttendees();
      } else {
        showToast(result.error || result.message || 'Error al eliminar', 'error');
      }
    } catch (err: any) {
      showToast('Error de conexión al eliminar: ' + err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAttendees = async (evento: Evento) => {
    setSelectedEventoAttendees(evento);
    setIsAttendeesModalOpen(true);
    setLoadingAttendees(true);
    try {
      const res = await fetch(`${backendUrl}/api/eventos/${evento.id}/asistentes`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAttendeesList(data.data || []);
        }
      }
    } catch (err) {
      console.error('Error al cargar asistentes:', err);
    } finally {
      setLoadingAttendees(false);
    }
  };

  const getPublicLandingUrl = (eventoId: string) => {
    const configuredEventsBase = import.meta.env.VITE_PUBLIC_EVENTS_URL;
    if (configuredEventsBase) {
      return `${configuredEventsBase.replace(/\/$/, '')}/?id=${eventoId}`;
    }

    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('afinitive.com.pe')) {
      return `https://eventos.afinitive.com.pe/?id=${eventoId}`;
    }

    const origin = window.location.origin;
    return `${origin}/evento?id=${eventoId}`;
  };

  const getBioLinkUrl = () => {
    const configuredEventsBase = import.meta.env.VITE_PUBLIC_EVENTS_URL;
    if (configuredEventsBase) {
      return `${configuredEventsBase.replace(/\/$/, '')}/bio`;
    }

    const hostname = window.location.hostname.toLowerCase();
    if (hostname.includes('afinitive.com.pe')) {
      return `https://eventos.afinitive.com.pe/bio`;
    }

    const origin = window.location.origin;
    return `${origin}/bio`;
  };

  const handleCopyBioLink = () => {
    const url = getBioLinkUrl();
    navigator.clipboard.writeText(url);
    setCopiedBio(true);
    showToast('Enlace de Link in Bio (TikTok/Instagram) copiado al portapapeles', 'success');
    setTimeout(() => setCopiedBio(false), 2500);
  };

  const handleCopyLink = (eventoId: string) => {
    const url = getPublicLandingUrl(eventoId);
    navigator.clipboard.writeText(url);
    setCopiedId(eventoId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleCopyWhatsappInvitation = (evento: Evento) => {
    const url = getPublicLandingUrl(evento.id);
    const esLeadForm = evento.tipo === 'lead_form';

    let text = '';
    if (esLeadForm) {
      text = [
        `*${evento.nombre}*`,
        '',
        `${evento.descripcion || 'Regístrate aquí para recibir información exclusiva y asesoría patrimonial:'}`,
        '',
        `👉 *Enlace de Registro:*`,
        `${url}`,
      ].join('\n');
    } else {
      let fechaStr = 'Próximamente';
      if (evento.fecha_inicio) {
        try {
          const d = new Date(evento.fecha_inicio);
          fechaStr = d.toLocaleString('es-PE', {
            timeZone: 'America/Lima',
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
          });
        } catch {}
      }

      text = [
        `*${evento.nombre}*`,
        '',
        `${evento.descripcion || 'Te invitamos a esta sesión privada sobre alternativas de inversión.'}`,
        '',
        `📅 *Fecha:* ${fechaStr} (Hora Perú)`,
        `⏱️ *Duración:* ${evento.duracion_minutos || 45} minutos`,
        '',
        `👉 *Confirma tu asistencia aquí:*`,
        `${url}`,
      ].join('\n');
    }

    navigator.clipboard.writeText(text);
    setCopiedWspId(evento.id);
    setTimeout(() => setCopiedWspId(null), 2500);
  };

  const handleUpdateAttendeeStatus = async (attendeeId: string, newStatus: string) => {
    setUpdatingStatusId(attendeeId);

    // Optimistic UI update
    const nowIso = new Date().toISOString();
    setAllAttendees(prev =>
      prev.map(a => (a.id === attendeeId ? { ...a, estado: newStatus, fecha_atencion: nowIso } : a))
    );
    setAttendeesList(prev =>
      prev.map(a => (a.id === attendeeId ? { ...a, estado: newStatus, fecha_atencion: nowIso } : a))
    );

    try {
      if (backendUrl) {
        await fetch(`${backendUrl}/api/eventos/asistentes/${attendeeId}/estado`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: newStatus }),
        });
      }

      const labels: { [k: string]: string } = {
        pendiente: '🟡 Pendiente',
        atendido: '🟢 Atendido',
        en_proceso: '🔵 En Proceso',
        no_responde: '⚪ No Responde / Descartado',
      };
      showToast(`Estado actualizado: ${labels[newStatus] || newStatus}`, 'success');
    } catch (err) {
      console.error('Error al actualizar estado:', err);
      showToast('Se actualizó localmente', 'info');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleContactWhatsapp = (a: Asistente) => {
    const cleanPhone = (a.celular || '').replace(/[^0-9]/g, '');
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(a.nombre)},%20te%20escribo%20de%20Afinitive%20Wealth%20Management%20en%20relaci%C3%B3n%20a%20tu%20registro.`;
    window.open(whatsappUrl, '_blank');

    // Si estaba pendiente, marcar automáticamente como atendido
    if (!a.estado || a.estado === 'pendiente') {
      handleUpdateAttendeeStatus(a.id, 'atendido');
    }
  };

  const handleOpenScheduleModal = (a: Asistente) => {
    setScheduleContact(a);
    // Calcular mañana a las 10:00 AM hora local
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    const localIso = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

    setScheduleForm({
      titulo: `Sesión de Asesoría Patrimonial — ${a.nombre}`,
      fecha_inicio: localIso,
      duracion_minutos: 45,
      generar_meet: true, // Por defecto siempre activo
      notas: `Interés: ${a.interes_inversion || 'Patrimonial'} | Origen: ${a.evento_nombre || 'Web'}`,
    });
    setIsScheduleModalOpen(true);
  };

  const handleConfirmDirectSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleContact) return;
    if (!scheduleForm.fecha_inicio) {
      showToast('Por favor selecciona la fecha y hora de la reunión', 'error');
      return;
    }

    setSchedulingLoading(true);
    try {
      const payload = {
        asistente_id: scheduleContact.id,
        nombre: scheduleContact.nombre,
        correo: scheduleContact.correo,
        celular: scheduleContact.celular,
        titulo: scheduleForm.titulo,
        fecha_inicio: scheduleForm.fecha_inicio,
        duracion_minutos: scheduleForm.duracion_minutos,
        generar_meet: scheduleForm.generar_meet !== false,
        notas: scheduleForm.notas,
      };

      const res = await fetch(`${backendUrl}/api/eventos/agendar-cita-directa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        showToast(
          result.meetLink 
            ? '¡Cita agendada! Sala de Google Meet creada y correo de confirmación enviado.' 
            : 'Cita agendada y correo de confirmación enviado exitosamente.',
          'success'
        );
        setIsScheduleModalOpen(false);
        setScheduleContact(null);
        fetchAllAttendees();
      } else {
        throw new Error(result.message || 'Error al agendar la reunión');
      }
    } catch (err: any) {
      console.error('Error al agendar cita directa:', err);
      showToast(err.message || 'Error al agendar la reunión', 'error');
    } finally {
      setSchedulingLoading(false);
    }
  };

  const handleRecontactWhatsapp = (a: Asistente, customMessage?: string) => {
    const cleanPhone = (a.celular || '').replace(/[^0-9]/g, '');
    const nombreCorto = (a.nombre || '').split(' ')[0] || 'estimado(a)';
    const defaultMsg = `Hola ${nombreCorto}, te escribo de Afinitive Wealth Management para dar seguimiento a tu consulta sobre alternativas de inversión.`;
    const messageToSend = customMessage ? encodeURIComponent(customMessage) : encodeURIComponent(defaultMsg);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${messageToSend}`;
    window.open(whatsappUrl, '_blank');

    // Actualizar fecha de atención / nuevo seguimiento en UI optimista
    const nowIso = new Date().toISOString();
    const nuevoEstado = a.estado === 'pendiente' ? 'atendido' : (a.estado || 'atendido');
    setAllAttendees(prev =>
      prev.map(item => (item.id === a.id ? { ...item, fecha_atencion: nowIso, estado: nuevoEstado } : item))
    );

    if (backendUrl) {
      fetch(`${backendUrl}/api/eventos/asistentes/${a.id}/estado`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          estado: nuevoEstado,
          notas: `Re-contactado vía WhatsApp el ${new Date().toLocaleDateString('es-PE')}`
        }),
      }).catch(err => console.error('Error al registrar recontacto:', err));
    }

    showToast(`Mensaje de seguimiento enviado a ${a.nombre}`, 'success');
  };

  const handleExportCsv = (list: Asistente[], filenamePrefix = 'asistentes') => {
    if (!list.length) return;

    const headers = ['ID', 'Nombre', 'Correo', 'Celular', 'País', 'Interés de Inversión', 'Evento/Link', 'Tipo', 'Estado Atención', 'Fecha Registro', 'Fecha Atención'];
    const rows = list.map(a => [
      `"${a.id}"`,
      `"${(a.nombre || '').replace(/"/g, '""')}"`,
      `"${(a.correo || '').replace(/"/g, '""')}"`,
      `"${(a.celular || '').replace(/"/g, '""')}"`,
      `"${(a.pais || 'Perú').replace(/"/g, '""')}"`,
      `"${(a.interes_inversion || '-').replace(/"/g, '""')}"`,
      `"${(a.evento_nombre || a.evento_id || '').replace(/"/g, '""')}"`,
      `"${a.evento_tipo === 'lead_form' ? 'Formulario TikTok' : 'Webinar'}"`,
      `"${(a.estado || 'pendiente').toUpperCase()}"`,
      `"${a.created_at}"`,
      `"${a.fecha_atencion || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filenamePrefix}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper para categorizar y formatear antigüedad de los contactos
  const getLeadAgeInfo = (createdAtStr?: string) => {
    if (!createdAtStr) {
      return { 
        group: 'antiguo' as const, 
        label: 'Sin fecha', 
        tag: 'Desconocido', 
        shortTag: '-', 
        hours: 9999, 
        days: 999, 
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200' 
      };
    }
    const created = new Date(createdAtStr).getTime();
    const now = Date.now();
    const diffMs = Math.max(0, now - created);
    const diffHours = diffMs / (1000 * 60 * 60);
    const diffDays = diffHours / 24;

    if (diffHours <= 24) {
      const roundedH = Math.max(1, Math.round(diffHours));
      return {
        group: 'hoy' as const,
        label: diffHours < 1 ? 'Hace unos minutos' : `Hace ${roundedH} hora${roundedH > 1 ? 's' : ''}`,
        tag: '🔥 <24 Horas (Caliente)',
        shortTag: diffHours < 1 ? '🔥 Hoy' : `🔥 ${roundedH}h`,
        days: diffDays,
        hours: diffHours,
        badgeClass: 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
      };
    } else if (diffDays <= 7) {
      const roundedD = Math.max(2, Math.round(diffDays));
      return {
        group: 'semana' as const,
        label: `Hace ${roundedD} días`,
        tag: '⚡ 2 a 7 días (Óptimo)',
        shortTag: `⚡ ${roundedD}d`,
        days: diffDays,
        hours: diffHours,
        badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
      };
    } else if (diffDays <= 30) {
      const roundedD = Math.round(diffDays);
      return {
        group: 'mes' as const,
        label: `Hace ${roundedD} días`,
        tag: '📆 8 a 30 días (Seguimiento)',
        shortTag: `📆 ${roundedD}d`,
        days: diffDays,
        hours: diffHours,
        badgeClass: 'bg-blue-50 text-blue-800 border-blue-200 font-medium'
      };
    } else {
      const roundedM = Math.max(1, Math.round(diffDays / 30));
      return {
        group: 'antiguo' as const,
        label: `Hace ${roundedM} mes${roundedM > 1 ? 'es' : ''}`,
        tag: '❄️ +30 días (Histórico)',
        shortTag: `❄️ ${roundedM}m`,
        days: diffDays,
        hours: diffHours,
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200'
      };
    }
  };

  // Filtros de eventos
  const filteredEventos = eventos.filter(ev => {
    const matchesSearch = 
      ev.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.descripcion && ev.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTipo = 
      tipoFilter === 'todos' || 
      (tipoFilter === 'webinar' && (ev.tipo === 'webinar' || !ev.tipo)) ||
      (tipoFilter === 'lead_form' && ev.tipo === 'lead_form');

    return matchesSearch && matchesTipo;
  });

  // Filtros de asistentes globales (Buscador + Estado + Evento + Interés + Canal de Contacto + Antigüedad)
  const filteredGlobalAttendees = allAttendees.filter(a => {
    const matchesSearch = 
      a.nombre.toLowerCase().includes(attendeeSearchGlobal.toLowerCase()) ||
      a.correo.toLowerCase().includes(attendeeSearchGlobal.toLowerCase()) ||
      (a.celular && a.celular.includes(attendeeSearchGlobal)) ||
      (a.pais && a.pais.toLowerCase().includes(attendeeSearchGlobal.toLowerCase()));

    const matchesEvent = 
      selectedEventFilter === 'todos' || a.evento_id === selectedEventFilter;

    const matchesInterest = 
      interestFilter === 'todos' || a.interes_inversion === interestFilter;

    const currentStatus = a.estado || 'pendiente';
    const matchesStatus = 
      statusFilter === 'todos' || currentStatus === statusFilter;

    const cleanPhone = (a.celular || '').replace(/[^0-9]/g, '');
    const hasPhone = cleanPhone.length >= 7;
    const matchesChannel = 
      channelFilter === 'todos' ||
      (channelFilter === 'con_celular' && hasPhone) ||
      (channelFilter === 'solo_correo' && !hasPhone);

    const ageInfo = getLeadAgeInfo(a.created_at);
    const matchesAge = 
      ageFilter === 'todos' || ageInfo.group === ageFilter;

    return matchesSearch && matchesEvent && matchesInterest && matchesStatus && matchesChannel && matchesAge;
  });

  // Métricas generales rápidas
  const totalRegistradosCount = allAttendees.length;
  const totalPendientesCount = allAttendees.filter(a => (a.estado || 'pendiente') === 'pendiente').length;
  const totalAtendidosCount = allAttendees.filter(a => a.estado === 'atendido' || a.estado === 'contactado').length;
  const totalEnProcesoCount = allAttendees.filter(a => a.estado === 'en_proceso').length;

  // ==========================================
  // CÁLCULOS PARA DASHBOARD EJECUTIVO (STEVE JOBS STYLE)
  // ==========================================
  const analyticsAttendees = allAttendees.filter(a => {
    if (analyticsTimeframe === 'all') return true;
    const age = getLeadAgeInfo(a.created_at);
    if (analyticsTimeframe === 'today') return age.hours <= 24;
    if (analyticsTimeframe === '7d') return age.days <= 7;
    if (analyticsTimeframe === '30d') return age.days <= 30;
    return true;
  });

  const totalAnalytics = analyticsAttendees.length;

  // 1. Canales de Contacto (Teléfono/WhatsApp vs Solo Correo)
  const analyticsConCelular = analyticsAttendees.filter(a => (a.celular || '').replace(/[^0-9]/g, '').length >= 7);
  const analyticsSoloCorreo = analyticsAttendees.filter(a => (a.celular || '').replace(/[^0-9]/g, '').length < 7);
  const analyticsCompletos = analyticsAttendees.filter(a => {
    const hasPhone = (a.celular || '').replace(/[^0-9]/g, '').length >= 7;
    const hasEmail = (a.correo || '').includes('@');
    const hasName = (a.nombre || '').trim().length > 1;
    return hasPhone && hasEmail && hasName;
  });

  const pctAnalyticsCelular = totalAnalytics > 0 ? Math.round((analyticsConCelular.length / totalAnalytics) * 100) : 0;
  const pctAnalyticsSoloCorreo = totalAnalytics > 0 ? Math.round((analyticsSoloCorreo.length / totalAnalytics) * 100) : 0;
  const pctAnalyticsCompletos = totalAnalytics > 0 ? Math.round((analyticsCompletos.length / totalAnalytics) * 100) : 0;

  // 2. Interacciones de WhatsApp & Efectividad
  const analyticsContactadosWsp = analyticsConCelular.filter(a => a.estado === 'atendido' || a.estado === 'contactado' || a.estado === 'en_proceso');
  const analyticsPendientesWsp = analyticsConCelular.filter(a => (a.estado || 'pendiente') === 'pendiente');
  const tasaContactadosWsp = analyticsConCelular.length > 0 ? Math.round((analyticsContactadosWsp.length / analyticsConCelular.length) * 100) : 0;

  // 3. Cohortes de Antigüedad (Freshness Index)
  const cohortesAnalytics = {
    hoy: analyticsAttendees.filter(a => getLeadAgeInfo(a.created_at).group === 'hoy'),
    semana: analyticsAttendees.filter(a => getLeadAgeInfo(a.created_at).group === 'semana'),
    mes: analyticsAttendees.filter(a => getLeadAgeInfo(a.created_at).group === 'mes'),
    antiguo: analyticsAttendees.filter(a => getLeadAgeInfo(a.created_at).group === 'antiguo'),
  };

  // 4. Speed-to-Lead (Tiempo Promedio de Respuesta / Atención)
  const leadsConTiempo = analyticsAttendees.filter(a => a.fecha_atencion && a.created_at);
  let avgResponseHours = 0;
  if (leadsConTiempo.length > 0) {
    const sumHours = leadsConTiempo.reduce((acc, a) => {
      const start = new Date(a.created_at).getTime();
      const end = new Date(a.fecha_atencion!).getTime();
      const diff = Math.max(0, end - start) / (1000 * 60 * 60);
      return acc + diff;
    }, 0);
    avgResponseHours = Math.round((sumHours / leadsConTiempo.length) * 10) / 10;
  }

  // 5. Estados del Embudo
  const analyticsPendientes = analyticsAttendees.filter(a => (a.estado || 'pendiente') === 'pendiente').length;
  const analyticsAtendidos = analyticsAttendees.filter(a => a.estado === 'atendido' || a.estado === 'contactado').length;
  const analyticsEnProceso = analyticsAttendees.filter(a => a.estado === 'en_proceso').length;
  const analyticsDescartados = analyticsAttendees.filter(a => a.estado === 'no_responde' || a.estado === 'descartado').length;
  const tasaAtencionGlobal = totalAnalytics > 0 ? Math.round(((analyticsAtendidos + analyticsEnProceso) / totalAnalytics) * 100) : 0;

  // 6. Distribución por Origen
  const porOrigen = analyticsAttendees.reduce((acc: { [k: string]: number }, a) => {
    let key = a.evento_id === 'dr-finanzas-bio' 
      ? '✨ Bio Link TikTok (Dr. Finanzas)' 
      : (a.evento_nombre || 'Formulario Web');
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const origenesOrdenados = Object.entries(porOrigen).sort((a, b) => b[1] - a[1]);

  // 7. Distribución por Interés
  const porInteres = analyticsAttendees.reduce((acc: { [k: string]: number }, a) => {
    let key = a.interes_inversion || 'Sin especificar';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const interesesOrdenados = Object.entries(porInteres).sort((a, b) => b[1] - a[1]);

  // 8. Distribución por País
  const porPais = analyticsAttendees.reduce((acc: { [k: string]: number }, a) => {
    let key = a.pais || 'Perú';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const paisesOrdenados = Object.entries(porPais).sort((a, b) => b[1] - a[1]);

  // ==========================================
  // MARKETING & RE-ENGAGEMENT INTELLIGENCE (DUEÑO DE NEGOCIO)
  // ==========================================

  // 1. Cadencias de Re-contacto Inteligente
  const getLeadRecontactInfo = (a: Asistente) => {
    const lastActionDateStr = a.fecha_atencion || a.created_at;
    const lastActionTime = new Date(lastActionDateStr).getTime();
    const now = Date.now();
    const diffDays = Math.max(0, (now - lastActionTime) / (1000 * 60 * 60 * 24));
    const daysPassed = Math.floor(diffDays);

    let cadenceStage: 'urgente_dia2' | 'negociacion_dia5' | 'reactivacion_dia15' | 'al_dia' = 'al_dia';
    let stageTitle = 'Al día / Reciente';
    let recommendedAction = 'Sin acción urgente';
    let badgeClass = 'bg-slate-100 text-slate-600 border-slate-200';
    let suggestedMessage = '';

    const nombreCorto = (a.nombre || 'estimado(a)').split(' ')[0];
    const interes = a.interes_inversion && a.interes_inversion !== '-' ? a.interes_inversion : 'inversiones patrimoniales';

    if (daysPassed >= 2 && daysPassed <= 4 && (a.estado === 'pendiente' || a.estado === 'atendido')) {
      cadenceStage = 'urgente_dia2';
      stageTitle = '🔥 Re-contacto 1 (Día 2-4)';
      recommendedAction = 'Primer seguimiento comercial post-registro';
      badgeClass = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
      suggestedMessage = `Hola ${nombreCorto}, ¿cómo estás? Te escribo de Afinitive Wealth Management para consultar si pudiste revisar la información sobre ${interes} que te compartimos. ¿Te gustaría agendar una breve llamada de 10 minutos esta semana?`;
    } else if (daysPassed >= 5 && daysPassed <= 9 && (a.estado === 'en_proceso' || a.estado === 'atendido')) {
      cadenceStage = 'negociacion_dia5';
      stageTitle = '⚡ Re-contacto 2 (Día 5-9)';
      recommendedAction = 'Seguimiento de propuesta o caso de éxito';
      badgeClass = 'bg-amber-50 text-amber-900 border-amber-300 font-bold';
      suggestedMessage = `Hola ${nombreCorto}, espero que todo vaya excelente. Quería comentarte que tenemos nuevas proyecciones de rentabilidad y opciones destacadas para ${interes}. ¿Cuándo te vendría bien revisar los detalles?`;
    } else if (daysPassed >= 15 && a.estado !== 'descartado' && a.estado !== 'no_responde') {
      cadenceStage = 'reactivacion_dia15';
      stageTitle = '🔄 Reactivación (+15 Días)';
      recommendedAction = 'Invitación a nuevo webinar o masterclass';
      badgeClass = 'bg-blue-50 text-blue-900 border-blue-300 font-bold';
      suggestedMessage = `Hola ${nombreCorto}, un gusto saludarte nuevamente. En Afinitive estamos organizando una sesión privada exclusiva sobre ${interes} y análisis de mercado. ¿Te gustaría que te reservemos un cupo prioritario?`;
    }

    return {
      daysPassed,
      cadenceStage,
      stageTitle,
      recommendedAction,
      badgeClass,
      suggestedMessage,
      lastActionDateStr
    };
  };

  const recontactQueue = allAttendees
    .map(a => ({ asistente: a, recontact: getLeadRecontactInfo(a) }))
    .filter(item => item.recontact.cadenceStage !== 'al_dia')
    .sort((a, b) => {
      const priority = { urgente_dia2: 1, negociacion_dia5: 2, reactivacion_dia15: 3, al_dia: 4 };
      return priority[a.recontact.cadenceStage] - priority[b.recontact.cadenceStage];
    });

  const recontactCadencia1 = recontactQueue.filter(item => item.recontact.cadenceStage === 'urgente_dia2');
  const recontactCadencia2 = recontactQueue.filter(item => item.recontact.cadenceStage === 'negociacion_dia5');
  const recontactCadencia3 = recontactQueue.filter(item => item.recontact.cadenceStage === 'reactivacion_dia15');

  const filteredRecontactQueue = recontactQueue.filter(item => {
    if (cadenceFilter === 'todos') return true;
    return item.recontact.cadenceStage === cadenceFilter;
  });

  // 2. Línea de Tiempo de Captación Diaria (Tendencia de los últimos N días)
  const timelineTrendData = Array.from({ length: trendDaysRange }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - ((trendDaysRange - 1) - i));
    const dateIso = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
    
    const leadsDay = allAttendees.filter(a => (a.created_at || '').slice(0, 10) === dateIso);
    const conWsp = leadsDay.filter(a => (a.celular || '').replace(/[^0-9]/g, '').length >= 7).length;
    const soloEmail = leadsDay.length - conWsp;

    return {
      dateIso,
      dayLabel,
      total: leadsDay.length,
      conWsp,
      soloEmail
    };
  });

  const maxTimelineTotal = Math.max(1, ...timelineTrendData.map(d => d.total));
  const totalLeadsInTrend = timelineTrendData.reduce((acc, d) => acc + d.total, 0);
  const avgLeadsPerDay = Math.round((totalLeadsInTrend / trendDaysRange) * 10) / 10;

  // 3. Heatmap de Días de la Semana y Horarios de Mayor Conversión
  const dayNamesArr = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const leadsByDayOfWeek = dayNamesArr.map((name, idx) => {
    const count = allAttendees.filter(a => {
      if (!a.created_at) return false;
      return new Date(a.created_at).getDay() === idx;
    }).length;
    const pct = totalRegistradosCount > 0 ? Math.round((count / totalRegistradosCount) * 100) : 0;
    return { name, count, pct };
  });
  const topDayOfWeek = [...leadsByDayOfWeek].sort((a, b) => b.count - a.count)[0];

  const franjasHorarias = [
    { id: 'madrugada', name: '🌌 Madrugada', time: '00h - 06h', count: 0 },
    { id: 'manana', name: '🌅 Mañana', time: '06h - 12h', count: 0 },
    { id: 'tarde', name: '☀️ Tarde', time: '12h - 18h', count: 0 },
    { id: 'noche', name: '🌙 Noche', time: '18h - 24h', count: 0 },
  ];

  allAttendees.forEach(a => {
    if (!a.created_at) return;
    const hour = new Date(a.created_at).getHours();
    if (hour >= 0 && hour < 6) franjasHorarias[0].count++;
    else if (hour >= 6 && hour < 12) franjasHorarias[1].count++;
    else if (hour >= 12 && hour < 18) franjasHorarias[2].count++;
    else franjasHorarias[3].count++;
  });
  const topFranja = [...franjasHorarias].sort((a, b) => b.count - a.count)[0];

  // 4. Segmentos de Audiencias para Campañas de Marketing
  const segmentoVip = allAttendees.filter(a => (a.celular || '').replace(/[^0-9]/g, '').length >= 7 && a.interes_inversion && a.interes_inversion !== '-');
  const segmentoEmail = allAttendees.filter(a => (a.celular || '').replace(/[^0-9]/g, '').length < 7 && a.correo && a.correo.includes('@'));
  const segmentoReactivacion = allAttendees.filter(a => getLeadAgeInfo(a.created_at).days >= 15 && a.estado !== 'descartado' && a.estado !== 'no_responde');
  const segmentoNegociacion = allAttendees.filter(a => a.estado === 'en_proceso');

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Header Card (Estilo Blanco Limpio) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Gestor de Eventos & Formularios de Captura
            </h2>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Crea enlaces de webinars o formularios de captura para el perfil de TikTok / redes sociales. Todos los prospectos se registran en Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleOpenCreate('lead_form')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
            title="Crear un link simple tipo Google Forms para biografía de TikTok/Instagram"
          >
            <FileText className="w-4 h-4" />
            + Formulario TikTok / Bio
          </button>

          <button
            onClick={() => handleOpenCreate('webinar')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Video className="w-4 h-4 text-amber-400" />
            + Crear Webinar
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs (Fondo Blanco Limpio) */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab('eventos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'eventos'
                ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>Eventos & Formularios ({eventos.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('registrados');
              fetchAllAttendees();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'registrados'
                ? 'bg-blue-50 text-blue-900 border border-blue-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4 text-blue-600" />
            <span>👥 Clientes Registrados ({totalRegistradosCount})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('estadisticas');
              fetchAllAttendees();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'estadisticas'
                ? 'bg-gradient-to-r from-purple-50 to-indigo-50 text-indigo-950 border border-indigo-300 shadow-xs ring-1 ring-indigo-400/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>📊 Estadísticas & Métricas</span>
            <span className="px-1.5 py-0.2 rounded-md bg-indigo-600 text-white text-[9px] font-black uppercase tracking-wider">
              PRO
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('tendencias');
              fetchAllAttendees();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'tendencias'
                ? 'bg-gradient-to-r from-amber-50 to-orange-50 text-orange-950 border border-orange-300 shadow-xs ring-1 ring-orange-400/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Repeat className="w-4 h-4 text-orange-600" />
            <span>🔥 Tendencias & Re-contacto</span>
            {recontactQueue.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-md bg-rose-600 text-white text-[9px] font-black tracking-wider animate-pulse">
                {recontactQueue.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('biolink')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'biolink'
                ? 'bg-[#8B5A2B]/10 text-[#8B5A2B] border border-[#8B5A2B]/40 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#8B5A2B]" />
            <span>Link in Bio TikTok (Dr. Finanzas)</span>
            <span className="px-1.5 py-0.5 rounded-md bg-[#8B5A2B] text-white text-[9px] font-extrabold uppercase tracking-wider">
              Nuevo
            </span>
          </button>
        </div>

        {(activeSubTab === 'registrados' || activeSubTab === 'estadisticas' || activeSubTab === 'tendencias') && (
          <button
            onClick={() => handleExportCsv(filteredGlobalAttendees, 'todos_los_clientes_registrados')}
            disabled={!filteredGlobalAttendees.length}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition-all cursor-pointer disabled:opacity-40 shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Exportar CSV
          </button>
        )}
      </div>

      {/* ================= SUBTAB 1: EVENTOS & FORMULARIOS ================= */}
      {activeSubTab === 'eventos' && (
        <div className="space-y-4">

          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
              />
            </div>

            {/* Tipo Selector Filter */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <span className="text-[11px] text-slate-500 mr-1 flex items-center gap-1 font-medium">
                <Filter className="w-3 h-3" /> Tipo:
              </span>
              <button
                onClick={() => setTipoFilter('todos')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  tipoFilter === 'todos' 
                    ? 'bg-slate-900 text-white font-bold' 
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTipoFilter('webinar')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  tipoFilter === 'webinar' 
                    ? 'bg-amber-100 text-amber-900 font-bold border border-amber-300' 
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                🎙️ Webinars
              </button>
              <button
                onClick={() => setTipoFilter('lead_form')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  tipoFilter === 'lead_form' 
                    ? 'bg-blue-100 text-blue-900 font-bold border border-blue-300' 
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                📋 Formularios TikTok
              </button>
            </div>
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="py-20 text-center text-slate-400 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs font-medium text-slate-600">Cargando enlaces desde Supabase...</p>
            </div>
          ) : filteredEventos.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">No se encontraron eventos o formularios</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
                Aún no has creado ningún link o no coincide con tu búsqueda actual.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handleOpenCreate('lead_form')}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Crear Formulario TikTok
                </button>
                <button
                  onClick={() => handleOpenCreate('webinar')}
                  className="px-3.5 py-2 rounded-lg bg-slate-900 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Crear Webinar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEventos.map((ev) => {
                const esLeadForm = ev.tipo === 'lead_form';
                let fechaFormatted = 'Sin fecha fija (Formulario continuo)';
                if (ev.fecha_inicio) {
                  try {
                    const d = new Date(ev.fecha_inicio);
                    fechaFormatted = d.toLocaleDateString('es-PE', {
                      timeZone: 'America/Lima',
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    });
                  } catch {}
                }

                return (
                  <div 
                    key={ev.id}
                    className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all duration-300 flex flex-col group"
                  >
                    {/* Image Banner / Placeholder */}
                    <div className="relative h-40 bg-slate-100 overflow-hidden border-b border-slate-100">
                      {ev.imagen_url ? (
                        <img 
                          src={ev.imagen_url} 
                          alt={ev.nombre}
                          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 text-slate-400 gap-1.5">
                          {esLeadForm ? (
                            <>
                              <FileText className="w-8 h-8 text-blue-500" />
                              <span className="text-[11px] font-bold text-blue-700">Formulario TikTok (Fondo Blanco)</span>
                            </>
                          ) : (
                            <>
                              <Video className="w-8 h-8 text-amber-600" />
                              <span className="text-[11px] font-bold text-slate-600">Webinar Virtual Zoom</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Badges Superiores */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        {esLeadForm ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 shadow-xs flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            TikTok / Bio Form
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200 shadow-xs flex items-center gap-1">
                            <Video className="w-3 h-3 text-amber-600" />
                            Webinar Zoom
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          ev.activo !== false 
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {ev.activo !== false ? 'Activo' : 'Pausado'}
                        </span>
                      </div>

                      <div className="absolute bottom-2 left-2.5">
                        <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider bg-white/95 backdrop-blur-xs px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                          ID: {ev.id}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      
                      <div>
                        <h3 className="text-base font-bold text-slate-900 line-clamp-1 mb-1.5">
                          {ev.nombre}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {ev.descripcion || 'Sin descripción adicional'}
                        </p>
                      </div>

                      {/* Metadata Row */}
                      <div className="space-y-2 text-xs bg-slate-50/70 border border-slate-100 rounded-xl p-3">
                        {!esLeadForm && (
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-amber-600" />
                              Fecha & Hora:
                            </span>
                            <span className="font-semibold capitalize text-slate-900 truncate max-w-[170px] text-right">
                              {fechaFormatted}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-slate-700">
                          <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                            <Users className="w-3.5 h-3.5 text-blue-600" />
                            Registrados:
                          </span>
                          <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            {ev.asistentes_count || 0} prospectos
                          </span>
                        </div>

                        {!esLeadForm && ev.link_reunion && (
                          <div className="flex items-center justify-between text-slate-700 truncate">
                            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                              <Video className="w-3.5 h-3.5 text-purple-600" />
                              Zoom:
                            </span>
                            <a 
                              href={ev.link_reunion} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-blue-600 hover:underline truncate max-w-[150px] font-mono"
                            >
                              {ev.link_reunion}
                            </a>
                          </div>
                        )}

                        {esLeadForm && (
                          <div className="flex items-center justify-between text-slate-700">
                            <span className="flex items-center gap-1.5 text-slate-500 font-medium">
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                              Diseño:
                            </span>
                            <span className="text-blue-700 font-medium">
                              Google Form (Fondo Blanco)
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2 pt-1">
                        
                        {/* Primary Share Actions */}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => handleCopyLink(ev.id)}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                            title="Copiar link para poner en TikTok o redes"
                          >
                            {copiedId === ev.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-emerald-700">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5 text-blue-600" />
                                <span>Copiar Link</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleCopyWhatsappInvitation(ev)}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 transition-colors cursor-pointer"
                            title="Copiar texto formateado listo para WhatsApp"
                          >
                            {copiedWspId === ev.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Copia WhatsApp</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Botón: Crear Campaña Masiva de Correo con este Evento */}
                        {!esLeadForm && onUseAsCampaign && (
                          <button
                            onClick={() => onUseAsCampaign(ev)}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5 text-amber-600" />
                            <span>✉️ Usar como Plantilla de Correo Masivo</span>
                          </button>
                        )}

                        {/* Secondary Management Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          <button
                            onClick={() => handleOpenAttendees(ev)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-bold inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Ver Asistentes ({ev.asistentes_count || 0})
                          </button>

                          <div className="flex items-center gap-1">
                            <a
                              href={`/evento?id=${ev.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
                              title="Abrir formulario/landing en nueva pestaña"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleOpenEdit(ev)}
                              className="p-1.5 text-slate-500 hover:text-amber-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Editar configuración"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, id: ev.id, nombre: ev.nombre })}
                              className="p-1.5 text-slate-500 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                              title="Eliminar enlace"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================= SUBTAB 2: CLIENTES REGISTRADOS / LEADS ================= */}
      {activeSubTab === 'registrados' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Banner de Inteligencia y Acceso Rápido al Dashboard Ejecutivo */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm border border-indigo-800/40">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-md">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-black tracking-tight text-white">
                    Centro de Inteligencia & Calidad de Contactos
                  </h4>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold border border-indigo-400/30">
                    {pctAnalyticsCelular}% Contactabilidad Móvil
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 max-w-2xl">
                  {cohortesAnalytics.hoy.length > 0 
                    ? `Tienes ${cohortesAnalytics.hoy.length} contacto(s) caliente(s) recibidos en las últimas 24h. Escríbeles por WhatsApp para asegurar la tasa de conversión.` 
                    : 'Explora las métricas de WhatsApp vs Email, cohortes por antigüedad y tiempos de respuesta.'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveSubTab('estadisticas')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs transition-all shrink-0 cursor-pointer shadow-sm active:scale-95"
            >
              <Activity className="w-4 h-4 text-indigo-600" />
              <span>Ver Dashboard Completo</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Métricas Rápidas de Atención (Fondo Blanco Limpio) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Total General */}
            <div 
              onClick={() => {
                setStatusFilter('todos');
                setChannelFilter('todos');
                setAgeFilter('todos');
              }}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 shadow-xs ${
                statusFilter === 'todos' && channelFilter === 'todos' && ageFilter === 'todos'
                  ? 'bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20' 
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Total Leads
                </span>
                <span className="text-2xl font-bold text-slate-900">
                  {totalRegistradosCount}
                </span>
              </div>
            </div>

            {/* 2. Pendientes por Atender */}
            <div 
              onClick={() => setStatusFilter('pendiente')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 shadow-xs ${
                statusFilter === 'pendiente' 
                  ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-500/30' 
                  : 'bg-amber-50/30 border-amber-200/80 hover:border-amber-300'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-800 flex items-center justify-center shrink-0">
                <span className="text-lg">🟡</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-extrabold text-amber-800 uppercase tracking-wider">
                    Por Contactar
                  </span>
                  {totalPendientesCount > 0 && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                  )}
                </div>
                <span className="text-2xl font-black text-amber-950">
                  {totalPendientesCount}
                </span>
              </div>
            </div>

            {/* 3. Atendidos / Contactados */}
            <div 
              onClick={() => setStatusFilter('atendido')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 shadow-xs ${
                statusFilter === 'atendido' 
                  ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-500/30' 
                  : 'bg-emerald-50/30 border-emerald-200/80 hover:border-emerald-300'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-100/80 border border-emerald-300 text-emerald-800 flex items-center justify-center shrink-0">
                <span className="text-lg">🟢</span>
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">
                  Atendidos
                </span>
                <span className="text-2xl font-black text-emerald-950">
                  {totalAtendidosCount}
                </span>
              </div>
            </div>

            {/* 4. En Negociación / Proceso */}
            <div 
              onClick={() => setStatusFilter('en_proceso')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center gap-3.5 shadow-xs ${
                statusFilter === 'en_proceso' 
                  ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/30' 
                  : 'bg-indigo-50/30 border-indigo-200/80 hover:border-indigo-300'
              }`}
            >
              <div className="w-11 h-11 rounded-xl bg-indigo-100/80 border border-indigo-300 text-indigo-800 flex items-center justify-center shrink-0">
                <span className="text-lg">🔵</span>
              </div>
              <div>
                <span className="text-[11px] font-extrabold text-indigo-800 uppercase tracking-wider">
                  En Negociación
                </span>
                <span className="text-2xl font-black text-indigo-950">
                  {totalEnProcesoCount}
                </span>
              </div>
            </div>
          </div>

          {/* Filtros de la Tabla de Registrados */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col gap-3 shadow-xs">
            
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Buscador */}
              <div className="relative flex-1 w-full max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, correo, teléfono o país..."
                  value={attendeeSearchGlobal}
                  onChange={(e) => setAttendeeSearchGlobal(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600 focus:bg-white transition-all"
                />
              </div>

              {/* Botón de Limpiar Filtros si hay alguno activo */}
              {(statusFilter !== 'todos' || selectedEventFilter !== 'todos' || interestFilter !== 'todos' || channelFilter !== 'todos' || ageFilter !== 'todos' || attendeeSearchGlobal) && (
                <button
                  onClick={() => {
                    setStatusFilter('todos');
                    setSelectedEventFilter('todos');
                    setInterestFilter('todos');
                    setChannelFilter('todos');
                    setAgeFilter('todos');
                    setAttendeeSearchGlobal('');
                  }}
                  className="inline-flex items-center gap-1 text-xs text-rose-600 hover:text-rose-800 font-bold bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg border border-rose-200 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Limpiar Filtros
                </button>
              )}
            </div>

            {/* Selectores de Filtro Avanzados */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
              
              {/* 1. Filtro por Estado */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Estado:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={`border rounded-xl py-1.5 px-2.5 text-xs focus:outline-none cursor-pointer font-bold transition-all ${
                    statusFilter === 'pendiente'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : statusFilter === 'atendido'
                      ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                      : statusFilter === 'en_proceso'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="pendiente">🟡 Pendientes ({totalPendientesCount})</option>
                  <option value="atendido">🟢 Atendidos ({totalAtendidosCount})</option>
                  <option value="en_proceso">🔵 En Negociación ({totalEnProcesoCount})</option>
                  <option value="no_responde">⚪ Descartados</option>
                </select>
              </div>

              {/* 2. Filtro por Canal de Contacto (WhatsApp vs Solo Email) */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Canal:</span>
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value as any)}
                  className={`border rounded-xl py-1.5 px-2.5 text-xs focus:outline-none cursor-pointer font-bold transition-all ${
                    channelFilter === 'con_celular'
                      ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                      : channelFilter === 'solo_correo'
                      ? 'bg-blue-50 text-blue-900 border-blue-300'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="todos">Todos los Canales</option>
                  <option value="con_celular">📱 Con Celular/WhatsApp ({analyticsConCelular.length})</option>
                  <option value="solo_correo">✉️ Solo Correo ({analyticsSoloCorreo.length})</option>
                </select>
              </div>

              {/* 3. Filtro por Antigüedad (Cohortes de Tiempo) */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Antigüedad:</span>
                <select
                  value={ageFilter}
                  onChange={(e) => setAgeFilter(e.target.value as any)}
                  className={`border rounded-xl py-1.5 px-2.5 text-xs focus:outline-none cursor-pointer font-bold transition-all ${
                    ageFilter === 'hoy'
                      ? 'bg-rose-100 text-rose-900 border-rose-300'
                      : ageFilter === 'semana'
                      ? 'bg-amber-100 text-amber-900 border-amber-300'
                      : ageFilter === 'mes'
                      ? 'bg-blue-100 text-blue-900 border-blue-300'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <option value="todos">Todas las Fechas</option>
                  <option value="hoy">🔥 Hoy / &lt;24h ({cohortesAnalytics.hoy.length})</option>
                  <option value="semana">⚡ 2 a 7 Días ({cohortesAnalytics.semana.length})</option>
                  <option value="mes">📆 8 a 30 Días ({cohortesAnalytics.mes.length})</option>
                  <option value="antiguo">❄️ +30 Días ({cohortesAnalytics.antiguo.length})</option>
                </select>
              </div>

              {/* 4. Filtro por Origen */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Origen:</span>
                <select
                  value={selectedEventFilter}
                  onChange={(e) => setSelectedEventFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer truncate font-medium"
                >
                  <option value="todos">Todos los Enlaces</option>
                  <option value="dr-finanzas-bio">✨ Link in Bio TikTok (Dr. Finanzas)</option>
                  {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.tipo === 'lead_form' ? '📋 ' : '🎙️ '} {ev.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* 5. Filtro por Interés */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Interés:</span>
                <select
                  value={interestFilter}
                  onChange={(e) => setInterestFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer font-medium"
                >
                  <option value="todos">Todos los intereses</option>
                  <option value="Inmobiliaria">Inmobiliaria</option>
                  <option value="Bolsa de Valores">Bolsa de Valores</option>
                  <option value="Fondos">Fondos</option>
                </select>
              </div>

            </div>
          </div>

          {/* Tabla de Clientes Registrados (Fondo Blanco) */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {loadingAllAttendees ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
                Cargando lista de clientes registrados...
              </div>
            ) : filteredGlobalAttendees.length === 0 ? (
              <div className="py-16 text-center text-slate-500 text-xs">
                <p className="font-bold text-slate-700 mb-1">No hay prospectos que coincidan con los filtros seleccionados</p>
                <p className="text-slate-400 text-[11px]">Prueba cambiando los filtros de canal, antigüedad o estado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Estado de Atención</th>
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">WhatsApp / Celular</th>
                      <th className="py-3 px-4">Correo</th>
                      <th className="py-3 px-4">País</th>
                      <th className="py-3 px-4">Interés</th>
                      <th className="py-3 px-4">Origen</th>
                      <th className="py-3 px-4">Antigüedad & Registro</th>
                      <th className="py-3 px-4 text-center">Agendar & Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredGlobalAttendees.map((a) => {
                      let formattedCreatedAt = a.created_at;
                      try {
                        formattedCreatedAt = new Date(a.created_at).toLocaleString('es-PE', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        });
                      } catch {}

                      const currentStatus = a.estado || 'pendiente';
                      const isUpdating = updatingStatusId === a.id;
                      const ageInfo = getLeadAgeInfo(a.created_at);
                      const cleanPhone = (a.celular || '').replace(/[^0-9]/g, '');
                      const hasPhone = cleanPhone.length >= 7;

                      return (
                        <tr 
                          key={a.id} 
                          className={`transition-colors ${
                            currentStatus === 'pendiente' 
                              ? 'bg-amber-50/20 hover:bg-amber-50/40' 
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          
                          {/* Selector Interactivo de Estado */}
                          <td className="py-3.5 px-4">
                            <div className="relative inline-block">
                              <select
                                value={currentStatus}
                                disabled={isUpdating}
                                onChange={(e) => handleUpdateAttendeeStatus(a.id, e.target.value)}
                                className={`appearance-none pl-7 pr-7 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-1 ${
                                  currentStatus === 'pendiente'
                                    ? 'bg-amber-100/80 text-amber-900 border-amber-300 focus:ring-amber-400 hover:bg-amber-200/80'
                                    : currentStatus === 'atendido' || currentStatus === 'contactado'
                                    ? 'bg-emerald-100/80 text-emerald-900 border-emerald-300 focus:ring-emerald-400 hover:bg-emerald-200/80'
                                    : currentStatus === 'en_proceso'
                                    ? 'bg-blue-100/80 text-blue-900 border-blue-300 focus:ring-blue-400 hover:bg-blue-200/80'
                                    : 'bg-slate-100 text-slate-700 border-slate-300 focus:ring-slate-400 hover:bg-slate-200'
                                }`}
                              >
                                <option value="pendiente">🟡 Pendiente</option>
                                <option value="atendido">🟢 Atendido</option>
                                <option value="en_proceso">🔵 En Proceso</option>
                                <option value="no_responde">⚪ Descartado</option>
                              </select>
                              
                              {/* Indicador de Punto de Color */}
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                                {currentStatus === 'pendiente' && <span className="block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                                {(currentStatus === 'atendido' || currentStatus === 'contactado') && <span className="block w-2 h-2 rounded-full bg-emerald-500"></span>}
                                {currentStatus === 'en_proceso' && <span className="block w-2 h-2 rounded-full bg-blue-500"></span>}
                                {currentStatus === 'no_responde' && <span className="block w-2 h-2 rounded-full bg-slate-400"></span>}
                              </span>

                              {/* Flecha Dropdown */}
                              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-current opacity-60 pointer-events-none text-[10px]">
                                ▼
                              </span>
                            </div>

                            {a.fecha_atencion && (
                              <span className="block text-[9px] text-slate-400 mt-0.5 font-mono">
                                Atendido: {new Date(a.fecha_atencion).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </td>

                          {/* Cliente */}
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase border ${
                                currentStatus === 'pendiente'
                                  ? 'bg-amber-100 text-amber-900 border-amber-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}>
                                {a.nombre ? a.nombre.charAt(0) : 'U'}
                              </div>
                              <div>
                                <span className="block text-slate-900 font-bold">{a.nombre}</span>
                                <span className="text-[10px] text-slate-500 font-normal">
                                  {a.persona_contacto || 'Registro Web'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* WhatsApp / Celular (Acción Inteligente) */}
                          <td className="py-3.5 px-4">
                            {hasPhone ? (
                              <button
                                type="button"
                                onClick={() => handleContactWhatsapp(a)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold transition-all shadow-2xs cursor-pointer active:scale-95"
                                title="Abrir WhatsApp y marcar como Atendido"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                <span>{a.celular}</span>
                              </button>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200 font-medium">
                                <PhoneOff className="w-3 h-3 text-slate-400" />
                                Sin Celular
                              </span>
                            )}
                          </td>

                          {/* Correo */}
                          <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                            {a.correo ? (
                              <a href={`mailto:${a.correo}`} className="text-blue-600 hover:underline flex items-center gap-1">
                                <Mail className="w-3 h-3 text-blue-500" />
                                <span>{a.correo}</span>
                              </a>
                            ) : (
                              <span className="text-slate-400 italic">Sin correo</span>
                            )}
                          </td>

                          {/* País */}
                          <td className="py-3.5 px-4 text-slate-700">
                            <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-medium text-[11px]">
                              <Globe className="w-3 h-3 text-slate-500" />
                              {a.pais || 'Perú'}
                            </span>
                          </td>

                          {/* Interés de Inversión */}
                          <td className="py-3.5 px-4">
                            {a.interes_inversion ? (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                a.interes_inversion === 'Inmobiliaria'
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : a.interes_inversion === 'Bolsa de Valores'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-purple-50 text-purple-800 border-purple-200'
                              }`}>
                                <Briefcase className="w-3 h-3" />
                                {a.interes_inversion}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">No especificado</span>
                            )}
                          </td>

                          {/* Evento Origen */}
                          <td className="py-3.5 px-4 text-slate-700">
                            <div className="flex flex-col max-w-[180px]">
                              <span className="truncate font-semibold text-slate-900 text-xs" title={a.evento_nombre}>
                                {a.evento_id === 'dr-finanzas-bio' ? '✨ Link in Bio (Dr. Finanzas)' : (a.evento_nombre || a.evento_id)}
                              </span>
                              <span className={`text-[10px] uppercase tracking-wider font-bold ${
                                a.evento_tipo === 'lead_form' || a.evento_id === 'dr-finanzas-bio' ? 'text-blue-600' : 'text-amber-700'
                              }`}>
                                {a.evento_id === 'dr-finanzas-bio' ? '📱 Bio Link TikTok' : a.evento_tipo === 'lead_form' ? '📋 Formulario TikTok' : '🎙️ Webinar'}
                              </span>
                            </div>
                          </td>

                          {/* Antigüedad & Fecha Registro */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-col gap-0.5">
                              <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md border w-fit ${ageInfo.badgeClass}`}>
                                {ageInfo.shortTag} • {ageInfo.label}
                              </span>
                              <span className="text-slate-400 font-mono text-[10px]">
                                {formattedCreatedAt}
                              </span>
                            </div>
                          </td>

                          {/* Agendar & Acciones */}
                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => handleOpenScheduleModal(a)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white border border-blue-200 hover:border-blue-600 text-xs font-bold transition-all shadow-2xs cursor-pointer active:scale-95 group"
                              title="Agendar reunión 1 a 1 con enlace de Google Meet y enviar confirmación"
                            >
                              <Video className="w-3.5 h-3.5 text-blue-600 group-hover:text-white transition-colors" />
                              <span>Agendar Meet</span>
                            </button>
                          </td>

                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ================= SUBTAB 3: ESTADÍSTICAS & ANALÍTICA EJECUTIVA (STEVE JOBS STYLE) ================= */}
      {activeSubTab === 'estadisticas' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Keynote Executive Header */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white p-6 sm:p-8 border border-slate-800 shadow-xl">
            {/* Background ambient lighting */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-slate-950 text-[10px] font-black uppercase tracking-widest shadow-xs">
                    Executive Analytics
                  </span>
                  <span className="text-slate-400 text-xs font-mono">
                    Supabase Live Sync
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Inteligencia de Contactos & Conversión
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
                  Visión profunda de canales de captación (WhatsApp vs Email), cohortes de antigüedad y velocidad de respuesta para maximizar cierres.
                </p>
              </div>

              {/* Timeframe Selector Pill */}
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-700/80 p-1 rounded-2xl backdrop-blur-md self-stretch sm:self-auto justify-center flex-wrap">
                <button
                  onClick={() => setAnalyticsTimeframe('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    analyticsTimeframe === 'all'
                      ? 'bg-white text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  Histórico ({allAttendees.length})
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe('30d')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    analyticsTimeframe === '30d'
                      ? 'bg-white text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  30 Días
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe('7d')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    analyticsTimeframe === '7d'
                      ? 'bg-white text-slate-950 shadow-md font-black'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  7 Días
                </button>
                <button
                  onClick={() => setAnalyticsTimeframe('today')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    analyticsTimeframe === 'today'
                      ? 'bg-rose-500 text-white shadow-md font-black'
                      : 'text-rose-300 hover:text-white hover:bg-rose-950/40'
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  <span>Hoy ({cohortesAnalytics.hoy.length})</span>
                </button>
              </div>
            </div>
          </div>

          {/* 4 North Star Metric Cards (Impacto Steve Jobs) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* KPI 1: Total Leads Captados */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                  Volumen Captado
                </span>
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight block">
                  {totalAnalytics}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Prospectos registrados en {analyticsTimeframe === 'all' ? 'todo el histórico' : analyticsTimeframe === '30d' ? 'los últimos 30 días' : analyticsTimeframe === '7d' ? 'la última semana' : 'las últimas 24 horas'}
                </span>
              </div>
            </div>

            {/* KPI 2: Contactabilidad Móvil / WhatsApp */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-700">
                  Contactabilidad Móvil
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Smartphone className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-950 tracking-tight">
                    {pctAnalyticsCelular}%
                  </span>
                  <span className="text-xs font-bold text-emerald-700">
                    ({analyticsConCelular.length} leads)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Tienen número telefónico listo para contacto directo por WhatsApp
                </span>
              </div>
            </div>

            {/* KPI 3: Speed-to-Lead / Tiempo de Atención */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700">
                  Speed-to-Lead Promedio
                </span>
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Timer className="w-4 h-4" />
                </div>
              </div>
              <div>
                <span className="text-3xl sm:text-4xl font-black text-amber-950 tracking-tight block">
                  {avgResponseHours > 0 ? `${avgResponseHours}h` : '< 24h'}
                </span>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Tiempo medio transcurrido entre registro y primer contacto
                </span>
              </div>
            </div>

            {/* KPI 4: Eficiencia de Conversión Activa */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-700">
                  Pipeline Comercial
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl font-black text-indigo-950 tracking-tight">
                    {tasaAtencionGlobal}%
                  </span>
                  <span className="text-xs font-bold text-indigo-700">
                    ({analyticsAtendidos + analyticsEnProceso} leads)
                  </span>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Prospectos ya atendidos o en fase activa de negociación
                </span>
              </div>
            </div>

          </div>

          {/* SECCIÓN 1: DUELO DE CANALES (CELULAR/WHATSAPP VS SOLO CORREO) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>📱 Desglose por Canales de Contacto</span>
                  <span className="text-xs font-normal text-slate-400">| WhatsApp vs Solo Email</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Identifica qué prospectos tienen canal de cierre telefónico inmediato frente a los que requieren secuencias de correo.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-xl">
                Calidad de Datos: {pctAnalyticsCompletos}%
              </span>
            </div>

            {/* Barra Visual Proporcional de Canales */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-emerald-700 flex items-center gap-1.5">
                  <MessageCircle className="w-3.5 h-3.5" />
                  Con Celular / WhatsApp: {analyticsConCelular.length} ({pctAnalyticsCelular}%)
                </span>
                <span className="text-blue-700 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  Solo Correo Electrónico: {analyticsSoloCorreo.length} ({pctAnalyticsSoloCorreo}%)
                </span>
              </div>

              <div className="w-full h-3.5 bg-slate-100 rounded-full overflow-hidden flex p-0.5 gap-0.5">
                <div 
                  className="bg-emerald-500 rounded-full h-full transition-all duration-700" 
                  style={{ width: `${pctAnalyticsCelular}%` }}
                  title={`Con WhatsApp: ${pctAnalyticsCelular}%`}
                ></div>
                <div 
                  className="bg-blue-500 rounded-full h-full transition-all duration-700" 
                  style={{ width: `${pctAnalyticsSoloCorreo}%` }}
                  title={`Solo Correo: ${pctAnalyticsSoloCorreo}%`}
                ></div>
              </div>
            </div>

            {/* Tarjetas Comparativas de los 2 Canales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              
              {/* Tarjeta Canal 1: Con Celular / WhatsApp */}
              <div className="bg-emerald-50/40 border border-emerald-200/80 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                      Canal Primario de Cierre
                    </span>
                    <span className="text-2xl font-black text-emerald-950">
                      {analyticsConCelular.length}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-emerald-950 mt-2">
                    Prospectos con Número Telefónico / WhatsApp
                  </h5>
                  <p className="text-xs text-emerald-800/80 mt-1">
                    Prospectos con alta intención de compra listos para llamada o mensaje directo por WhatsApp.
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-emerald-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-emerald-700 uppercase font-bold block">Ya Contactados:</span>
                      <span className="text-base font-black text-emerald-900">{analyticsContactadosWsp.length} leads</span>
                      <span className="text-[10px] text-emerald-600 block">({tasaContactadosWsp}% de cobertura)</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-amber-800 uppercase font-bold block">Pendientes de WhatsApp:</span>
                      <span className="text-base font-black text-amber-900">{analyticsPendientesWsp.length} leads</span>
                      <span className="text-[10px] text-amber-700 block">Prioridad de contacto</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setChannelFilter('con_celular');
                    setActiveSubTab('registrados');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Ver Leads con WhatsApp en la Tabla ({analyticsConCelular.length})</span>
                </button>
              </div>

              {/* Tarjeta Canal 2: Solo Correo Electrónico */}
              <div className="bg-blue-50/40 border border-blue-200/80 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider">
                      Canal de Nutrición Digital
                    </span>
                    <span className="text-2xl font-black text-blue-950">
                      {analyticsSoloCorreo.length}
                    </span>
                  </div>
                  <h5 className="text-sm font-bold text-blue-950 mt-2">
                    Prospectos con Solo Correo Electrónico
                  </h5>
                  <p className="text-xs text-blue-800/80 mt-1">
                    No dejaron celular en el formulario inicial. Requieren campañas masivas de correo o invitaciones a webinars para capturar su teléfono.
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-blue-200/60 text-xs">
                    <div>
                      <span className="text-[10px] text-blue-700 uppercase font-bold block">Porcentaje de Base:</span>
                      <span className="text-base font-black text-blue-900">{pctAnalyticsSoloCorreo}%</span>
                      <span className="text-[10px] text-blue-600 block">Email Nurturing</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-indigo-700 uppercase font-bold block">Estrategia Recomendada:</span>
                      <span className="text-xs font-bold text-indigo-900 block mt-0.5">Envío de Plantilla de Email</span>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setChannelFilter('solo_correo');
                    setActiveSubTab('registrados');
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Ver Leads Solo Email en la Tabla ({analyticsSoloCorreo.length})</span>
                </button>
              </div>

            </div>
          </div>

          {/* SECCIÓN 2: DESGLOSE POR ANTIGÜEDAD (¿HACE CUÁNTO TIEMPO SE ENVIARON?) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <span>⏱️ Desglose por Antigüedad & Freshness Index</span>
                  <span className="text-xs font-normal text-slate-400">| ¿Hace cuánto tiempo se registraron?</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Los prospectos de menos de 24 horas tienen hasta un 391% más probabilidades de conversión según estándares comerciales.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-xl">
                🔥 {cohortesAnalytics.hoy.length} Calientes Hoy
              </span>
            </div>

            {/* Grid de 4 Cohortes de Antigüedad */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              
              {/* Cohorte 1: Hoy (<24 Horas) */}
              <div 
                onClick={() => {
                  setAgeFilter('hoy');
                  setActiveSubTab('registrados');
                }}
                className="p-4 rounded-2xl bg-gradient-to-br from-rose-50/80 to-rose-100/40 border-2 border-rose-300 hover:border-rose-400 transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500 text-white uppercase tracking-wider flex items-center gap-1">
                    <Flame className="w-3 h-3" />
                    Calientes
                  </span>
                  <span className="text-xs font-bold text-rose-800">
                    {totalAnalytics > 0 ? Math.round((cohortesAnalytics.hoy.length / totalAnalytics) * 100) : 0}%
                  </span>
                </div>
                <span className="text-3xl font-black text-rose-950 block my-1">
                  {cohortesAnalytics.hoy.length}
                </span>
                <span className="text-xs font-bold text-rose-900 block">
                  Últimas 24 Horas (Hoy)
                </span>
                <p className="text-[11px] text-rose-700 mt-1">
                  Ventana crítica de atención inmediata.
                </p>
                <span className="text-[10px] font-bold text-rose-800 mt-3 pt-2 border-t border-rose-200/60 block group-hover:underline">
                  Ver en tabla ➔
                </span>
              </div>

              {/* Cohorte 2: 2 a 7 Días */}
              <div 
                onClick={() => {
                  setAgeFilter('semana');
                  setActiveSubTab('registrados');
                }}
                className="p-4 rounded-2xl bg-amber-50/60 border border-amber-300/80 hover:border-amber-400 transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-500 text-white uppercase tracking-wider flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Ventana Óptima
                  </span>
                  <span className="text-xs font-bold text-amber-800">
                    {totalAnalytics > 0 ? Math.round((cohortesAnalytics.semana.length / totalAnalytics) * 100) : 0}%
                  </span>
                </div>
                <span className="text-3xl font-black text-amber-950 block my-1">
                  {cohortesAnalytics.semana.length}
                </span>
                <span className="text-xs font-bold text-amber-900 block">
                  De 2 a 7 Días (Esta Semana)
                </span>
                <p className="text-[11px] text-amber-700 mt-1">
                  Prospectos en seguimiento activo.
                </p>
                <span className="text-[10px] font-bold text-amber-800 mt-3 pt-2 border-t border-amber-200/60 block group-hover:underline">
                  Ver en tabla ➔
                </span>
              </div>

              {/* Cohorte 3: 8 a 30 Días */}
              <div 
                onClick={() => {
                  setAgeFilter('mes');
                  setActiveSubTab('registrados');
                }}
                className="p-4 rounded-2xl bg-blue-50/60 border border-blue-300/80 hover:border-blue-400 transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-blue-500 text-white uppercase tracking-wider flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    En Maduración
                  </span>
                  <span className="text-xs font-bold text-blue-800">
                    {totalAnalytics > 0 ? Math.round((cohortesAnalytics.mes.length / totalAnalytics) * 100) : 0}%
                  </span>
                </div>
                <span className="text-3xl font-black text-blue-950 block my-1">
                  {cohortesAnalytics.mes.length}
                </span>
                <span className="text-xs font-bold text-blue-900 block">
                  De 8 a 30 Días (Este Mes)
                </span>
                <p className="text-[11px] text-blue-700 mt-1">
                  Requieren re-contacto o nueva propuesta.
                </p>
                <span className="text-[10px] font-bold text-blue-800 mt-3 pt-2 border-t border-blue-200/60 block group-hover:underline">
                  Ver en tabla ➔
                </span>
              </div>

              {/* Cohorte 4: +30 Días */}
              <div 
                onClick={() => {
                  setAgeFilter('antiguo');
                  setActiveSubTab('registrados');
                }}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-300/80 hover:border-slate-400 transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-500 text-white uppercase tracking-wider">
                    Históricos
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    {totalAnalytics > 0 ? Math.round((cohortesAnalytics.antiguo.length / totalAnalytics) * 100) : 0}%
                  </span>
                </div>
                <span className="text-3xl font-black text-slate-900 block my-1">
                  {cohortesAnalytics.antiguo.length}
                </span>
                <span className="text-xs font-bold text-slate-800 block">
                  Más de 30 Días (+1 Mes)
                </span>
                <p className="text-[11px] text-slate-500 mt-1">
                  Base acumulada para campañas masivas.
                </p>
                <span className="text-[10px] font-bold text-slate-700 mt-3 pt-2 border-t border-slate-200 block group-hover:underline">
                  Ver en tabla ➔
                </span>
              </div>

            </div>
          </div>

          {/* SECCIÓN 3: EMBUDO DE CONVERSIÓN COMERCIAL (PIPELINE FUNNEL) */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-4">
              <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>📊 Embudo de Conversión Comercial (Pipeline)</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Seguimiento de la progresión del lead desde su registro hasta la negociación.
              </p>
            </div>

            <div className="space-y-3">
              {/* Paso 1: Registrados Totales */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-slate-800">1. Registrados en Formulario / Webinar</span>
                  <span className="text-slate-900 font-mono">{totalAnalytics} (100%)</span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="bg-slate-800 h-full rounded-full w-full"></div>
                </div>
              </div>

              {/* Paso 2: Por Contactar (Pendientes) */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-amber-800">2. Por Contactar / Pendientes 🟡</span>
                  <span className="text-amber-900 font-mono">
                    {analyticsPendientes} ({totalAnalytics > 0 ? Math.round((analyticsPendientes / totalAnalytics) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="bg-amber-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${totalAnalytics > 0 ? (analyticsPendientes / totalAnalytics) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Paso 3: Atendidos / Contactados */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-emerald-800">3. Contactados / Atendidos 🟢</span>
                  <span className="text-emerald-900 font-mono">
                    {analyticsAtendidos} ({totalAnalytics > 0 ? Math.round((analyticsAtendidos / totalAnalytics) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full transition-all duration-700"
                    style={{ width: `${totalAnalytics > 0 ? (analyticsAtendidos / totalAnalytics) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Paso 4: En Negociación Comercial */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-indigo-800">4. En Negociación Comercial 🔵</span>
                  <span className="text-indigo-900 font-mono">
                    {analyticsEnProceso} ({totalAnalytics > 0 ? Math.round((analyticsEnProceso / totalAnalytics) * 100) : 0}%)
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-700"
                    style={{ width: `${totalAnalytics > 0 ? (analyticsEnProceso / totalAnalytics) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>

              {/* Paso 5: Descartados / No Responde */}
              {analyticsDescartados > 0 && (
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-1">
                    <span className="text-slate-500">5. No Responde / Descartados ⚪</span>
                    <span className="text-slate-600 font-mono">
                      {analyticsDescartados} ({totalAnalytics > 0 ? Math.round((analyticsDescartados / totalAnalytics) * 100) : 0}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="bg-slate-400 h-full rounded-full transition-all duration-700"
                      style={{ width: `${totalAnalytics > 0 ? (analyticsDescartados / totalAnalytics) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 4: FUENTES DE CAPTURA, PREFERENCIAS & PAÍSES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            
            {/* 1. Fuentes de Captura */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h5 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span>Top Fuentes & Links</span>
                </h5>
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  {origenesOrdenados.length} canales
                </span>
              </div>

              <div className="space-y-3">
                {origenesOrdenados.slice(0, 5).map(([nombre, count]) => {
                  const pct = totalAnalytics > 0 ? Math.round((count / totalAnalytics) * 100) : 0;
                  return (
                    <div key={nombre} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="truncate max-w-[180px] text-slate-800" title={nombre}>
                          {nombre}
                        </span>
                        <span className="font-mono text-slate-900 font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="bg-blue-600 h-full rounded-full" 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Interés de Inversión */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h5 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Briefcase className="w-4 h-4 text-purple-600" />
                  <span>Preferencia de Inversión</span>
                </h5>
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  {interesesOrdenados.length} tipos
                </span>
              </div>

              <div className="space-y-3">
                {interesesOrdenados.slice(0, 5).map(([interes, count]) => {
                  const pct = totalAnalytics > 0 ? Math.round((count / totalAnalytics) * 100) : 0;
                  return (
                    <div key={interes} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="truncate max-w-[180px] text-slate-800">
                          {interes}
                        </span>
                        <span className="font-mono text-slate-900 font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="bg-purple-600 h-full rounded-full" 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Distribución por Países */}
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h5 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-emerald-600" />
                  <span>Alcance Internacional</span>
                </h5>
                <span className="text-[11px] font-bold text-slate-400 font-mono">
                  {paisesOrdenados.length} países
                </span>
              </div>

              <div className="space-y-3">
                {paisesOrdenados.slice(0, 5).map(([pais, count]) => {
                  const pct = totalAnalytics > 0 ? Math.round((count / totalAnalytics) * 100) : 0;
                  return (
                    <div key={pais} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="truncate max-w-[180px] text-slate-800">
                          {pais}
                        </span>
                        <span className="font-mono text-slate-900 font-bold">{count} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full" 
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* SECCIÓN 5: RECOMENDACIONES EJECUTIVAS AUTOMATIZADAS (AI INSIGHTS) */}
          <div className="bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 border border-amber-200/80 rounded-3xl p-6 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-amber-900 font-black text-sm">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <span>Diagnóstico Inteligente & Recomendaciones de Acción</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="p-3.5 rounded-2xl bg-white border border-amber-200/60 shadow-xs">
                <span className="text-[10px] font-extrabold uppercase text-rose-700 block mb-1">
                  🔥 Oportunidad Inmediata
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {cohortesAnalytics.hoy.length > 0 
                    ? `Tienes ${cohortesAnalytics.hoy.length} contacto(s) caliente(s) registrados hoy. Escríbeles por WhatsApp antes de que pasen 24h para maximizar la tasa de respuesta.` 
                    : 'Excelente: tu bandeja de prospectos del día se encuentra al día.'}
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-amber-200/60 shadow-xs">
                <span className="text-[10px] font-extrabold uppercase text-emerald-700 block mb-1">
                  📱 Cobertura WhatsApp
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  El <strong>{pctAnalyticsCelular}%</strong> de tus leads dejaron su número celular. Hay {analyticsPendientesWsp.length} contactos telefónicos listos para apertura comercial.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-white border border-amber-200/60 shadow-xs">
                <span className="text-[10px] font-extrabold uppercase text-indigo-700 block mb-1">
                  📈 Producto Líder
                </span>
                <p className="text-xs text-slate-700 leading-relaxed font-medium">
                  {interesesOrdenados.length > 0 && interesesOrdenados[0][0] !== 'Sin especificar'
                    ? `El interés más demandado es "${interesesOrdenados[0][0]}" con ${interesesOrdenados[0][1]} interesados (${totalAnalytics > 0 ? Math.round((interesesOrdenados[0][1]/totalAnalytics)*100) : 0}%).`
                    : 'Promueve campos de interés patrimonial en tus formularios para segmentar mejor tus ofertas.'}
                </p>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ================= SUBTAB 4: TENDENCIAS, RE-CONTACTO & MARKETING INTELLIGENCE ================= */}
      {activeSubTab === 'tendencias' && (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* Hero Header Ejecutivo de Marketing */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-stone-900 to-amber-950 text-white p-6 sm:p-8 border border-amber-900/40 shadow-xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-1/4 w-72 h-72 bg-orange-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-widest shadow-xs">
                    Marketing & Growth Hub
                  </span>
                  <span className="text-amber-200/70 text-xs font-mono">
                    Cadencias Automatizadas
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                  Tendencias, Horarios & Estrategia de Re-contacto
                </h3>
                <p className="text-xs sm:text-sm text-amber-100/80 max-w-2xl mt-1 leading-relaxed">
                  Identifica a qué clientes toca re-escribirles hoy, detecta los mejores horarios para pautar en redes y activa audiencias segmentadas.
                </p>
              </div>

              {/* Indicadores Clave de Re-contacto */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="bg-slate-900/80 border border-amber-500/30 px-3.5 py-2 rounded-2xl text-center backdrop-blur-md">
                  <span className="text-[10px] uppercase font-black text-amber-300 block">Cola de Re-contacto</span>
                  <span className="text-2xl font-black text-white">{recontactQueue.length}</span>
                </div>
                <div className="bg-slate-900/80 border border-rose-500/30 px-3.5 py-2 rounded-2xl text-center backdrop-blur-md">
                  <span className="text-[10px] uppercase font-black text-rose-300 block">Re-contacto 1 (Día 2-4)</span>
                  <span className="text-2xl font-black text-rose-400">{recontactCadencia1.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ================= MÓDULO 1: COLA DE RE-CONTACTO INTELIGENTE ================= */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
                  <h4 className="text-base font-black text-slate-900 tracking-tight">
                    🔥 Próximos a Re-contactar (Cadencia de Seguimiento Activo)
                  </h4>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Prospectos organizados por tiempo transcurrido desde su registro o última interacción con mensajes personalizados listos para WhatsApp.
                </p>
              </div>

              {/* Selector de Filtro de Cadencia */}
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto flex-wrap">
                <button
                  onClick={() => setCadenceFilter('todos')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cadenceFilter === 'todos'
                      ? 'bg-white text-slate-900 shadow-xs font-black'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos ({recontactQueue.length})
                </button>
                <button
                  onClick={() => setCadenceFilter('urgente_dia2')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cadenceFilter === 'urgente_dia2'
                      ? 'bg-rose-500 text-white shadow-xs font-black'
                      : 'text-rose-700 hover:text-rose-900'
                  }`}
                >
                  🔥 Día 2-4 ({recontactCadencia1.length})
                </button>
                <button
                  onClick={() => setCadenceFilter('negociacion_dia5')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cadenceFilter === 'negociacion_dia5'
                      ? 'bg-amber-500 text-white shadow-xs font-black'
                      : 'text-amber-700 hover:text-amber-900'
                  }`}
                >
                  ⚡ Día 5-9 ({recontactCadencia2.length})
                </button>
                <button
                  onClick={() => setCadenceFilter('reactivacion_dia15')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    cadenceFilter === 'reactivacion_dia15'
                      ? 'bg-blue-600 text-white shadow-xs font-black'
                      : 'text-blue-700 hover:text-blue-900'
                  }`}
                >
                  🔄 +15 Días ({recontactCadencia3.length})
                </button>
              </div>
            </div>

            {/* Lista de Prospectos en Cola de Re-contacto */}
            {filteredRecontactQueue.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-slate-100">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h5 className="text-sm font-bold text-slate-800">¡Bandeja de Re-contacto al día!</h5>
                <p className="text-xs text-slate-400 mt-0.5">
                  No hay prospectos pendientes que cumplan con la cadencia de seguimiento seleccionada.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredRecontactQueue.map(({ asistente: a, recontact }) => {
                  const cleanPhone = (a.celular || '').replace(/[^0-9]/g, '');
                  const hasPhone = cleanPhone.length >= 7;

                  return (
                    <div 
                      key={a.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200/90 hover:border-amber-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between gap-3 group"
                    >
                      <div>
                        {/* Header de la Tarjeta */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 text-slate-800 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                              {a.nombre ? a.nombre.charAt(0) : 'U'}
                            </div>
                            <div>
                              <h5 className="text-xs font-black text-slate-900 group-hover:text-amber-950 transition-colors">
                                {a.nombre}
                              </h5>
                              <span className="text-[10px] text-slate-500 block">
                                {a.evento_nombre || a.evento_id === 'dr-finanzas-bio' ? '✨ Bio Link TikTok' : 'Formulario Web'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full border ${recontact.badgeClass}`}>
                              {recontact.stageTitle}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              Hace {recontact.daysPassed} días
                            </span>
                          </div>
                        </div>

                        {/* Datos de Contacto e Interés */}
                        <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-100 text-xs flex-wrap">
                          {a.interes_inversion && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">
                              <Briefcase className="w-3 h-3" />
                              {a.interes_inversion}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
                            <Globe className="w-3 h-3 text-slate-400" />
                            {a.pais || 'Perú'}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {a.correo}
                          </span>
                        </div>

                        {/* Caja con Mensaje Sugerido para WhatsApp */}
                        <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-700 leading-relaxed relative">
                          <span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block mb-1">
                            💬 Mensaje de Re-contacto Sugerido:
                          </span>
                          <p className="italic">
                            "{recontact.suggestedMessage}"
                          </p>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex items-center gap-2 pt-2 border-t border-slate-100 flex-wrap">
                        {hasPhone ? (
                          <button
                            onClick={() => handleRecontactWhatsapp(a, recontact.suggestedMessage)}
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-98"
                            title="Abrir WhatsApp con el mensaje personalizado y registrar fecha de atención"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span>Enviar WhatsApp de Seguimiento ({a.celular})</span>
                          </button>
                        ) : (
                          <a
                            href={`mailto:${a.correo}?subject=Seguimiento%20Afinitive%20Wealth%20Management&body=${encodeURIComponent(recontact.suggestedMessage)}`}
                            className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-all text-center"
                          >
                            <Mail className="w-4 h-4" />
                            <span>Enviar Correo de Seguimiento</span>
                          </a>
                        )}

                        <select
                          value={a.estado || 'pendiente'}
                          onChange={(e) => handleUpdateAttendeeStatus(a.id, e.target.value)}
                          className="bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl py-1.5 px-2.5 text-xs text-slate-800 font-bold focus:outline-none cursor-pointer"
                        >
                          <option value="pendiente">🟡 Pendiente</option>
                          <option value="atendido">🟢 Atendido</option>
                          <option value="en_proceso">🔵 En Proceso</option>
                          <option value="no_responde">⚪ Descartado</option>
                        </select>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ================= MÓDULO 2: TENDENCIA TEMPORAL DE CAPTACIÓN (TIMELINE DIARIO) ================= */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  <span>Línea de Tiempo de Captación & Ritmo de Crecimiento</span>
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Evolución diaria de prospectos captados en los formularios y webinars.
                </p>
              </div>

              {/* Selector de Rango de Días */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                  <button
                    onClick={() => setTrendDaysRange(7)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      trendDaysRange === 7 ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'
                    }`}
                  >
                    7 Días
                  </button>
                  <button
                    onClick={() => setTrendDaysRange(14)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      trendDaysRange === 14 ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'
                    }`}
                  >
                    14 Días
                  </button>
                  <button
                    onClick={() => setTrendDaysRange(30)}
                    className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                      trendDaysRange === 30 ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600'
                    }`}
                  >
                    30 Días
                  </button>
                </div>
              </div>
            </div>

            {/* Resumen de Ritmo */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-black uppercase text-slate-500 block">Total en Rango:</span>
                <span className="text-2xl font-black text-slate-900">{totalLeadsInTrend} leads</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-200/80">
                <span className="text-[10px] font-black uppercase text-indigo-700 block">Ritmo Promedio:</span>
                <span className="text-2xl font-black text-indigo-950">{avgLeadsPerDay} leads / día</span>
              </div>
              <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80">
                <span className="text-[10px] font-black uppercase text-emerald-700 block">Mayor Pico Diario:</span>
                <span className="text-2xl font-black text-emerald-950">{maxTimelineTotal} registros</span>
              </div>
            </div>

            {/* Gráfico de Barras por Día */}
            <div className="space-y-2 pt-2">
              <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5 items-end h-40 pt-6 pb-2 border-b border-slate-200">
                {timelineTrendData.map((d) => {
                  const heightPct = maxTimelineTotal > 0 ? Math.max(8, Math.round((d.total / maxTimelineTotal) * 100)) : 8;
                  const isToday = d.dateIso === new Date().toISOString().slice(0, 10);

                  return (
                    <div key={d.dateIso} className="flex flex-col items-center h-full justify-end group relative">
                      {/* Tooltip con conteo */}
                      <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[10px] font-bold px-2 py-0.5 rounded-md pointer-events-none whitespace-nowrap z-10 shadow-md">
                        {d.total} leads ({d.conWsp} wsp)
                      </div>

                      {/* Barra de progreso */}
                      <div 
                        className={`w-full max-w-[28px] rounded-t-lg transition-all duration-500 relative overflow-hidden flex flex-col justify-end ${
                          isToday 
                            ? 'bg-rose-500 group-hover:bg-rose-600' 
                            : d.total > 0 
                            ? 'bg-indigo-600 group-hover:bg-indigo-700' 
                            : 'bg-slate-200'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      >
                        {d.conWsp > 0 && d.total > 0 && (
                          <div 
                            className="w-full bg-emerald-400/80" 
                            style={{ height: `${(d.conWsp / d.total) * 100}%` }}
                            title={`Con WhatsApp: ${d.conWsp}`}
                          ></div>
                        )}
                      </div>

                      {/* Etiqueta del día */}
                      <span className={`text-[9px] mt-1 font-mono truncate max-w-full ${isToday ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                        {d.dayLabel.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 flex-wrap gap-2 font-medium">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span> Total Registros</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Con WhatsApp</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Hoy</span>
                </div>
                <span>Mostrando últimos {trendDaysRange} días</span>
              </div>
            </div>

          </div>

          {/* ================= MÓDULO 3: HEATMAP & MARKETING TIMING (CUÁNDO PAUTAR/PUBLICAR) ================= */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Días de la Semana con Mayor Conversión */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h5 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-amber-600" />
                    <span>Días de Mayor Conversión (Semanal)</span>
                  </h5>
                  <p className="text-[11px] text-slate-400">
                    Día con más registros: <strong>{topDayOfWeek ? topDayOfWeek.name : 'N/A'}</strong>
                  </p>
                </div>
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-amber-50 text-amber-800 rounded-full border border-amber-200">
                  Día de Oro
                </span>
              </div>

              <div className="space-y-2.5">
                {leadsByDayOfWeek.map((day) => {
                  const isTop = topDayOfWeek && day.name === topDayOfWeek.name && day.count > 0;
                  return (
                    <div key={day.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className={`flex items-center gap-1.5 ${isTop ? 'text-amber-950 font-black' : 'text-slate-700'}`}>
                          {isTop && <span>👑</span>}
                          {day.name}
                        </span>
                        <span className="font-mono text-slate-900 font-bold">{day.count} leads ({day.pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${isTop ? 'bg-amber-500' : 'bg-slate-400'}`}
                          style={{ width: `${totalRegistradosCount > 0 ? (day.count / totalRegistradosCount) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Franjas Horarias de Mayor Conversión */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h5 className="text-sm font-black text-slate-900 tracking-tight flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-indigo-600" />
                      <span>Franjas Horarias de Captación</span>
                    </h5>
                    <p className="text-[11px] text-slate-400">
                      Horario más activo: <strong>{topFranja ? topFranja.name : 'N/A'}</strong>
                    </p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-indigo-50 text-indigo-800 rounded-full border border-indigo-200">
                    Hora Pico
                  </span>
                </div>

                <div className="space-y-3 mt-3">
                  {franjasHorarias.map((franja) => {
                    const pct = totalRegistradosCount > 0 ? Math.round((franja.count / totalRegistradosCount) * 100) : 0;
                    const isTop = topFranja && franja.id === topFranja.id && franja.count > 0;

                    return (
                      <div key={franja.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className={isTop ? 'text-indigo-950 font-black' : 'text-slate-700'}>
                            {franja.name}
                          </span>
                          <span className="font-mono text-slate-900 font-bold">{franja.count} leads ({pct}%)</span>
                        </div>
                        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${isTop ? 'bg-indigo-600' : 'bg-slate-300'}`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recomendación de Pauta de Marketing */}
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/80 text-xs text-indigo-950 leading-relaxed font-medium">
                💡 <strong>Consejo para el Equipo de Marketing:</strong> El mayor volumen de registros ingresa los días <strong>{topDayOfWeek?.name}</strong> en la franja <strong>{topFranja?.name}</strong>. Recomendamos programar tus videos de TikTok y pauta publicitaria en Meta Ads 1 hora antes de este pico.
              </div>
            </div>

          </div>

          {/* ================= MÓDULO 4: AUDIENCE BUILDER & SEGMENTACIÓN PARA MARKETING ================= */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <span>Segmentos Estratégicos de Audiencia para Campañas</span>
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Bases de datos segmentadas listas para descargar y cargar en campañas de WhatsApp masivo, email marketing o re-marketing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Segmento 1: VIP WhatsApp */}
              <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    High-Ticket Cierre
                  </span>
                  <span className="text-2xl font-black text-emerald-950 block mt-2">
                    {segmentoVip.length}
                  </span>
                  <h6 className="text-xs font-bold text-emerald-900 mt-0.5">
                    Audiencia VIP con WhatsApp
                  </h6>
                  <p className="text-[11px] text-emerald-700/80 mt-1">
                    Prospectos con celular válido e interés de inversión definido.
                  </p>
                </div>
                <button
                  onClick={() => handleExportCsv(segmentoVip, 'audiencia_vip_whatsapp')}
                  disabled={!segmentoVip.length}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV VIP</span>
                </button>
              </div>

              {/* Segmento 2: Email Nurturing */}
              <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-blue-800 bg-blue-100 px-2 py-0.5 rounded-full">
                    Email Marketing
                  </span>
                  <span className="text-2xl font-black text-blue-950 block mt-2">
                    {segmentoEmail.length}
                  </span>
                  <h6 className="text-xs font-bold text-blue-900 mt-0.5">
                    Audiencia Solo Correo
                  </h6>
                  <p className="text-[11px] text-blue-700/80 mt-1">
                    Base para secuencias de correo y newsletters de valor.
                  </p>
                </div>
                <button
                  onClick={() => handleExportCsv(segmentoEmail, 'audiencia_email_nurturing')}
                  disabled={!segmentoEmail.length}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV Email</span>
                </button>
              </div>

              {/* Segmento 3: Reactivación Masiva */}
              <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-purple-800 bg-purple-100 px-2 py-0.5 rounded-full">
                    Re-engagement
                  </span>
                  <span className="text-2xl font-black text-purple-950 block mt-2">
                    {segmentoReactivacion.length}
                  </span>
                  <h6 className="text-xs font-bold text-purple-900 mt-0.5">
                    Base para Reactivación (+15d)
                  </h6>
                  <p className="text-[11px] text-purple-700/80 mt-1">
                    Prospectos antiguos ideales para invitar a nuevos webinars.
                  </p>
                </div>
                <button
                  onClick={() => handleExportCsv(segmentoReactivacion, 'audiencia_reactivacion')}
                  disabled={!segmentoReactivacion.length}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV Reactivación</span>
                </button>
              </div>

              {/* Segmento 4: En Negociación */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200 flex flex-col justify-between gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    Pipeline Caliente
                  </span>
                  <span className="text-2xl font-black text-amber-950 block mt-2">
                    {segmentoNegociacion.length}
                  </span>
                  <h6 className="text-xs font-bold text-amber-900 mt-0.5">
                    Prospectos en Negociación
                  </h6>
                  <p className="text-[11px] text-amber-700/80 mt-1">
                    Prospectos en fase avanzada pendientes de llamada de cierre.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setStatusFilter('en_proceso');
                    setActiveSubTab('registrados');
                  }}
                  className="w-full py-1.5 px-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span>Ver en Tabla</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ================= SUBTAB 3: LINK IN BIO DR. FINANZAS ================= */}
      {activeSubTab === 'biolink' && (
        <div className="space-y-5 animate-in fade-in duration-200">
          
          {/* Tarjeta Principal de Dr. Finanzas */}
          <div className="bg-gradient-to-r from-amber-50/80 via-white to-stone-50 border-2 border-amber-800/25 rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden p-1 bg-gradient-to-tr from-[#8B5A2B] via-[#C9A84C] to-[#5c3a1e] shrink-0 shadow-md">
                <img 
                  src="/ricardo_bertalmio.jpg" 
                  alt="Dr. Finanzas" 
                  className="w-full h-full object-cover rounded-full bg-white"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-xl font-extrabold text-stone-900 tracking-tight font-serif">
                    Dr. Finanzas — Link in Bio Oficial
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-[#8B5A2B] text-[10px] font-extrabold tracking-wide uppercase border border-amber-600/20">
                    TikTok & Redes
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-1 max-w-xl leading-relaxed">
                  Página optimizada para dispositivos móviles con 7 accesos oficiales (Formulario de captación, Web, Facebook, Instagram, WhatsApp, YouTube y LinkedIn).
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs font-mono text-amber-950 font-medium flex-wrap">
                  <span className="text-stone-400">Enlace Público:</span>
                  <code className="bg-amber-100/70 px-2.5 py-0.5 rounded-md border border-amber-300/60 text-stone-900 font-bold">
                    {getBioLinkUrl()}
                  </code>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap">
              <button
                onClick={handleOpenBioConfig}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <Edit3 className="w-4 h-4 text-amber-800" />
                Editar Botones & Links
              </button>

              <button
                onClick={handleCopyBioLink}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  copiedBio
                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                    : 'bg-[#8B5A2B] hover:bg-[#724820] text-white shadow-amber-950/10 active:scale-95'
                }`}
              >
                {copiedBio ? (
                  <>
                    <Check className="w-4 h-4" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    Copiar Link TikTok
                  </>
                )}
              </button>

              <a
                href={getBioLinkUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-stone-800 border border-slate-300 transition-all cursor-pointer shadow-xs"
              >
                <Eye className="w-4 h-4 text-stone-600" />
                Ver en Vivo
              </a>
            </div>
          </div>

          {/* Métricas y Estado del Bio Link */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Leads Capturados vía Bio Link
                </span>
                <span className="text-2xl font-bold text-stone-900">
                  {allAttendees.filter(a => a.evento_id === 'dr-finanzas-bio' || a.persona_contacto?.includes('Bio Link')).length}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <Sparkles className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Botones Visibles
                </span>
                <span className="text-2xl font-bold text-blue-900">
                  {bioButtonsConfig.filter(b => b.enabled !== false).length} de {bioButtonsConfig.length}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                <Globe className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Estado del Enlace
                </span>
                <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Activo en Producción
                </span>
              </div>
            </div>
          </div>

          {/* Lista de Botones Actuales y Accesos Directos */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Estructura de Botones Configurada
                </h4>
                <p className="text-xs text-slate-500">
                  Esta es la lista de botones que se muestran en <b>{getBioLinkUrl()}</b>. Puedes editar sus textos y enlaces en cualquier momento.
                </p>
              </div>
              <button
                onClick={handleOpenBioConfig}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                Editar Botones
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {bioButtonsConfig.map((btn, idx) => (
                <div 
                  key={btn.id}
                  className={`p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all ${
                    btn.enabled !== false 
                      ? 'bg-stone-50/50 border-stone-200 hover:border-amber-300' 
                      : 'bg-stone-50/30 border-stone-200/50 opacity-50'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-amber-100 text-[#8B5A2B] text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-stone-900 truncate">
                        {btn.title}
                      </h5>
                      {btn.subtitle && (
                        <p className="text-[11px] text-stone-500 truncate">
                          {btn.subtitle}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-stone-500 font-mono truncate">
                        <span className="text-stone-400">Destino:</span>
                        <span className="text-amber-800 font-medium truncate">
                          {btn.id === 'registro' ? 'Formulario Captura Modal (Supabase)' : (btn.url || 'Sin URL')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                    btn.enabled !== false 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                      : 'bg-stone-200 text-stone-600'
                  }`}>
                    {btn.enabled !== false ? 'Activo' : 'Oculto'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Guía rápida para TikTok / Instagram */}
          <div className="bg-gradient-to-r from-blue-50/60 to-indigo-50/40 border border-blue-200/70 rounded-2xl p-4 sm:p-5 text-xs text-slate-700 space-y-2">
            <h5 className="font-bold text-blue-900 flex items-center gap-2">
              <Globe className="w-4 h-4 text-blue-600" />
              ¿Cómo poner este enlace en TikTok e Instagram?
            </h5>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1">
              <li>Haz clic en el botón <b>"Copiar Link TikTok"</b> de arriba para copiar <code>https://eventos.afinitive.com.pe/bio</code>.</li>
              <li>Abre TikTok o Instagram en tu celular y entra a tu perfil.</li>
              <li>Toca en <b>"Editar perfil"</b>.</li>
              <li>Pega el enlace en el campo <b>"Sitio web"</b> (o "Enlaces") y guarda los cambios.</li>
            </ol>
          </div>

        </div>
      )}

      {/* ================= MODAL: CREATE / EDIT EVENT (Fondo Blanco Limpio) ================= */}
      {isEditModalOpen && editingEvento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                {editingEvento.tipo === 'lead_form' ? (
                  <FileText className="w-5 h-5 text-blue-600" />
                ) : (
                  <Building2 className="w-5 h-5 text-amber-600" />
                )}
                <h3 className="text-lg font-bold text-slate-900">
                  {editingEvento.id && eventos.some(ev => ev.id === editingEvento.id) 
                    ? 'Editar Enlace' 
                    : editingEvento.tipo === 'lead_form' 
                    ? 'Crear Formulario de Captura TikTok' 
                    : 'Crear Nuevo Webinar'}
                </h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvento} className="p-6 space-y-4">
              
              {/* Selector de Tipo de Evento / Enlace */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tipo de Enlace / Landing <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingEvento({ ...editingEvento, tipo: 'webinar' })}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      editingEvento.tipo !== 'lead_form'
                        ? 'border-amber-400 bg-amber-50/70 text-slate-900 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1 text-amber-900">
                      <Video className="w-4 h-4 text-amber-600" />
                      Webinar / Conferencia
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Con fecha, hora y enlace de videollamada Zoom/Meet.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingEvento({ ...editingEvento, tipo: 'lead_form' })}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                      editingEvento.tipo === 'lead_form'
                        ? 'border-blue-400 bg-blue-50/70 text-slate-900 shadow-2xs'
                        : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1 text-blue-900">
                      <FileText className="w-4 h-4 text-blue-600" />
                      Formulario TikTok / Bio
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug">
                      Fondo blanco, estilo Google, sin fecha ni link de videollamada.
                    </p>
                  </button>
                </div>
              </div>

              {/* Event Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Título del {editingEvento.tipo === 'lead_form' ? 'Formulario' : 'Evento'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingEvento.nombre || ''}
                  onChange={(e) => setEditingEvento({ ...editingEvento, nombre: e.target.value })}
                  placeholder={editingEvento.tipo === 'lead_form' ? 'Ej: Registro Exclusivo - Asesoría Patrimonial' : 'Ej: 🏙️ THE NEW YORK TOWER 🏙️'}
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              {/* Slug / ID */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ID Personalizado (URL Slug)
                </label>
                <input
                  type="text"
                  value={editingEvento.id || ''}
                  onChange={(e) => setEditingEvento({ ...editingEvento, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })}
                  placeholder="ej: registro-tiktok-afinitive (se autogenera si se deja vacío)"
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                />
                <small className="text-[11px] text-slate-500">
                  Aparecerá en la URL: <code>/evento?id=<b>{editingEvento.id || 'slug-automatico'}</b></code>
                </small>
              </div>

              {/* Campos condicionales para Webinars */}
              {editingEvento.tipo !== 'lead_form' && (
                <>
                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Fecha y Hora de Inicio (Hora Perú UTC-5) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={editingEvento.fecha_inicio || ''}
                      onChange={(e) => setEditingEvento({ ...editingEvento, fecha_inicio: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {/* Configuración de Sala de Videollamada / Google Meet */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                          <Video className="w-4 h-4" />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer">
                            <span>Crear sala de Google Meet</span>
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full">Por defecto</span>
                          </label>
                          <p className="text-[11px] text-slate-500">Crea el link de Google Meet sincronizado automáticamente con Google Calendar</p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={editingEvento.generar_meet !== false}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setEditingEvento({
                              ...editingEvento,
                              generar_meet: checked,
                              link_reunion: checked ? '' : (editingEvento.link_reunion || '')
                            });
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    {editingEvento.generar_meet !== false ? (
                      <div className="bg-blue-50/80 border border-blue-200/80 rounded-lg p-2.5 flex items-start gap-2 text-xs text-blue-900 font-medium">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>Google Meet creará la sala de videollamada de forma automática al confirmar el agendamiento y la incluirá en la invitación oficial.</span>
                      </div>
                    ) : (
                      <div className="space-y-1.5 pt-1 border-t border-slate-200">
                        <label className="block text-xs font-bold text-slate-700">
                          Enlace manual de Reunión (Zoom, Teams u otro) <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="url"
                          required={editingEvento.generar_meet === false}
                          value={editingEvento.link_reunion || ''}
                          onChange={(e) => setEditingEvento({ ...editingEvento, link_reunion: e.target.value })}
                          placeholder="https://us06web.zoom.us/j/1234567890 o https://teams.microsoft.com/..."
                          className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                        />
                        <p className="text-[11px] text-slate-400">Pega aquí el enlace de la sala si prefieres utilizar otra plataforma distinta a Google Meet.</p>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Image Upload & Storage Section */}
              <div className="space-y-3 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-blue-600" />
                    Banner / Imagen Opcional (Supabase Storage)
                  </label>
                  {editingEvento.imagen_url && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                      ✓ Imagen Cargada
                    </span>
                  )}
                </div>

                {uploadError && (
                  <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    {uploadError}
                  </div>
                )}

                {/* Botón de Subida */}
                <div className="flex flex-col gap-2">
                  <label className={`w-full border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    uploadingImage 
                      ? 'border-blue-400 bg-blue-50/50' 
                      : 'border-slate-300 hover:border-blue-500 bg-white shadow-2xs'
                  }`}>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/webp, image/jpg"
                      disabled={uploadingImage}
                      onChange={handleUploadImageFile}
                      className="hidden"
                    />
                    {uploadingImage ? (
                      <div className="flex flex-col items-center gap-2 py-1">
                        <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
                        <span className="text-xs text-blue-700 font-bold">Subiendo a Supabase Storage...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-1">
                        <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-0.5">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-xs sm:text-sm text-slate-800 font-bold block">
                          📁 Haz clic para subir imagen o flyer
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Formatos aceptados: JPG, PNG, WEBP (Hasta 10MB)
                        </span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Preview */}
                {editingEvento.imagen_url && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-white p-3 flex items-center gap-3">
                    <img 
                      src={editingEvento.imagen_url} 
                      alt="Preview" 
                      className="w-20 h-14 object-cover rounded-lg flex-shrink-0 border border-slate-200" 
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-bold text-slate-700 block truncate">
                        Imagen vinculada:
                      </span>
                      <p className="text-[11px] text-slate-500 truncate font-mono">
                        {editingEvento.imagen_url}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingEvento({ ...editingEvento, imagen_url: '' })}
                      className="p-2 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Descripción / Instrucciones del Formulario
                </label>
                <textarea
                  rows={4}
                  value={editingEvento.descripcion || ''}
                  onChange={(e) => setEditingEvento({ ...editingEvento, descripcion: e.target.value })}
                  placeholder="Describe la propuesta de valor o instrucciones..."
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 leading-relaxed"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="activo-check"
                  checked={editingEvento.activo !== false}
                  onChange={(e) => setEditingEvento({ ...editingEvento, activo: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="activo-check" className="text-xs text-slate-700 font-semibold cursor-pointer">
                  Enlace activo y habilitado para recibir registros
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                >
                  Guardar Enlace
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL: ATTENDEES LIST (Fondo Blanco) ================= */}
      {isAttendeesModalOpen && selectedEventoAttendees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-slate-900">
                    Registrados en: {selectedEventoAttendees.nombre}
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Total inscritos en este enlace: <span className="text-blue-600 font-bold">{attendeesList.length}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportCsv(attendeesList, `asistentes_${selectedEventoAttendees.id}`)}
                  disabled={!attendeesList.length}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Exportar lista a CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  Exportar CSV
                </button>
                <button 
                  onClick={() => setIsAttendeesModalOpen(false)}
                  className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter in Modal */}
            <div className="p-4 border-b border-slate-100 bg-slate-50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre, correo, teléfono o país..."
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            {/* Table Area */}
            <div className="p-4 flex-1 overflow-y-auto">
              {loadingAttendees ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Cargando asistentes...
                </div>
              ) : attendeesList.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  Aún no hay personas registradas a través de este enlace.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider bg-slate-50">
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3">Nombre</th>
                      <th className="py-2.5 px-3">WhatsApp / Celular</th>
                      <th className="py-2.5 px-3">Correo</th>
                      <th className="py-2.5 px-3">País</th>
                      <th className="py-2.5 px-3">Interés</th>
                      <th className="py-2.5 px-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {attendeesList
                      .filter(a =>
                        a.nombre.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                        a.correo.toLowerCase().includes(attendeeSearch.toLowerCase()) ||
                        a.celular.includes(attendeeSearch) ||
                        (a.pais && a.pais.toLowerCase().includes(attendeeSearch.toLowerCase()))
                      )
                      .map((a) => {
                        let formattedCreatedAt = a.created_at;
                        try {
                          formattedCreatedAt = new Date(a.created_at).toLocaleString('es-PE', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          });
                        } catch {}

                        const currentStatus = a.estado || 'pendiente';
                        const isUpdating = updatingStatusId === a.id;

                        return (
                          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                            {/* Estado */}
                            <td className="py-2.5 px-3">
                              <select
                                value={currentStatus}
                                disabled={isUpdating}
                                onChange={(e) => handleUpdateAttendeeStatus(a.id, e.target.value)}
                                className={`px-2 py-1 rounded-full text-[11px] font-bold border transition-all cursor-pointer focus:outline-none ${
                                  currentStatus === 'pendiente'
                                    ? 'bg-amber-100/80 text-amber-900 border-amber-300'
                                    : currentStatus === 'atendido' || currentStatus === 'contactado'
                                    ? 'bg-emerald-100/80 text-emerald-900 border-emerald-300'
                                    : currentStatus === 'en_proceso'
                                    ? 'bg-blue-100/80 text-blue-900 border-blue-300'
                                    : 'bg-slate-100 text-slate-700 border-slate-300'
                                }`}
                              >
                                <option value="pendiente">🟡 Pendiente</option>
                                <option value="atendido">🟢 Atendido</option>
                                <option value="en_proceso">🔵 En Proceso</option>
                                <option value="no_responde">⚪ Descartado</option>
                              </select>
                            </td>

                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {a.nombre}
                            </td>
                            <td className="py-3 px-3">
                              <button 
                                type="button"
                                onClick={() => handleContactWhatsapp(a)}
                                className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 cursor-pointer"
                                title="Abrir WhatsApp y marcar como Atendido"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                {a.celular}
                              </button>
                            </td>
                            <td className="py-3 px-3 text-slate-700 font-mono">
                              <a href={`mailto:${a.correo}`} className="text-blue-600 hover:underline">
                                {a.correo}
                              </a>
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {a.pais || 'Perú'}
                            </td>
                            <td className="py-3 px-3">
                              {a.interes_inversion ? (
                                <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200">
                                  {a.interes_inversion}
                                </span>
                              ) : (
                                <span className="text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                              {formattedCreatedAt}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIRM DELETE EVENT (Fondo Blanco) ================= */}
      {deleteModal && deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  Confirmar Eliminación
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  ¿Estás seguro de que deseas eliminar este enlace/evento del sistema?
                </p>
              </div>
            </div>

            <div className="my-5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-slate-700 flex-shrink-0" />
                <span className="text-xs font-bold text-slate-900 line-clamp-1">
                  {deleteModal.nombre}
                </span>
              </div>
              <p className="text-[11px] text-red-600 mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                Esta acción borrará también la lista de inscritos asociados.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-red-600 hover:bg-red-700 shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Enlace</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: CONFIGURAR BOTONES BIO LINK DR. FINANZAS ================= */}
      {isBioConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-stone-200 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl relative overflow-hidden">
            
            {/* Header del Modal */}
            <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-[#8B5A2B] via-[#C9A84C] to-[#5c3a1e] shrink-0">
                  <img src="/ricardo_bertalmio.jpg" alt="Dr. Finanzas" className="w-full h-full object-cover rounded-full bg-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                    Personalizar Botones — Dr. Finanzas Bio Link
                  </h3>
                  <p className="text-xs text-stone-500">
                    Modifica los nombres, subtítulos y enlaces de destino para cada botón de TikTok y redes.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBioConfigModalOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido / Lista de Botones */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>
                  Los cambios se sincronizan en tiempo real para todos los usuarios que visiten <b>https://eventos.afinitive.com.pe/bio</b>.
                </span>
              </div>

              <div className="space-y-3.5">
                {bioButtonsConfig.map((btn, index) => {
                  const isLeadBtn = btn.id === 'registro';

                  return (
                    <div 
                      key={btn.id}
                      className={`p-4 rounded-xl border transition-all ${
                        btn.enabled !== false 
                          ? 'bg-white border-stone-200 shadow-xs' 
                          : 'bg-stone-50/70 border-stone-200/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3 pb-2 border-b border-stone-100">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-100 text-[#8B5A2B] text-xs font-bold flex items-center justify-center">
                            {index + 1}
                          </span>
                          <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
                            {btn.id === 'registro' ? 'Formulario de Captura (Modal)' : `Botón: ${btn.id}`}
                          </span>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-stone-600 select-none">
                          <input
                            type="checkbox"
                            checked={btn.enabled !== false}
                            onChange={(e) => handleUpdateBioButton(btn.id, 'enabled', e.target.checked)}
                            className="rounded border-stone-300 text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                          />
                          <span>Mostrar botón</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Nombre del Botón */}
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Nombre del Botón (Título Principal)
                          </label>
                          <input
                            type="text"
                            value={btn.title}
                            onChange={(e) => handleUpdateBioButton(btn.id, 'title', e.target.value)}
                            placeholder="Ej: Nuestra web"
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white transition-all"
                          />
                        </div>

                        {/* Subtítulo del Botón */}
                        <div>
                          <label className="block text-[11px] font-bold text-stone-700 mb-1">
                            Subtítulo / Descripción Corta
                          </label>
                          <input
                            type="text"
                            value={btn.subtitle || ''}
                            onChange={(e) => handleUpdateBioButton(btn.id, 'subtitle', e.target.value)}
                            placeholder="Ej: Conoce nuestro modelo de inversión"
                            className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white transition-all"
                          />
                        </div>

                        {/* URL o Acción */}
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-stone-700 mb-1 flex items-center justify-between">
                            <span>Enlace de Destino (URL)</span>
                            {isLeadBtn && (
                              <span className="text-[10px] text-amber-700 font-normal">
                                Abre automáticamente el formulario de registro integrado
                              </span>
                            )}
                          </label>
                          {isLeadBtn ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={btn.url || ''}
                                onChange={(e) => handleUpdateBioButton(btn.id, 'url', e.target.value)}
                                placeholder="Por defecto: Abre modal de captura integrado (O ingresa URL externa si deseas redirigir)"
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg px-3 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white transition-all font-mono"
                              />
                            </div>
                          ) : (
                            <div className="relative">
                              <input
                                type="url"
                                value={btn.url || ''}
                                onChange={(e) => handleUpdateBioButton(btn.id, 'url', e.target.value)}
                                placeholder="https://..."
                                className="w-full bg-stone-50 border border-stone-200 rounded-lg pl-3 pr-8 py-1.5 text-xs text-stone-900 focus:outline-none focus:border-amber-600 focus:bg-white transition-all font-mono"
                              />
                              {btn.url && (
                                <a
                                  href={btn.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-amber-700"
                                  title="Probar enlace"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer con Acciones */}
            <div className="px-6 py-3.5 border-t border-stone-100 flex items-center justify-between bg-stone-50/80">
              <button
                type="button"
                onClick={handleResetBioConfig}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-lg hover:bg-stone-200/70 transition-colors cursor-pointer"
                title="Volver a los 7 botones originales"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restablecer originales
              </button>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsBioConfigModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 hover:text-stone-900 rounded-xl bg-stone-200/80 hover:bg-stone-300/80 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={savingBioButtons}
                  onClick={handleSaveBioConfig}
                  className="px-5 py-2 text-xs font-bold text-white rounded-xl bg-[#8B5A2B] hover:bg-[#724820] shadow-xs transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {savingBioButtons ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================= MODAL: AGENDAMIENTO DIRECTO DE CITA 1 A 1 CON GOOGLE MEET ================= */}
      {isScheduleModalOpen && scheduleContact && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in zoom-in-95 duration-200">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold">
                  <Video className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Agendar Cita Directa & Google Meet
                  </h3>
                  <p className="text-xs text-slate-500">
                    Se creará en Google Calendar y se enviará la invitación por correo al cliente.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsScheduleModalOpen(false);
                  setScheduleContact(null);
                }}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleConfirmDirectSchedule} className="space-y-4">
              
              {/* Tarjeta Resumen del Contacto */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Invitado:</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-300">
                    Lead Registrado
                  </span>
                </div>
                <div className="text-sm font-bold text-slate-900">{scheduleContact.nombre}</div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 font-mono">
                  <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-blue-500" /> {scheduleContact.correo}</span>
                  {scheduleContact.celular && (
                    <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3 text-emerald-500" /> {scheduleContact.celular}</span>
                  )}
                </div>
              </div>

              {/* Título de la Reunión */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Asunto / Título de la Reunión <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={scheduleForm.titulo}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, titulo: e.target.value })}
                  placeholder="Ej. Sesión de Asesoría Patrimonial"
                  className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Fecha, Hora y Duración */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Fecha y Hora (Hora Perú) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={scheduleForm.fecha_inicio}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, fecha_inicio: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Duración Estimada
                  </label>
                  <select
                    value={scheduleForm.duracion_minutos}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, duracion_minutos: Number(e.target.value) })}
                    className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600 font-bold"
                  >
                    <option value={30}>⏱️ 30 Minutos</option>
                    <option value={45}>⏱️ 45 Minutos (Recomendado)</option>
                    <option value={60}>⏱️ 60 Minutos</option>
                  </select>
                </div>
              </div>

              {/* Toggle de Google Meet (Activo por defecto) */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="w-4 h-4 text-blue-600" />
                    <div>
                      <span className="text-xs font-bold text-slate-900">Crear enlace de Google Meet</span>
                      <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full">Por defecto</span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleForm.generar_meet}
                      onChange={(e) => setScheduleForm({ ...scheduleForm, generar_meet: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-[11px] text-blue-800">
                  {scheduleForm.generar_meet 
                    ? '✓ Se creará la sala de Google Meet automáticamente y se adjuntará el enlace y botón de Calendar en el correo al cliente.' 
                    : 'ℹ️ No se generará sala de Google Meet (coordinación telefónica o presencial).'}
                </p>
              </div>

              {/* Notas del Asesor / Objetivo */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Notas u Objetivo de la Cita (Opcional)
                </label>
                <textarea
                  rows={2}
                  value={scheduleForm.notas}
                  onChange={(e) => setScheduleForm({ ...scheduleForm, notas: e.target.value })}
                  placeholder="Detalles sobre el perfil del cliente, dudas previas o temas a tratar..."
                  className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                ></textarea>
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  disabled={schedulingLoading}
                  onClick={() => {
                    setIsScheduleModalOpen(false);
                    setScheduleContact(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={schedulingLoading}
                  className="px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-blue-600 hover:bg-blue-700 shadow-md transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50 active:scale-95"
                >
                  {schedulingLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Agendando en Calendar y Enviando Correo...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Agendar Cita & Enviar Confirmación</span>
                    </>
                  )}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= TOAST NOTIFICATION ================= */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-medium backdrop-blur-md ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : toast.type === 'info'
              ? 'bg-blue-50 border-blue-200 text-blue-800'
              : 'bg-white border-emerald-300 text-emerald-900 shadow-md'
          }`}>
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />}
            {toast.type === 'info' && <AlertTriangle className="w-4 h-4 text-blue-600 flex-shrink-0" />}
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />}
            <span>{toast.message}</span>
            <button 
              onClick={() => setToast(null)} 
              className="ml-2 text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
