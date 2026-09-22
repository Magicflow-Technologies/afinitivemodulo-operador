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
  Image as ImageIcon,
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
  Briefcase
} from 'lucide-react';

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

  // Toast Notification State
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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
        `👉 *Enlace de Registro (Fondo Blanco / Google Style):*`,
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
        `👉 *Confirma tu asistencia aquí para recibir el acceso:*`,
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
      
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-5 rounded-2xl backdrop-blur-md shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Gestor de Eventos & Formularios de Captura
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Crea enlaces de webinars o formularios de captura estilo Google para el perfil de TikTok / redes sociales. Todos los prospectos se sincronizan automáticamente en Supabase.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenCreate('lead_form')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600/90 hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-900/30 transition-all cursor-pointer hover:scale-102 active:scale-98"
            title="Crear un link simple tipo Google Forms para biografía de TikTok/Instagram"
          >
            <FileText className="w-3.5 h-3.5" />
            + Formulario TikTok / Bio
          </button>

          <button
            onClick={() => handleOpenCreate('webinar')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer hover:scale-102 active:scale-98"
          >
            <Video className="w-3.5 h-3.5" />
            + Crear Webinar
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('eventos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'eventos'
                ? 'bg-amber-400/15 text-amber-300 border border-amber-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Eventos & Formularios Creados ({eventos.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveSubTab('registrados');
              fetchAllAttendees();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'registrados'
                ? 'bg-sky-400/15 text-sky-300 border border-sky-400/40 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>👥 Clientes Registrados / Leads ({totalRegistradosCount})</span>
          </button>
        </div>

        {activeSubTab === 'registrados' && (
          <button
            onClick={() => handleExportCsv(filteredGlobalAttendees, 'todos_los_clientes_registrados')}
            disabled={!filteredGlobalAttendees.length}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 text-xs font-bold border border-emerald-700/50 transition-all cursor-pointer disabled:opacity-40"
          >
            <Download className="w-3.5 h-3.5" />
            Exportar CSV
          </button>
        )}
      </div>

      {/* ================= SUBTAB 1: EVENTOS & FORMULARIOS ================= */}
      {activeSubTab === 'eventos' && (
        <div className="space-y-4">
          
          {/* Filter / Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900/70 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400 transition-all"
              />
            </div>

            {/* Tipo Selector Filter */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              <span className="text-[11px] text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3 h-3" /> Tipo:
              </span>
              <button
                onClick={() => setTipoFilter('todos')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tipoFilter === 'todos' ? 'bg-slate-700 text-white font-bold' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setTipoFilter('webinar')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tipoFilter === 'webinar' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                🎙️ Webinars
              </button>
              <button
                onClick={() => setTipoFilter('lead_form')}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all ${
                  tipoFilter === 'lead_form' ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30' : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                📋 Formularios TikTok
              </button>
            </div>
          </div>

          {/* Events Grid */}
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p className="text-xs">Cargando enlaces desde Supabase...</p>
            </div>
          ) : filteredEventos.length === 0 ? (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No se encontraron eventos o formularios</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
                Aún no has creado ningún link o no coincide con tu búsqueda actual.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => handleOpenCreate('lead_form')}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Crear Formulario TikTok
                </button>
                <button
                  onClick={() => handleOpenCreate('webinar')}
                  className="px-3.5 py-2 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5"
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
                    className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 rounded-2xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 flex flex-col group"
                  >
                    {/* Image Banner */}
                    <div className="relative h-44 bg-slate-950 overflow-hidden">
                      {ev.imagen_url ? (
                        <img 
                          src={ev.imagen_url} 
                          alt={ev.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-[#0d1b2a] text-slate-600 gap-2">
                          {esLeadForm ? (
                            <>
                              <FileText className="w-10 h-10 text-blue-400/60" />
                              <span className="text-[11px] font-semibold text-blue-300/80">Formulario TikTok Google Style</span>
                            </>
                          ) : (
                            <>
                              <ImageIcon className="w-10 h-10" />
                              <span className="text-[11px] text-slate-500">Webinar Virtual</span>
                            </>
                          )}
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>

                      {/* Badges Superiores */}
                      <div className="absolute top-3 left-3 flex items-center gap-1.5">
                        {esLeadForm ? (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                            <FileText className="w-3 h-3" />
                            TikTok / Bio Form
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Video className="w-3 h-3" />
                            Webinar Zoom
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3 flex items-center gap-1.5">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                          ev.activo !== false 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {ev.activo !== false ? 'Activo' : 'Pausado'}
                        </span>
                      </div>

                      <div className="absolute bottom-3 left-3 right-3">
                        <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded">
                          ID: {ev.id}
                        </span>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      
                      <div>
                        <h3 className="text-base font-bold text-white line-clamp-1 mb-2">
                          {ev.nombre}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {ev.descripcion || 'Sin descripción adicional'}
                        </p>
                      </div>

                      {/* Metadata Row */}
                      <div className="space-y-2 text-xs border-y border-slate-800/80 py-3">
                        {!esLeadForm && (
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              Fecha & Hora:
                            </span>
                            <span className="font-semibold capitalize text-white truncate max-w-[170px] text-right">
                              {fechaFormatted}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-slate-300">
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Users className="w-3.5 h-3.5 text-sky-400" />
                            Registrados:
                          </span>
                          <span className="font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                            {ev.asistentes_count || 0} prospectos
                          </span>
                        </div>

                        {!esLeadForm && ev.link_reunion && (
                          <div className="flex items-center justify-between text-slate-300 truncate">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Video className="w-3.5 h-3.5 text-purple-400" />
                              Zoom:
                            </span>
                            <a 
                              href={ev.link_reunion} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-sky-400 hover:underline truncate max-w-[150px]"
                            >
                              {ev.link_reunion}
                            </a>
                          </div>
                        )}

                        {esLeadForm && (
                          <div className="flex items-center justify-between text-slate-300">
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                              Estilo:
                            </span>
                            <span className="text-blue-300 font-medium">
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
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                            title="Copiar link para poner en TikTok o redes"
                          >
                            {copiedId === ev.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5 text-sky-400" />
                                <span>Copiar Link</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => handleCopyWhatsappInvitation(ev)}
                            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 text-xs font-semibold border border-emerald-700/50 transition-colors cursor-pointer"
                            title="Copiar texto formateado listo para WhatsApp"
                          >
                            {copiedWspId === ev.id ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Copia WhatsApp</span>
                              </>
                            )}
                          </button>
                        </div>

                        {/* Botón: Crear Campaña Masiva de Correo con este Evento (Si es webinar) */}
                        {!esLeadForm && onUseAsCampaign && (
                          <button
                            onClick={() => onUseAsCampaign(ev)}
                            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-gradient-to-r from-amber-500/15 via-amber-500/25 to-amber-500/15 hover:from-amber-500/30 hover:to-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer active:scale-98"
                          >
                            <Mail className="w-3.5 h-3.5 text-amber-400" />
                            <span>✉️ Usar como Plantilla de Correo Masivo</span>
                          </button>
                        )}

                        {/* Secondary Management Row */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                          <button
                            onClick={() => handleOpenAttendees(ev)}
                            className="text-xs text-sky-400 hover:text-sky-300 font-medium inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Users className="w-3.5 h-3.5" />
                            Ver Asistentes ({ev.asistentes_count || 0})
                          </button>

                          <div className="flex items-center gap-1">
                            <a
                              href={`/evento?id=${ev.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                              title="Abrir formulario/landing en nueva pestaña"
                            >
                              <Eye className="w-4 h-4" />
                            </a>
                            <button
                              onClick={() => handleOpenEdit(ev)}
                              className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Editar configuración"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteModal({ isOpen: true, id: ev.id, nombre: ev.nombre })}
                              className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
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
          
          {/* Métricas Rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Total Registrados
                </span>
                <span className="text-2xl font-bold text-white">
                  {totalRegistradosCount}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Leads TikTok / Bio
                </span>
                <span className="text-2xl font-bold text-blue-300">
                  {totalTikTokLeadsCount}
                </span>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
                  Inscritos a Webinars
                </span>
                <span className="text-2xl font-bold text-amber-300">
                  {totalWebinarLeadsCount}
                </span>
              </div>
            </div>
          </div>

          {/* Filtros de la Tabla de Registrados */}
          <div className="bg-slate-900/70 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-3">
            
            {/* Buscador */}
            <div className="relative flex-1 w-full max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por nombre, correo, teléfono o país..."
                value={attendeeSearchGlobal}
                onChange={(e) => setAttendeeSearchGlobal(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 transition-all"
              />
            </div>

            {/* Selectores de Filtro */}
            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
              
              {/* Filtro por Evento / Link */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium">Link / Evento:</span>
                <select
                  value={selectedEventFilter}
                  onChange={(e) => setSelectedEventFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-sky-400 cursor-pointer max-w-[200px] truncate"
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
                <span className="text-xs text-slate-400 font-medium">Interés:</span>
                <select
                  value={interestFilter}
                  onChange={(e) => setInterestFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-sky-400 cursor-pointer"
                >
                  <option value="todos">Todos los intereses</option>
                  <option value="Inmobiliaria">Inmobiliaria</option>
                  <option value="Bolsa de Valores">Bolsa de Valores</option>
                  <option value="Fondos">Fondos</option>
                </select>
              </div>

            </div>
          </div>

          {/* Tabla de Clientes Registrados */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {loadingAllAttendees ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-sky-400" />
                Cargando lista de clientes registrados...
              </div>
            ) : filteredGlobalAttendees.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No hay clientes registrados que coincidan con los filtros seleccionados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Cliente</th>
                      <th className="py-3 px-4">WhatsApp / Celular</th>
                      <th className="py-3 px-4">Correo</th>
                      <th className="py-3 px-4">País</th>
                      <th className="py-3 px-4">Interés de Inversión</th>
                      <th className="py-3 px-4">Evento / Link Origen</th>
                      <th className="py-3 px-4">Fecha Registro</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
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
                        <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                          
                          {/* Cliente */}
                          <td className="py-3.5 px-4 font-semibold text-white">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">
                                {a.nombre ? a.nombre.charAt(0) : 'U'}
                              </div>
                              <div>
                                <span className="block text-white font-bold">{a.nombre}</span>
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
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-400 border border-emerald-700/40 text-xs font-mono font-bold transition-all shadow-sm cursor-pointer"
                              title="Abrir chat de WhatsApp con el cliente"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{a.celular}</span>
                            </a>
                          </td>

                          {/* Correo */}
                          <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                            <a href={`mailto:${a.correo}`} className="text-sky-400 hover:underline">
                              {a.correo}
                            </a>
                          </td>

                          {/* País */}
                          <td className="py-3.5 px-4 text-slate-200">
                            <span className="inline-flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded border border-slate-800 font-medium">
                              <Globe className="w-3 h-3 text-slate-400" />
                              {a.pais || 'Perú'}
                            </span>
                          </td>

                          {/* Interés de Inversión (Solo Inmobiliaria, Bolsa de Valores, Fondos) */}
                          <td className="py-3.5 px-4">
                            {a.interes_inversion ? (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                                a.interes_inversion === 'Inmobiliaria'
                                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                                  : a.interes_inversion === 'Bolsa de Valores'
                                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                  : 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                              }`}>
                                <Briefcase className="w-3 h-3" />
                                {a.interes_inversion}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px] italic">No especificado</span>
                            )}
                          </td>

                          {/* Evento Origen */}
                          <td className="py-3.5 px-4 text-slate-300">
                            <div className="flex flex-col max-w-[180px]">
                              <span className="truncate font-semibold text-white text-xs" title={a.evento_nombre}>
                                {a.evento_nombre || a.evento_id}
                              </span>
                              <span className={`text-[10px] uppercase tracking-wider font-bold ${
                                a.evento_tipo === 'lead_form' ? 'text-blue-400' : 'text-amber-400'
                              }`}>
                                {a.evento_tipo === 'lead_form' ? '📋 Formulario TikTok' : '🎙️ Webinar'}
                              </span>
                            </div>
                          </td>

                          {/* Fecha */}
                          <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
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

      {/* ================= MODAL: CREATE / EDIT EVENT ================= */}
      {isEditModalOpen && editingEvento && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            
            <div className="p-6 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur-md z-10">
              <div className="flex items-center gap-2">
                {editingEvento.tipo === 'lead_form' ? (
                  <FileText className="w-5 h-5 text-blue-400" />
                ) : (
                  <Building2 className="w-5 h-5 text-amber-400" />
                )}
                <h3 className="text-lg font-bold text-white">
                  {editingEvento.id && eventos.some(ev => ev.id === editingEvento.id) 
                    ? 'Editar Enlace' 
                    : editingEvento.tipo === 'lead_form' 
                    ? 'Crear Formulario de Captura TikTok (Google Style)' 
                    : 'Crear Nuevo Webinar'}
                </h3>
              </div>
              <button 
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEvento} className="p-6 space-y-4">
              
              {/* Selector de Tipo de Evento / Enlace */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Tipo de Enlace / Landing <span className="text-amber-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingEvento({ ...editingEvento, tipo: 'webinar' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      editingEvento.tipo !== 'lead_form'
                        ? 'border-amber-400 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1 text-amber-300">
                      <Video className="w-4 h-4" />
                      Webinar / Conferencia
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Con fecha, hora y enlace de videollamada Zoom/Meet.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setEditingEvento({ ...editingEvento, tipo: 'lead_form' })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      editingEvento.tipo === 'lead_form'
                        ? 'border-blue-400 bg-blue-500/10 text-white'
                        : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-xs mb-1 text-blue-300">
                      <FileText className="w-4 h-4" />
                      Formulario TikTok / Bio
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      Fondo blanco, estilo Google, sin fecha ni link de videollamada.
                    </p>
                  </button>
                </div>
              </div>

              {/* Event Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Título del {editingEvento.tipo === 'lead_form' ? 'Formulario' : 'Evento'} <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingEvento.nombre || ''}
                  onChange={(e) => setEditingEvento({ ...editingEvento, nombre: e.target.value })}
                  placeholder={editingEvento.tipo === 'lead_form' ? 'Ej: Registro Exclusivo - Asesoría Financiera Patrimonial' : 'Ej: 🏙️ THE NEW YORK TOWER 🏙️'}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 px-3 text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Slug / ID */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  ID Personalizado (URL Slug)
                </label>
                <input
                  type="text"
                  value={editingEvento.id || ''}
                  onChange={(e) => setEditingEvento({ ...editingEvento, id: e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-') })}
                  placeholder="ej: registro-tiktok-afinitive (se autogenera si se deja vacío)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
                <small className="text-[11px] text-slate-400">
                  Aparecerá en la URL: <code>/evento?id=<b>{editingEvento.id || 'slug-automatico'}</b></code>
                </small>
              </div>

              {/* Campos condicionales para Webinars */}
              {editingEvento.tipo !== 'lead_form' && (
                <>
                  {/* Date Input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Fecha y Hora de Inicio (Hora Perú UTC-5) <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={editingEvento.fecha_inicio || ''}
                      onChange={(e) => setEditingEvento({ ...editingEvento, fecha_inicio: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  {/* Zoom Link */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Enlace de Reunión / Zoom <span className="text-amber-400">*</span>
                    </label>
                    <input
                      type="url"
                      required
                      value={editingEvento.link_reunion || ''}
                      onChange={(e) => setEditingEvento({ ...editingEvento, link_reunion: e.target.value })}
                      placeholder="https://us06web.zoom.us/launch/jc/86782072926"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </>
              )}

              {/* Image Upload & Storage Section */}
              <div className="space-y-3 bg-slate-950/80 border border-slate-800 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-amber-400" />
                    Banner / Imagen Opcional (Supabase Storage)
                  </label>
                  {editingEvento.imagen_url && (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                      ✓ Imagen Cargada
                    </span>
                  )}
                </div>

                {uploadError && (
                  <div className="p-2.5 rounded-lg bg-red-900/40 border border-red-500/50 text-red-200 text-xs">
                    {uploadError}
                  </div>
                )}

                {/* Botón de Subida Principal */}
                <div className="flex flex-col gap-2">
                  <label className={`w-full border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                    uploadingImage 
                      ? 'border-amber-400 bg-amber-500/10' 
                      : 'border-amber-500/40 hover:border-amber-400 bg-slate-900/90 hover:bg-slate-900 shadow-md'
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
                        <Loader2 className="w-7 h-7 text-amber-400 animate-spin" />
                        <span className="text-xs text-amber-300 font-bold">Subiendo archivo a Supabase Storage...</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 py-1">
                        <div className="w-10 h-10 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mb-0.5">
                          <Upload className="w-5 h-5" />
                        </div>
                        <span className="text-sm text-white font-bold block">
                          📁 Haz clic aquí para Seleccionar y Subir Imagen / Flyer
                        </span>
                        <span className="text-xs text-slate-400 block">
                          Se guardará directamente en tu Supabase Storage (JPG, PNG, WEBP)
                        </span>
                      </div>
                    )}
                  </label>
                </div>

                {/* Preview de la imagen si ya existe */}
                {editingEvento.imagen_url && (
                  <div className="relative rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-3 flex items-center gap-3">
                    <img 
                      src={editingEvento.imagen_url} 
                      alt="Preview" 
                      className="w-24 h-16 object-cover rounded-lg flex-shrink-0 border border-slate-700 shadow-md" 
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <span className="text-[11px] font-bold text-emerald-400 block truncate">
                        URL en Supabase Storage:
                      </span>
                      <p className="text-[11px] text-slate-400 truncate font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800">
                        {editingEvento.imagen_url}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setEditingEvento({ ...editingEvento, imagen_url: '' })}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Eliminar imagen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Description & Value Proposition */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descripción / Instrucciones del Formulario
                </label>
                <textarea
                  rows={4}
                  value={editingEvento.descripcion || ''}
                  onChange={(e) => setEditingEvento({ ...editingEvento, descripcion: e.target.value })}
                  placeholder="Describe la oportunidad o instrucciones para los prospectos que abran este link..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-400 leading-relaxed"
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="activo-check"
                  checked={editingEvento.activo !== false}
                  onChange={(e) => setEditingEvento({ ...editingEvento, activo: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-950 cursor-pointer"
                />
                <label htmlFor="activo-check" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Enlace activo y habilitado para recibir registros
                </label>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-300 transition-all cursor-pointer"
                >
                  Guardar Enlace
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* ================= MODAL: ATTENDEES LIST (Por Evento Específico) ================= */}
      {isAttendeesModalOpen && selectedEventoAttendees && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900 sticky top-0 z-10">
              <div>
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-400" />
                  <h3 className="text-lg font-bold text-white">
                    Registrados en: {selectedEventoAttendees.nombre}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total de inscritos en este enlace: <span className="text-amber-400 font-semibold">{attendeesList.length}</span>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportCsv(attendeesList, `asistentes_${selectedEventoAttendees.id}`)}
                  disabled={!attendeesList.length}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Exportar lista a CSV"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Exportar CSV
                </button>
                <button 
                  onClick={() => setIsAttendeesModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter in Modal */}
            <div className="p-4 border-b border-slate-800 bg-slate-950/40">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar por nombre, correo, teléfono o país..."
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 pl-9 pr-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
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
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3">Nombre</th>
                      <th className="py-2.5 px-3">WhatsApp / Celular</th>
                      <th className="py-2.5 px-3">Correo</th>
                      <th className="py-2.5 px-3">País</th>
                      <th className="py-2.5 px-3">Interés</th>
                      <th className="py-2.5 px-3">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
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
                          <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 font-semibold text-white">
                              {a.nombre}
                            </td>
                            <td className="py-3 px-3">
                              <a 
                                href={whatsappUrl} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-emerald-400 hover:underline inline-flex items-center gap-1 font-mono font-bold"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                                {a.celular}
                              </a>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              <a href={`mailto:${a.correo}`} className="text-sky-400 hover:underline">
                                {a.correo}
                              </a>
                            </td>
                            <td className="py-3 px-3 text-slate-300">
                              {a.pais || 'Perú'}
                            </td>
                            <td className="py-3 px-3">
                              {a.interes_inversion ? (
                                <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-700">
                                  {a.interes_inversion}
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
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

      {/* ================= MODAL: CONFIRM DELETE EVENT ================= */}
      {deleteModal && deleteModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-rose-500 to-amber-500" />
            
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Confirmar Eliminación
                </h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  ¿Estás seguro de que deseas eliminar este enlace/evento del sistema?
                </p>
              </div>
            </div>

            <div className="my-5 p-3.5 bg-slate-950/80 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-xs font-bold text-white line-clamp-1">
                  {deleteModal.nombre}
                </span>
              </div>
              <p className="text-[11px] text-red-300/80 mt-2 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />
                Esta acción borrará también la lista de inscritos asociados.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteModal(null)}
                className="px-4 py-2.5 text-xs font-semibold text-slate-300 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-5 py-2.5 text-xs font-bold text-white rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-900/40 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
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

      {/* ================= TOAST NOTIFICATION ================= */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 text-xs font-medium backdrop-blur-md ${
            toast.type === 'error'
              ? 'bg-red-950/95 border-red-500/50 text-red-200'
              : toast.type === 'info'
              ? 'bg-sky-950/95 border-sky-500/50 text-sky-200'
              : 'bg-slate-900/95 border-emerald-500/50 text-emerald-300'
          }`}>
            {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
            {toast.type === 'info' && <AlertTriangle className="w-4 h-4 text-sky-400 flex-shrink-0" />}
            {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
            <span>{toast.message}</span>
            <button 
              onClick={() => setToast(null)} 
              className="ml-2 text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
