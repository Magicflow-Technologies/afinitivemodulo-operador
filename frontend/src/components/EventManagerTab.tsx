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
  ExternalLink
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
}

interface EventManagerTabProps {
  onUseAsCampaign?: (evento: Evento) => void;
}

export default function EventManagerTab({ onUseAsCampaign }: EventManagerTabProps = {}) {
  // Navigation tabs: 'eventos' | 'registrados'
  const [activeSubTab, setActiveSubTab] = useState<'eventos' | 'registrados'>('eventos');

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
      link_reunion: tipoPredeterminado === 'webinar' ? 'https://us06web.zoom.us/launch/jc/' : '',
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
    if (esWebinar && (!editingEvento.fecha_inicio || !editingEvento.link_reunion)) {
      showToast('Para un Webinar, la fecha de inicio y el enlace de Zoom son obligatorios', 'error');
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
        link_reunion: esWebinar ? editingEvento.link_reunion : '',
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

  const handleExportCsv = (list: Asistente[], filenamePrefix = 'asistentes') => {
    if (!list.length) return;

    const headers = ['ID', 'Nombre', 'Correo', 'Celular', 'País', 'Interés de Inversión', 'Evento/Link', 'Tipo', 'Fecha Registro'];
    const rows = list.map(a => [
      `"${a.id}"`,
      `"${(a.nombre || '').replace(/"/g, '""')}"`,
      `"${(a.correo || '').replace(/"/g, '""')}"`,
      `"${(a.celular || '').replace(/"/g, '""')}"`,
      `"${(a.pais || 'Perú').replace(/"/g, '""')}"`,
      `"${(a.interes_inversion || '-').replace(/"/g, '""')}"`,
      `"${(a.evento_nombre || a.evento_id || '').replace(/"/g, '""')}"`,
      `"${a.evento_tipo === 'lead_form' ? 'Formulario TikTok' : 'Webinar'}"`,
      `"${a.created_at}"`,
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

  // Filtros de asistentes globales
  const filteredGlobalAttendees = allAttendees.filter(a => {
    const matchesSearch = 
      a.nombre.toLowerCase().includes(attendeeSearchGlobal.toLowerCase()) ||
      a.correo.toLowerCase().includes(attendeeSearchGlobal.toLowerCase()) ||
      a.celular.includes(attendeeSearchGlobal) ||
      (a.pais && a.pais.toLowerCase().includes(attendeeSearchGlobal.toLowerCase()));

    const matchesEvent = 
      selectedEventFilter === 'todos' || a.evento_id === selectedEventFilter;

    const matchesInterest = 
      interestFilter === 'todos' || a.interes_inversion === interestFilter;

    return matchesSearch && matchesEvent && matchesInterest;
  });

  const totalRegistradosCount = allAttendees.length;
  const totalTikTokLeadsCount = allAttendees.filter(a => a.evento_tipo === 'lead_form').length;
  const totalWebinarLeadsCount = allAttendees.filter(a => a.evento_tipo !== 'lead_form').length;

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
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('eventos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'eventos'
                ? 'bg-amber-50 text-amber-900 border border-amber-300 shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4 text-amber-600" />
            <span>Eventos & Formularios Creados ({eventos.length})</span>
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
            <span>👥 Clientes Registrados / Leads ({totalRegistradosCount})</span>
          </button>
        </div>

        {activeSubTab === 'registrados' && (
          <button
            onClick={() => handleExportCsv(filteredGlobalAttendees, 'todos_los_clientes_registrados')}
            disabled={!filteredGlobalAttendees.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300 transition-all cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Exportar CSV
          </button>
        )}
      </div>

      {/* ================= SUBTAB 1: EVENTOS & FORMULARIOS ================= */}
      {activeSubTab === 'eventos' && (
        <div className="space-y-4">
          
          {/* Tarjeta Destacada: Link in Bio Dr. Finanzas (TikTok / Redes) */}
          <div className="bg-gradient-to-r from-amber-50/70 via-white to-stone-50 border-2 border-amber-800/20 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full overflow-hidden p-0.5 bg-gradient-to-tr from-[#8B5A2B] via-[#C9A84C] to-[#5c3a1e] shrink-0 shadow-xs">
                <img 
                  src="/ricardo_bertalmio.jpg" 
                  alt="Dr. Finanzas" 
                  className="w-full h-full object-cover rounded-full bg-white"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-extrabold text-stone-900 tracking-tight">
                    Link in Bio TikTok & Redes — Dr. Finanzas
                  </h3>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-[#8B5A2B] text-[10px] font-extrabold tracking-wide uppercase border border-amber-600/20">
                    Oficial
                  </span>
                </div>
                <p className="text-xs text-stone-600 mt-0.5">
                  Página principal con 7 botones (Formulario de captación, Web, Facebook, Instagram, WhatsApp, YouTube y LinkedIn).
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] font-mono text-amber-900/90 font-medium">
                  <span className="text-stone-400">URL:</span>
                  <code className="bg-amber-100/60 px-2 py-0.5 rounded border border-amber-200 text-stone-800">
                    {getBioLinkUrl()}
                  </code>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0 flex-wrap sm:flex-nowrap">
              <button
                onClick={handleOpenBioConfig}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300/80 transition-all cursor-pointer shadow-xs active:scale-95"
                title="Personalizar nombres y enlaces de cada botón"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-800" />
                Editar Botones & Links
              </button>

              <button
                onClick={handleCopyBioLink}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                  copiedBio
                    ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                    : 'bg-[#8B5A2B] hover:bg-[#724820] text-white shadow-amber-950/10 active:scale-95'
                }`}
              >
                {copiedBio ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    ¡Copiado!
                  </>
                ) : (
                  <>
                    <Share2 className="w-3.5 h-3.5" />
                    Copiar Link TikTok
                  </>
                )}
              </button>

              <a
                href={getBioLinkUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white hover:bg-slate-50 text-stone-800 border border-slate-300 transition-all cursor-pointer shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-stone-600" />
                Ver Página
              </a>
            </div>
          </div>

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
          
          {/* Métricas Rápidas (Fondo Blanco Limpio) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Total Registrados
                </span>
                <span className="text-2xl font-bold text-slate-900">
                  {totalRegistradosCount}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Leads TikTok / Bio
                </span>
                <span className="text-2xl font-bold text-indigo-900">
                  {totalTikTokLeadsCount}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-2xl flex items-center gap-3.5 shadow-xs">
              <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                  Inscritos a Webinars
                </span>
                <span className="text-2xl font-bold text-amber-900">
                  {totalWebinarLeadsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Filtros de la Tabla de Registrados */}
          <div className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            
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

            {/* Selectores de Filtro */}
            <div className="flex items-center gap-2.5 flex-wrap w-full md:w-auto justify-end">
              
              {/* Filtro por Evento / Link */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-bold">Link / Evento:</span>
                <select
                  value={selectedEventFilter}
                  onChange={(e) => setSelectedEventFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer max-w-[200px] truncate font-medium"
                >
                  <option value="todos">Todos los Links</option>
                  {eventos.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.tipo === 'lead_form' ? '📋 ' : '🎙️ '} {ev.nombre}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro por Interés de Inversión */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 font-bold">Interés:</span>
                <select
                  value={interestFilter}
                  onChange={(e) => setInterestFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 text-xs text-slate-800 focus:outline-none focus:border-blue-600 cursor-pointer font-medium"
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
                No hay clientes registrados que coincidan con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 font-bold uppercase tracking-wider">
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">WhatsApp / Celular</th>
                      <th className="py-3 px-4">Correo</th>
                      <th className="py-3 px-4">País</th>
                      <th className="py-3 px-4">Interés de Inversión</th>
                      <th className="py-3 px-4">Evento / Link Origen</th>
                      <th className="py-3 px-4">Fecha Registro</th>
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

                      const cleanPhone = (a.celular || '').replace(/[^0-9]/g, '');
                      const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(a.nombre)},%20te%20escribo%20de%20Afinitive%20Wealth%20Management%20en%20relaci%C3%B3n%20a%20tu%20registro.`;

                      return (
                        <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                          
                          {/* Cliente */}
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-bold text-xs uppercase">
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

                          {/* WhatsApp / Celular */}
                          <td className="py-3.5 px-4">
                            <a
                              href={whatsappUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-bold transition-all shadow-2xs cursor-pointer"
                              title="Abrir chat de WhatsApp con el cliente"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{a.celular}</span>
                            </a>
                          </td>

                          {/* Correo */}
                          <td className="py-3.5 px-4 text-slate-700 font-mono text-[11px]">
                            <a href={`mailto:${a.correo}`} className="text-blue-600 hover:underline">
                              {a.correo}
                            </a>
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
                                {a.evento_nombre || a.evento_id}
                              </span>
                              <span className={`text-[10px] uppercase tracking-wider font-bold ${
                                a.evento_tipo === 'lead_form' ? 'text-blue-600' : 'text-amber-700'
                              }`}>
                                {a.evento_tipo === 'lead_form' ? '📋 Formulario TikTok' : '🎙️ Webinar'}
                              </span>
                            </div>
                          </td>

                          {/* Fecha */}
                          <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                            {formattedCreatedAt}
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

                  {/* Zoom Link */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Enlace de Reunión / Zoom <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={editingEvento.link_reunion || ''}
                      onChange={(e) => setEditingEvento({ ...editingEvento, link_reunion: e.target.value })}
                      placeholder="https://us06web.zoom.us/launch/jc/86782072926"
                      className="w-full bg-white border border-slate-300 rounded-xl py-2 px-3 text-xs text-slate-900 focus:outline-none focus:border-blue-600"
                    />
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

                        const cleanPhone = (a.celular || '').replace(/[^0-9]/g, '');
                        const whatsappUrl = `https://wa.me/${cleanPhone}?text=Hola%20${encodeURIComponent(a.nombre)},%20te%20escribo%20de%20Afinitive%20en%20relaci%C3%B3n%20a%20tu%20registro.`;

                        return (
                          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              {a.nombre}
                            </td>
                            <td className="py-3 px-3">
                              <a 
                                href={whatsappUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-emerald-700 hover:underline inline-flex items-center gap-1 font-mono font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200"
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                                {a.celular}
                              </a>
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
