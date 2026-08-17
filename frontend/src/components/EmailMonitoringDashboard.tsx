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
  ExternalLink
} from 'lucide-react';

interface EmailRecord {
  id: string;
  recipient_email: string;
  subject: string;
  status: string;
  resend_email_id: string;
  sent_at: string;
  opened_at: string | null;
}

export default function EmailMonitoringDashboard() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [signatureId, setSignatureId] = useState('irina');
  const [senderName, setSenderName] = useState('Irina Portilla');
  const [senderEmail, setSenderEmail] = useState('iportilla@afinitive.com.pe');
  
  const handleSignatureChange = (id: string) => {
    setSignatureId(id);
    if (id === 'irina') {
      setSenderName('Irina Portilla');
      setSenderEmail('iportilla@afinitive.com.pe');
    } else if (id === 'ricardo') {
      setSenderName('Ricardo Bertalmio');
      setSenderEmail('rbertalmio@afinitive.com.pe');
    }
  };

  const [subject, setSubject] = useState('Invitación Exclusiva - Afinitive');
  const [emailBody, setEmailBody] = useState(
    'Nos complace invitarle a formar parte de nuestra selecta comunidad en Afinitive.\n\n' +
    'Por favor, ingrese al siguiente enlace para completar su registro de cliente de alto patrimonio:\n' +
    'https://afinitive.dashbportal.com/invite/irina-opt\n\n' +
    'Atentamente,\n' +
    'Irina, Asesora de Cuentas Senior'
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [emails, setEmails] = useState<EmailRecord[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estados para Filtros
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Obtener el backend URL de las variables de entorno o usar el puerto por defecto 3001
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

  // Lógica de filtrado de correos
  const filteredEmails = emails.filter((email) => {
    if (filterStatus !== 'Todos' && email.status !== filterStatus) {
      return false;
    }
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
    return true;
  });

  // Función para obtener los correos desde Supabase
  const fetchEmails = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from('email_tracking_test')
        .select('*')
        .order('sent_at', { ascending: false });

      if (error) {
        throw error;
      }

      setEmails(data || []);
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
      fetchEmails(true); // Polling silencioso (sin activar cargando visual brusco)
    }, 5000);

    return () => clearInterval(interval);
  }, [fetchEmails]);

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
      const response = await fetch(`${BACKEND_URL}/api/test-email/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          recipientEmail, 
          senderEmail: fullSender,
          subject, 
          body: emailBody,
          signatureId
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Error al enviar correo');
      }

      setSuccessMsg(`¡Correo enviado con éxito a ${recipientEmail}!`);
      setRecipientEmail('');
      // Refrescar la lista de correos inmediatamente
      await fetchEmails(true);
    } catch (error: any) {
      console.error('Error al enviar correo:', error);
      setErrorMsg(`Error de Envío: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  };

  // Formatear fechas de manera elegante
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-[#08101A] text-slate-100 flex flex-col antialiased selection:bg-brand-gold/30 selection:text-brand-gold">
      
      {/* Cabecera Premium */}
      <header className="border-b border-brand-gold/30 bg-[#0D1B2A] py-6 px-8 shadow-lg shadow-black/40 sticky top-0 z-50 backdrop-blur-md bg-opacity-95">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-gold/10 border border-brand-gold/40 rounded-lg text-brand-gold">
              <Mail className="w-8 h-8 animate-pulse-gold" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-brand-gold">
                AFINITIVE
              </h1>
              <p className="text-xs text-brand-gold font-medium uppercase tracking-widest mt-0.5">
                Monitoreo Omnicanal — Entorno de Pruebas — Irina (Operadora)
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4 flex-wrap justify-center md:justify-end">
            <a
              href="https://operador.afinitive.com.pe/formEvento/index.html"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open("https://operador.afinitive.com.pe/formEvento/index.html", "_blank");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-gold/10 hover:bg-brand-gold/25 active:bg-brand-gold/30 border border-brand-gold/40 hover:border-brand-gold/60 text-sm font-semibold text-brand-gold rounded-lg transition-all duration-200 shadow-md shadow-brand-gold/5"
            >
              <Calendar className="w-4 h-4 text-brand-gold" />
              <span>Formulario de Eventos</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
            <span className="h-6 w-px bg-slate-800 hidden sm:inline"></span>
            <button
              onClick={() => fetchEmails()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-brand-navy-light hover:bg-[#22334F] active:bg-[#0D1B2A] border border-brand-gold/20 hover:border-brand-gold/40 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-brand-gold ${refreshing ? 'animate-spin' : ''}`} />
              <span>{refreshing ? 'Actualizando...' : 'Actualizar'}</span>
            </button>
            <span className="h-6 w-px bg-slate-800 hidden sm:inline"></span>
            <div className="text-xs text-slate-400 font-mono bg-slate-900/60 px-3 py-1.5 rounded border border-slate-800">
              Backend: <span className="text-brand-gold">{BACKEND_URL}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 space-y-8">
        
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

        {/* Sección de Envío - Formulario Premium */}
        <section className="bg-gradient-to-b from-[#0D1B2A] to-[#0A1420] border border-brand-gold/20 rounded-2xl p-6 md:p-8 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="relative z-10 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-brand-gold">Enviar Correo Electrónico de Prueba</h2>
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

              {/* Fila 2: Datos del Destinatario y Asunto */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <label className="text-xs text-brand-gold font-medium uppercase tracking-wider">Cuerpo del Mensaje (Invitación)</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Escribe el mensaje de invitación para el cliente de alto patrimonio..."
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  className="w-full px-4 py-3 bg-brand-navy-dark border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-xl text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans resize-none"
                />
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

        {/* Sección de Historial - Tabla de Monitoreo */}
        <section className="bg-gradient-to-b from-[#0D1B2A] to-[#0A1420] border border-brand-gold/20 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-brand-gold/15 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-semibold text-brand-gold">Panel de Control de Rastreos</h2>
              <p className="text-sm text-slate-400">Rastreo de envíos y lecturas. Se actualiza automáticamente cada 5 segundos.</p>
            </div>
            <span className="px-3 py-1 bg-brand-gold/10 border border-brand-gold/30 text-brand-gold text-xs font-mono rounded-full flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              Live Tracking Activo
            </span>
          </div>

          {/* Barra de Filtros */}
          <div className="p-6 bg-slate-950/20 border-b border-brand-gold/10 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:w-1/4 space-y-1.5">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Estado</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 bg-[#08101A] border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-lg text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans"
              >
                <option value="Todos">Todos los Estados</option>
                <option value="Enviado">Enviado</option>
                <option value="Leído">Leído</option>
              </select>
            </div>

            <div className="w-full md:w-1/4 space-y-1.5">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Fecha Desde</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#08101A] border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-lg text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans"
              />
            </div>

            <div className="w-full md:w-1/4 space-y-1.5">
              <label className="text-xs text-slate-400 font-medium uppercase tracking-wider">Fecha Hasta</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-3 py-2 bg-[#08101A] border border-brand-gold/20 hover:border-brand-gold/40 focus:border-brand-gold/90 focus:ring-1 focus:ring-brand-gold/50 rounded-lg text-slate-100 placeholder-slate-500 outline-none transition-all duration-200 text-sm font-sans"
              />
            </div>

            <div className="w-full md:w-auto">
              <button
                onClick={() => {
                  setFilterStatus('Todos');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                disabled={filterStatus === 'Todos' && !filterStartDate && !filterEndDate}
                className="w-full md:w-auto px-4 py-2 bg-brand-navy-light hover:bg-[#22334F] active:bg-[#0D1B2A] border border-brand-gold/20 hover:border-brand-gold/40 text-sm font-medium rounded-lg transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 whitespace-nowrap"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {emails.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                  <Mail className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">No hay registros de envío en este entorno</p>
                  <p className="text-xs text-slate-500">Usa el formulario superior para enviar tu primer correo de prueba.</p>
                </div>
              </div>
            ) : filteredEmails.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-16 h-16 bg-slate-900 border border-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-500">
                  <Mail className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400 font-medium">Ningún registro coincide con los filtros</p>
                  <p className="text-xs text-slate-500">Prueba ajustando el estado o el rango de fechas seleccionado.</p>
                </div>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/40 text-slate-400 text-xs font-semibold tracking-wider uppercase border-b border-slate-800">
                    <th className="py-4 px-6">Destinatario</th>
                    <th className="py-4 px-6">Asunto</th>
                    <th className="py-4 px-6">Fecha de Envío</th>
                    <th className="py-4 px-6">Estado</th>
                    <th className="py-4 px-6">Fecha de Lectura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm">
                  {filteredEmails.map((email) => (
                    <tr 
                      key={email.id} 
                      className="hover:bg-slate-900/40 transition-colors duration-150 group"
                    >
                      <td className="py-4 px-6 font-medium text-slate-200">
                        {email.recipient_email}
                      </td>
                      <td className="py-4 px-6 text-slate-400 max-w-[200px] truncate">
                        {email.subject}
                      </td>
                      <td className="py-4 px-6 text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{formatDate(email.sent_at)}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 whitespace-nowrap">
                        {email.status === 'Leído' ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/5">
                            <Eye className="w-3.5 h-3.5" />
                            Leído
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-brand-navy-light border border-blue-500/30 text-blue-400 shadow-sm">
                            <Clock className="w-3.5 h-3.5" />
                            Enviado
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-slate-400 whitespace-nowrap">
                        {email.status === 'Leído' ? (
                          <div className="flex items-center gap-2 text-emerald-400 font-medium">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>{formatDate(email.opened_at)}</span>
                          </div>
                        ) : (
                          <span className="text-slate-600 font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

      </main>

      {/* Pie de página */}
      <footer className="py-6 px-8 text-center text-xs text-slate-500 border-t border-slate-900 mt-auto bg-slate-950/20">
        <p className="flex items-center justify-center gap-1.5">
          <span>Afinitive Inc. — Entorno de pruebas Sandbox</span>
          <span className="w-1 h-1 rounded-full bg-slate-600"></span>
          <span className="text-brand-gold font-semibold flex items-center gap-0.5">
            Operadora Irina <ArrowRight className="w-3 h-3 inline" /> Módulo de Correo Omnicanal
          </span>
        </p>
      </footer>
    </div>
  );
}
