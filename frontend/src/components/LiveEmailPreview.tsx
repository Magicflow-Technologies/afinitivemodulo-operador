import React, { useState, useMemo } from 'react';
import { Monitor, Smartphone, RefreshCw, User, Sparkles, Code, Eye } from 'lucide-react';

interface LiveEmailPreviewProps {
  templateName?: string;
  templateType: 'full_html' | 'standard_wrapper' | string;
  rawHtmlOrBody: string;
  subject: string;
  signatureId: string;
  senderName?: string;
  testRecipientName?: string;
  testProposedDate?: string;
  createdBy?: string;
  onRefresh?: () => void;
}

const SIGNATURES_PREVIEW = {
  ricardo: `
    <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 100%; background-color: #ffffff;">
      <tr>
        <td valign="middle" style="padding-right: 15px;">
          <img src="https://links.afinitive.com.pe/img/afinitive_logo.png" alt="Afinitive" width="100" style="display: block; border: none;">
        </td>
        <td valign="middle" style="padding-right: 20px;">
          <img src="https://dashbportal.com/afinitive/rbertalmio.png" alt="Ricardo Bertalmio Ruibal" width="90" style="display: block; border-radius: 50%; box-shadow: 0px 0px 5px rgba(0,0,0,0.15);">
        </td>
        <td valign="middle">
          <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 8px;">
            <tr>
              <td style="padding-bottom: 3px;">
                <span style="font-size: 18px; color: #000000; font-weight: bold; margin: 0; line-height: 1.1; font-family: Arial, sans-serif;">Ricardo Bertalmio Ruibal</span>
              </td>
            </tr>
            <tr>
              <td>
                <span style="font-size: 13px; color: #555555; margin: 0; font-family: Arial, sans-serif;">CEO Afinitive Wealth Management</span>
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" border="0" style="font-size: 12px; color: #000000; font-family: Arial, sans-serif;">
            <tr>
              <td valign="middle" style="padding: 0 15px 4px 0; white-space: nowrap;">
                <span style="vertical-align: middle;">📞 (511) 982100208</span>
              </td>
              <td valign="middle" style="padding: 0 0 4px 0; white-space: nowrap;">
                <span style="vertical-align: middle;">📍 Av. Camino Real, San Isidro.</span>
              </td>
            </tr>
            <tr>
              <td valign="middle" style="padding: 0 15px 0 0; white-space: nowrap;">
                <a href="https://afinitive.com.pe" style="text-decoration: none; color: #000000;" target="_blank">
                  <span style="vertical-align: middle;">🌐 afinitive.com.pe</span>
                </a>
              </td>
              <td valign="middle" style="padding: 0; white-space: nowrap;">
                <span style="vertical-align: middle;">🔗 in/ricardo-bertalmio</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `,
};

export const LiveEmailPreview: React.FC<LiveEmailPreviewProps> = ({
  templateName = 'Plantilla Actual',
  templateType,
  rawHtmlOrBody,
  subject,
  signatureId,
  senderName,
  testRecipientName = 'Marielisa',
  testProposedDate = '',
  createdBy = 'manual',
  onRefresh,
}) => {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>('desktop');
  const [viewCode, setViewCode] = useState(false);
  const [simulatedName, setSimulatedName] = useState(testRecipientName);

  // Formateador de fecha
  const formattedDate = useMemo(() => {
    if (!testProposedDate) return 'miércoles, 3 de septiembre a las 10:00';
    try {
      const d = new Date(testProposedDate);
      if (isNaN(d.getTime())) return testProposedDate;
      return d.toLocaleDateString('es-ES', {
        timeZone: 'America/Lima',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return testProposedDate;
    }
  }, [testProposedDate]);

  const greeting = useMemo(() => {
    const clean = (simulatedName || '').trim().toLowerCase();
    if (clean.endsWith('a') || clean.includes('mari') || clean.includes('ana') || clean.includes('patricia') || clean.includes('claudia')) {
      return 'Estimada';
    }
    return 'Estimado';
  }, [simulatedName]);

  const operatorName = senderName || 'Ricardo Bertalmio Ruibal';
  const operatorRole = 'Soy economista de la Universidad del Pacífico y dirijo Afinitive Wealth Management';

  // Renderizar HTML dinámico con reemplazo de comodines
  // Renderizar HTML dinámico con reemplazo de comodines
  const renderedFullHtml = useMemo(() => {
    if (!rawHtmlOrBody) return '<div style="padding:40px;text-align:center;color:#999;">Sin contenido</div>';

    let content = rawHtmlOrBody;

    const calendarBookingLink = `/agendar?name=${encodeURIComponent(simulatedName)}`;
    const whatsappDemoLink = `https://wa.me/51982100208?text=${encodeURIComponent(`Hola, soy ${simulatedName} y deseo información de inversión en Afinitive`)}`;

    // Sustitución de variables dinámicas estándar
    content = content
      .replace(/\{\{\s*nombre\s*\}\}/gi, simulatedName)
      .replace(/\{\{\s*saludo\s*\}\}/gi, greeting)
      .replace(/\{\{\s*fecha_reunion\s*\}\}/gi, formattedDate)
      .replace(/\{\{\s*fecha\s*\}\}/gi, formattedDate)
      .replace(/\{\{\s*firma_nombre\s*\}\}/gi, operatorName)
      .replace(/\{\{\s*firma_cargo\s*\}\}/gi, operatorRole)
      .replace(/\{\{\s*whatsapp_link\s*\}\}/gi, whatsappDemoLink)
      .replace(/\{\{\s*agendar_link\s*\}\}/gi, calendarBookingLink)
      .replace(/\{\{\s*calendario_link\s*\}\}/gi, calendarBookingLink)
      .replace(/\{\{\s*confirmar_cita_link\s*\}\}/gi, calendarBookingLink);

    // Función de normalización y reemplazo de enlaces de conversión
    const normalizeLinks = (html: string): string => {
      let res = html;

      // 1. Enlaces directos de agenda (incluye https://afinitive.com.pe/agenda)
      res = res.replace(
        /href=["']https?:\/\/(?:www\.)?afinitive\.com(?:\.pe)?\/(?:agenda|agendar|calendario|booking|cita|reservar)[^"']*["']/gi,
        `href="${calendarBookingLink}" target="_blank"`
      );

      // 2. Anclas de agenda
      res = res.replace(
        /href=["'](#agendar|#agenda|#calendario|#cita|#booking|#confirmar-cita|#confirm-demo|#calendar-demo)["']/gi,
        `href="${calendarBookingLink}" target="_blank"`
      );

      // 3. Enlaces con texto de agendar/cita
      res = res.replace(
        /<a\s+([^>]*?)href=["'][^"']*["']([^>]*?>\s*(?:<[^>]+>\s*)*(?:Agenda|Agendar|Confirmar|Reservar)[^<]*?<\/a>)/gi,
        (match, p1, p2) => {
          if (match.includes(calendarBookingLink)) return match;
          return `<a ${p1}href="${calendarBookingLink}" target="_blank"${p2}`;
        }
      );

      // 4. Enlaces de WhatsApp
      res = res.replace(
        /href=["']https?:\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/[^"']*["']/gi,
        `href="${whatsappDemoLink}" target="_blank"`
      );

      res = res.replace(
        /href=["'](#whatsapp|#chat|#whatsapp-demo)["']/gi,
        `href="${whatsappDemoLink}" target="_blank"`
      );

      res = res.replace(
        /<a\s+([^>]*?)href=["'][^"']*["']([^>]*?>\s*(?:<[^>]+>\s*)*(?:Chat|WhatsApp|Especialistas)[^<]*?<\/a>)/gi,
        (match, p1, p2) => {
          if (match.includes(whatsappDemoLink)) return match;
          return `<a ${p1}href="${whatsappDemoLink}" target="_blank"${p2}`;
        }
      );

      return res;
    };

    // MODO FULL HTML (Landing completa autónoma)
    const isFull = templateType === 'full_html' || content.toLowerCase().includes('<!doctype') || content.toLowerCase().includes('<html');
    if (isFull) {
      return normalizeLinks(content);
    }

    // MODO STANDARD WRAPPER
    let formattedBody = content;
    if (!formattedBody.includes('<p>') && !formattedBody.includes('<div>') && !formattedBody.includes('<br')) {
      formattedBody = formattedBody.replace(/\n/g, '<br />');
    }

    const actionButtons = `
      <div style="text-align: center; margin: 30px 0 25px 0;">
        <div style="margin-bottom: 18px;">
          <a href="${calendarBookingLink}" target="_blank" style="display: inline-block; background-color: #0D1B2A; color: #FFFFFF; padding: 12px 30px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 6px; letter-spacing: 0.5px; font-family: Arial, sans-serif;">
            📅 CONFIRMAR CITA
          </a>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #E2E8F0;">
          <p style="font-size: 13px; color: #64748B; margin: 0 0 10px 0; text-align: center; font-family: Arial, sans-serif;">
            Si deseas más información o cambiar la cita contáctanos aquí:
          </p>
          <a href="${whatsappDemoLink}" target="_blank" style="display: inline-block; background-color: #25D366; color: #FFFFFF; padding: 10px 24px; font-weight: bold; font-size: 13px; text-decoration: none; border-radius: 6px; letter-spacing: 0.5px; font-family: Arial, sans-serif;">
            💬 Chatear por WhatsApp
          </a>
        </div>
      </div>
    `;

    if (formattedBody.includes('[CONFIRMAR_CITA]')) {
      formattedBody = formattedBody.replace('[CONFIRMAR_CITA]', actionButtons);
    } else if (formattedBody.includes('[AGENDAR_LLAMADA]')) {
      formattedBody = formattedBody.replace('[AGENDAR_LLAMADA]', actionButtons);
    } else {
      formattedBody = formattedBody + actionButtons;
    }

    const activeSig = SIGNATURES_PREVIEW.ricardo;
    const logoUrl = 'https://links.afinitive.com.pe/img/afinitive_logo.png';

    const wrappedHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { margin: 0; padding: 0; background-color: #F0F4F8; font-family: Arial, Helvetica, sans-serif; }
        </style>
      </head>
      <body>
        <div style="background-color: #F0F4F8; padding: 30px 15px; min-height: 100vh;">
          <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;">
            <!-- Cabecera -->
            <div style="padding: 25px 35px 20px 35px; border-bottom: 1px solid #F1F5F9; background-color: #FFFFFF;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td valign="middle" style="padding-right: 15px; line-height: 0;">
                    <img src="${logoUrl}" alt="Afinitive Logo" width="60" style="display: block; border: none;">
                  </td>
                  <td valign="middle" style="line-height: 1.15;">
                    <div style="font-family: Arial, sans-serif;">
                      <span style="font-size: 10px; color: #5B728A; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 1px;">AFINITIVE</span>
                      <span style="font-size: 16px; color: #0F2942; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; display: block;">WEALTH MANAGEMENT</span>
                    </div>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Cuerpo -->
            <div style="padding: 25px 35px 20px 35px; font-size: 14px; line-height: 1.6; color: #334155; text-align: justify;">
              ${formattedBody}
            </div>

            <!-- Firma -->
            <div style="background-color: #ffffff; padding: 20px 35px 25px 35px; border-top: 1px solid #F1F5F9;">
              ${activeSig}
            </div>

            <!-- Pie -->
            <div style="background-color: #F8FAFC; padding: 12px; text-align: center; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0;">
              Este correo de invitación contiene elementos de monitoreo de recepción. Afinitive Inc.
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    return normalizeLinks(wrappedHtml);
  }, [rawHtmlOrBody, templateType, simulatedName, greeting, formattedDate, operatorName, operatorRole, signatureId]);

  return (
    <div className="bg-[#070F1E] border border-brand-gold/25 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
      {/* Barra Superior de Control de la Vista Previa */}
      <div className="p-4 bg-gradient-to-r from-[#0D1B2A] to-[#0A1420] border-b border-brand-gold/15 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand-gold/10 border border-brand-gold/30 text-brand-gold">
            <Eye className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                Vista Previa en Vivo
              </h3>
              {createdBy === 'ai_agent' && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-purple-400" /> Agente IA
                </span>
              )}
              {templateType === 'full_html' ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Landing HTML Completo
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
                  Plantilla Corporativa
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-md">
              {templateName} &bull; Asunto: <span className="text-slate-300 italic">{subject}</span>
            </p>
          </div>
        </div>

        {/* Controles de Dispositivo & Modo Código */}
        <div className="flex items-center gap-2">
          {/* Simulador de Nombre */}
          <div className="flex items-center gap-1.5 bg-[#070F1E] border border-brand-gold/20 rounded-lg px-2.5 py-1 text-xs text-slate-300">
            <User className="w-3.5 h-3.5 text-brand-gold" />
            <span className="text-[10px] text-slate-400">Simular:</span>
            <input
              type="text"
              value={simulatedName}
              onChange={(e) => setSimulatedName(e.target.value)}
              className="bg-transparent border-none text-xs text-brand-gold font-semibold outline-none w-20 sm:w-24 placeholder-slate-600"
              placeholder="Nombre"
            />
          </div>

          {/* Toggle Código / Visual */}
          <button
            type="button"
            onClick={() => setViewCode(!viewCode)}
            className={`p-1.5 rounded-lg border text-xs font-medium transition-all ${
              viewCode 
                ? 'bg-brand-gold text-brand-navy border-brand-gold font-bold' 
                : 'bg-brand-navy-dark text-slate-400 border-brand-gold/15 hover:text-slate-200'
            }`}
            title="Ver código fuente HTML"
          >
            <Code className="w-4 h-4" />
          </button>

          {/* Selector Desktop / Mobile */}
          <div className="flex items-center bg-[#070F1E] border border-brand-gold/20 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setDeviceMode('desktop')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                deviceMode === 'desktop'
                  ? 'bg-brand-gold text-brand-navy shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setDeviceMode('mobile')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-all ${
                deviceMode === 'mobile'
                  ? 'bg-brand-gold text-brand-navy shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Móvil</span>
            </button>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="p-1.5 rounded-lg bg-brand-navy-dark text-slate-400 hover:text-brand-gold border border-brand-gold/15 transition-all"
              title="Refrescar vista previa"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Contenedor del Visualizador */}
      <div className="p-4 sm:p-6 bg-[#040810] flex items-center justify-center min-h-[460px] overflow-x-auto">
        {viewCode ? (
          <div className="w-full max-w-4xl max-h-[600px] overflow-auto bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400">
            <pre className="whitespace-pre-wrap">{renderedFullHtml}</pre>
          </div>
        ) : (
          <div
            className={`transition-all duration-300 rounded-xl overflow-hidden shadow-2xl border ${
              deviceMode === 'mobile'
                ? 'w-[375px] max-w-full h-[620px] border-slate-700 bg-slate-900 ring-8 ring-slate-800'
                : 'w-[640px] max-w-full h-[640px] border-slate-700 bg-white'
            }`}
          >
            {/* Si es modo móvil, barra superior simulada */}
            {deviceMode === 'mobile' && (
              <div className="bg-slate-950 px-4 py-1.5 flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-800">
                <span>9:41 AM</span>
                <span className="font-semibold text-slate-300">Afinitive Mail</span>
                <span>100% 🔋</span>
              </div>
            )}
            <iframe
              title="Vista Previa de Correo"
              srcDoc={renderedFullHtml}
              className="w-full h-full border-none bg-white"
              sandbox="allow-same-origin allow-popups"
            />
          </div>
        )}
      </div>
    </div>
  );
};
