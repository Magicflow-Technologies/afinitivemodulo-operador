import React, { useState, useMemo } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  FileCode, 
  Trash2, 
  Check, 
  Plus, 
  Search,
  AlertCircle,
  Image as ImageIcon,
  FileText,
  Layout,
  MessageCircle,
  Calendar,
  Ticket,
  Link2,
  Eye,
  Edit3
} from 'lucide-react';

export interface EmailTemplateItem {
  id: string;
  name: string;
  subject: string;
  type: 'full_html' | 'standard_wrapper';
  actionType?: 'whatsapp_lead' | 'calendar_booking' | 'event_invitation' | 'custom_html';
  action_type?: string;
  htmlContent?: string;
  html_content?: string;
  category: string;
  createdBy?: string;
  created_by?: string;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
}

interface CustomButtonConfig {
  id: string;
  tipo: 'whatsapp' | 'registro' | 'agenda' | 'personalizado';
  texto: string;
  url: string;
  color: 'gold' | 'green' | 'blue' | 'dark';
}

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: EmailTemplateItem[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: EmailTemplateItem) => void;
  onUploadHtml: (fileOrContent: File | string, name: string, subject: string, category: string, actionType?: string, existingId?: string) => Promise<void>;
  onDeleteTemplate: (id: string) => Promise<void>;
}

export const TemplateManagerModal: React.FC<TemplateManagerModalProps> = ({
  isOpen,
  onClose,
  templates,
  selectedTemplateId,
  onSelectTemplate,
  onUploadHtml,
  onDeleteTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'builder'>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);

  // Estados del Creador Visual de Plantillas
  const [layoutMode, setLayoutMode] = useState<'header_image_sig' | 'image_sig' | 'image_only' | 'header_text_sig'>('header_image_sig');

  // Metadatos
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Inmobiliario');

  // Contenido
  const [imageUrl, setImageUrl] = useState('https://links.afinitive.com.pe/img/evento.jpeg');
  const [imageClickUrl, setImageClickUrl] = useState('');
  const imageAlt = 'Oportunidad de Inversión Afinitive';
  const [textContent, setTextContent] = useState('Estimado/a {{nombre}}:\n\nLe escribimos para extenderle una invitación exclusiva a nuestra próxima presentación privada sobre oportunidades de inversión y optimización patrimonial.');

  // Botones Interactivos
  const [buttons, setButtons] = useState<CustomButtonConfig[]>([
    {
      id: 'btn-1',
      tipo: 'whatsapp',
      texto: '💬 Contactar por WhatsApp',
      url: 'https://wa.me/51982100208?text=Hola%20Ricardo,%20deseo%20m%C3%A1s%20informaci%C3%B3n',
      color: 'gold',
    }
  ]);

  // Iniciar edición de una plantilla existente
  const handleStartEditTemplate = (tpl: EmailTemplateItem) => {
    setEditingTemplateId(tpl.id);
    setTemplateName(tpl.name || '');
    setTemplateSubject(tpl.subject || '');
    setTemplateCategory(tpl.category || 'Inmobiliario');

    const html = tpl.html_content || tpl.htmlContent || '';
    if (html) {
      // Intentar extraer imagen
      const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
      if (imgMatch && imgMatch[1] && !imgMatch[1].includes('afinitive_logo') && !imgMatch[1].includes('rbertalmio')) {
        setImageUrl(imgMatch[1]);
      }

      // Intentar extraer enlace de imagen si existe
      const linkMatch = html.match(/<a[^>]+href=["']([^"']+)["'][^>]*>\s*<img/i);
      if (linkMatch && linkMatch[1]) {
        setImageClickUrl(linkMatch[1]);
      }
    }

    setFormError(null);
    setActiveTab('builder');
  };

  // Iniciar creación de nueva plantilla limpia
  const handleStartCreateNew = () => {
    setEditingTemplateId(null);
    setTemplateName('');
    setTemplateSubject('');
    setTemplateCategory('Inmobiliario');
    setImageUrl('https://links.afinitive.com.pe/img/evento.jpeg');
    setImageClickUrl('');
    setTextContent('Estimado/a {{nombre}}:\n\nLe escribimos para extenderle una invitación exclusiva a nuestra próxima presentación privada sobre oportunidades de inversión y optimización patrimonial.');
    setButtons([
      {
        id: 'btn-1',
        tipo: 'whatsapp',
        texto: '💬 Contactar por WhatsApp',
        url: 'https://wa.me/51982100208?text=Hola%20Ricardo,%20deseo%20m%C3%A1s%20informaci%C3%B3n',
        color: 'gold',
      }
    ]);
    setFormError(null);
    setActiveTab('builder');
  };

  // Manejador de subida de imagen local (Convierte a Data URL)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setImageUrl(reader.result.toString());
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Agregar botón CTA
  const handleAddButton = (tipo: 'whatsapp' | 'registro' | 'agenda' | 'personalizado') => {
    let defaultText = 'Hacer clic aquí';
    let defaultUrl = 'https://afinitive.com.pe';
    let defaultColor: 'gold' | 'green' | 'blue' | 'dark' = 'gold';

    if (tipo === 'whatsapp') {
      defaultText = '💬 Escríbenos por WhatsApp';
      defaultUrl = 'https://wa.me/51982100208?text=Hola%20Ricardo,%20deseo%20m%C3%A1s%20informaci%C3%B3n';
      defaultColor = 'green';
    } else if (tipo === 'registro') {
      defaultText = '🎟️ Registrarme al Evento';
      defaultUrl = 'https://eventos.afinitive.com.pe/?id=regsitro-de-tiktok';
      defaultColor = 'gold';
    } else if (tipo === 'agenda') {
      defaultText = '📅 Agendar Reunión con Ricardo';
      defaultUrl = 'https://calendly.com/rbertalmio-afinitive';
      defaultColor = 'blue';
    }

    const newBtn: CustomButtonConfig = {
      id: `btn-${Date.now()}`,
      tipo,
      texto: defaultText,
      url: defaultUrl,
      color: defaultColor,
    };
    setButtons([...buttons, newBtn]);
  };

  const handleRemoveButton = (id: string) => {
    setButtons(buttons.filter((b) => b.id !== id));
  };

  const handleUpdateButton = (id: string, updates: Partial<CustomButtonConfig>) => {
    setButtons(buttons.map((b) => (b.id === id ? { ...b, ...updates } : b)));
  };

  // Generador de HTML Automático en base a la selección (Siempre fondo blanco con letras oscuras)
  const generatedHtml = useMemo(() => {
    const bgOuter = '#F0F4F8';
    const bgCard = '#FFFFFF';
    const textColor = '#334155';
    const cardBorder = '#E2E8F0';

    const hasHeader = layoutMode === 'header_image_sig' || layoutMode === 'header_text_sig';
    const hasImage = layoutMode !== 'header_text_sig' && !!imageUrl;
    const hasText = (layoutMode === 'header_text_sig' || textContent.trim().length > 0) && layoutMode !== 'image_only';
    const hasSignature = layoutMode !== 'image_only';

    // 1. Encabezado Corporativo Oficial Afinitive
    const headerHtml = hasHeader ? `
      <!-- Encabezado Corporativo Oficial Afinitive -->
      <tr>
        <td style="padding: 26px 35px 20px 35px; border-bottom: 1px solid #F1F5F9; background-color: #FFFFFF;">
          <table cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td valign="middle" style="padding-right: 15px; line-height: 0;">
                <img src="https://links.afinitive.com.pe/img/afinitive_logo.png" alt="Afinitive Logo" width="60" style="display: block; border: none; max-width: 60px; height: auto;" />
              </td>
              <td valign="middle" style="line-height: 1.15;">
                <div style="font-family: Arial, sans-serif;">
                  <span style="font-size: 10px; color: #5B728A; letter-spacing: 2px; text-transform: uppercase; display: block; margin-bottom: 1px; font-weight: 600;">AFINITIVE</span>
                  <span style="font-size: 16px; color: #0F2942; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; display: block;">WEALTH MANAGEMENT</span>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    ` : '';

    // 2. Imagen / Flyer de la Campaña
    const imageBlockHtml = hasImage ? `
      <!-- Flyer / Imagen de Campaña -->
      <tr>
        <td align="center" style="padding: ${layoutMode === 'image_only' ? '0' : '20px 35px 12px 35px'}; background-color: #FFFFFF; line-height: 0;">
          ${imageClickUrl ? `<a href="${imageClickUrl}" target="_blank" style="text-decoration: none; display: block;">` : ''}
            <img 
              src="${imageUrl}" 
              alt="${imageAlt}" 
              width="530" 
              style="display: block; width: 100%; max-width: 530px; height: auto; border-radius: ${layoutMode === 'image_only' ? '10px' : '8px'}; border: 0; outline: none; text-decoration: none;" 
            />
          ${imageClickUrl ? `</a>` : ''}
        </td>
      </tr>
    ` : '';

    // 3. Texto HTML
    const formattedParagraphs = textContent
      .split('\n\n')
      .map(p => `<p style="margin: 0 0 14px 0; line-height: 1.65;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    const textBlockHtml = hasText ? `
      <!-- Cuerpo de Texto -->
      <tr>
        <td style="padding: 24px 35px 14px 35px; color: ${textColor}; font-family: Arial, Helvetica, sans-serif; font-size: 14.5px; line-height: 1.65; background-color: #FFFFFF;">
          ${formattedParagraphs}
        </td>
      </tr>
    ` : '';

    // 4. Botones CTA HTML
    const buttonsHtml = buttons.length > 0 ? `
      <!-- Botones de Acción (CTAs) -->
      <tr>
        <td align="center" style="padding: 14px 35px 24px 35px; background-color: #FFFFFF;">
          <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin: 0 auto;">
            ${buttons.map(btn => {
              let btnBg = 'background-color: #0D1B2A; color: #ffffff !important;';
              if (btn.color === 'green') {
                btnBg = 'background-color: #25D366; color: #ffffff !important; box-shadow: 0 2px 6px rgba(37,211,102,0.25);';
              } else if (btn.color === 'blue') {
                btnBg = 'background-color: #2563EB; color: #ffffff !important;';
              } else if (btn.color === 'gold') {
                btnBg = 'background-color: #B48A3C; background: linear-gradient(135deg, #C9A050 0%, #9E742A 100%); color: #ffffff !important;';
              }

              return `
                <tr>
                  <td align="center" style="padding: 6px 0;">
                    <a href="${btn.url || '{{whatsapp_link}}'}" target="_blank" style="${btnBg} display: inline-block; font-family: Arial, Helvetica, sans-serif; font-size: 14px; font-weight: bold; line-height: 1.2; text-decoration: none; padding: 13px 30px; border-radius: 6px; letter-spacing: 0.5px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.12); -webkit-text-size-adjust: none;">
                      ${btn.texto}
                    </a>
                  </td>
                </tr>
              `;
            }).join('')}
          </table>
        </td>
      </tr>
    ` : '';

    // 5. Firma Oficial Ricardo Bertalmio
    const signatureHtml = hasSignature ? `
      <!-- Firma Oficial de Ricardo Bertalmio -->
      <tr>
        <td style="padding: 20px 35px 26px 35px; border-top: 1px solid #F1F5F9; background-color: #FFFFFF;">
          <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; width: 100%; background-color: #FFFFFF;">
            <tr>
              <td valign="middle" style="padding-right: 15px; width: 75px;">
                <img src="https://dashbportal.com/afinitive/rbertalmio.png" alt="Ricardo Bertalmio Ruibal" width="68" style="display: block; border-radius: 50%; border: 2px solid #E2E8F0; box-shadow: 0 2px 6px rgba(0,0,0,0.06);" />
              </td>
              <td valign="middle">
                <div style="font-size: 16px; color: #000000; font-weight: bold; margin: 0; line-height: 1.15; font-family: Arial, sans-serif;">Ricardo Bertalmio Ruibal</div>
                <div style="font-size: 12.5px; color: #555555; margin: 2px 0 6px 0; font-family: Arial, sans-serif;">CEO Afinitive Wealth Management</div>
                <table cellpadding="0" cellspacing="0" border="0" style="font-size: 11px; color: #333333; font-family: Arial, sans-serif;">
                  <tr>
                    <td valign="middle" style="padding-right: 14px; padding-bottom: 3px; white-space: nowrap;">
                      <span style="vertical-align: middle;">📞 (511) 982100208</span>
                    </td>
                    <td valign="middle" style="padding-bottom: 3px; white-space: nowrap;">
                      <span style="vertical-align: middle;">📍 San Isidro, Lima</span>
                    </td>
                  </tr>
                  <tr>
                    <td valign="middle" style="padding-right: 14px; white-space: nowrap;">
                      <a href="https://afinitive.com.pe" target="_blank" style="color: #0284c7; text-decoration: none;">
                        <span style="vertical-align: middle;">🌐 afinitive.com.pe</span>
                      </a>
                    </td>
                    <td valign="middle" style="white-space: nowrap;">
                      <a href="https://www.linkedin.com/in/ricardo-bertalmio" target="_blank" style="color: #0284c7; text-decoration: none;">
                        <span style="vertical-align: middle;">💼 in/ricardo-bertalmio</span>
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    ` : '';

    return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${templateSubject || 'Invitación Exclusiva - Afinitive'}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${bgOuter}; color: #1e293b; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${bgOuter}; font-family: Arial, Helvetica, sans-serif;">

  <div style="background-color: ${bgOuter}; padding: 25px 15px; width: 100%; box-sizing: border-box;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: ${bgCard}; border-radius: 10px; overflow: hidden; border: 1px solid ${cardBorder}; box-shadow: 0 4px 14px rgba(0,0,0,0.06);" role="presentation">
      ${headerHtml}
      ${imageBlockHtml}
      ${textBlockHtml}
      ${buttonsHtml}
      ${signatureHtml}
    </table>
  </div>

</body>
</html>`.trim();
  }, [layoutMode, templateSubject, imageUrl, imageClickUrl, imageAlt, textContent, buttons]);

  // Guardar plantilla creada
  const handleSaveVisualTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!templateName.trim()) {
      setFormError('Por favor ingresa un nombre para la plantilla.');
      return;
    }

    if (!templateSubject.trim()) {
      setFormError('Por favor ingresa el asunto del correo.');
      return;
    }

    setUploading(true);
    try {
      const actionType = buttons.some(b => b.tipo === 'whatsapp') ? 'whatsapp_lead' : 'event_invitation';
      await onUploadHtml(generatedHtml, templateName.trim(), templateSubject.trim(), templateCategory, actionType, editingTemplateId || undefined);
      
      // Limpiar y regresar
      setEditingTemplateId(null);
      setFormError(null);
      setActiveTab('catalog');
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la plantilla.');
    } finally {
      setUploading(false);
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.category && t.category.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#0B1522] border border-brand-gold/30 rounded-2xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-brand-gold/20 bg-[#070F19]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Diseñador y Gestor de Plantillas de Correo</h3>
              <p className="text-xs text-slate-400">
                Diseña plantillas visualmente con encabezado Afinitive, imagen, botones de WhatsApp/Registro y firma ejecutiva.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pestañas */}
        <div className="flex border-b border-brand-gold/15 bg-[#050C14] px-5">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCode className="w-4 h-4" />
            <span>Biblioteca de Plantillas ({templates.length})</span>
          </button>
          <button
            onClick={handleStartCreateNew}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'builder'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {editingTemplateId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{editingTemplateId ? 'Editando Plantilla' : '+ Crear Nueva Plantilla Visual'}</span>
          </button>
        </div>

        {/* Contenido Principal */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {activeTab === 'catalog' ? (
            <div className="space-y-4">
              {/* Buscador */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar plantilla por nombre, asunto o categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-[#0D1B2A] border border-brand-gold/20 focus:border-brand-gold rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none"
                />
              </div>

              {/* Lista de Plantillas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplateId === template.id;
                  const isAi = (template.createdBy || template.created_by) === 'ai_agent';
                  const isFull = template.type === 'full_html';
                  const isWhatsapp = template.actionType === 'whatsapp_lead' || template.action_type === 'whatsapp_lead' || template.name?.toLowerCase().includes('whatsapp');
                  const isEvent = template.actionType === 'event_invitation' || template.category === 'Eventos';

                  return (
                    <div
                      key={template.id}
                      onClick={() => {
                        onSelectTemplate(template);
                        onClose();
                      }}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between group relative ${
                        isSelected
                          ? 'bg-brand-gold/10 border-brand-gold ring-1 ring-brand-gold/50 shadow-lg'
                          : 'bg-[#09131E] border-brand-gold/15 hover:border-brand-gold/40 hover:bg-[#0D1B2A]'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-bold text-sm text-slate-100 group-hover:text-brand-gold transition-colors">
                            {template.name}
                          </span>
                          {isSelected && (
                            <span className="p-1 rounded-full bg-brand-gold text-brand-navy shrink-0">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 line-clamp-2">
                          Asunto: <span className="text-slate-300 italic">{template.subject}</span>
                        </p>

                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {isWhatsapp ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                              💬 Captación WhatsApp
                            </span>
                          ) : isEvent ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                              🎟️ Evento & Flyer
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1">
                              📅 Agenda 1 a 1
                            </span>
                          )}

                          {isAi && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 flex items-center gap-1">
                              <Sparkles className="w-3 h-3 text-purple-400" /> Agente IA
                            </span>
                          )}
                          {isFull && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                              Visual / HTML
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400 bg-slate-800 border border-slate-700">
                            {template.category || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-brand-gold/10 mt-3 pt-2 text-[11px] text-slate-500">
                        <span>{template.created_at ? new Date(template.created_at).toLocaleDateString() : 'Sistema'}</span>
                        
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEditTemplate(template);
                            }}
                            className="text-brand-gold hover:text-amber-300 p-1 hover:bg-brand-gold/10 rounded transition-all cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            title="Editar esta plantilla"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>

                          {(template.createdBy || template.created_by) !== 'system' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`¿Eliminar la plantilla "${template.name}"?`)) {
                                  onDeleteTemplate(template.id);
                                }
                              }}
                              className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                              title="Eliminar plantilla"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredTemplates.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-slate-500 text-xs">
                    No se encontraron plantillas con ese criterio.
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Tab: Creador Visual de Plantillas */
            <form onSubmit={handleSaveVisualTemplate} className="space-y-5">
              
              {editingTemplateId && (
                <div className="p-3 bg-brand-gold/15 border border-brand-gold/40 rounded-xl text-brand-gold text-xs flex items-center justify-between shadow-sm">
                  <span className="flex items-center gap-2 font-medium">
                    <Edit3 className="w-4 h-4 text-brand-gold shrink-0" />
                    <span>Modo Edición: Modificando la plantilla <strong>"{templateName}"</strong></span>
                  </span>
                  <button
                    type="button"
                    onClick={handleStartCreateNew}
                    className="text-[11px] underline text-slate-300 hover:text-white cursor-pointer ml-3 shrink-0"
                  >
                    Crear como nueva en su lugar
                  </button>
                </div>
              )}

              {formError && (
                <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. SELECCIÓN DE ESTRUCTURA / FORMATO */}
              <div className="space-y-2">
                <label className="text-xs text-brand-gold font-bold uppercase tracking-wider flex items-center gap-2">
                  <Layout className="w-4 h-4" /> 1. Elige el Formato / Estructura del Correo:
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  
                  {/* Opción 1 */}
                  <div
                    onClick={() => setLayoutMode('header_image_sig')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      layoutMode === 'header_image_sig'
                        ? 'bg-brand-gold/15 border-brand-gold ring-1 ring-brand-gold shadow-md'
                        : 'bg-[#08121D] border-brand-gold/15 hover:border-brand-gold/30 hover:bg-[#0D1B2A]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-100">Encabezado + Imagen + Firma</span>
                      {layoutMode === 'header_image_sig' && <Check className="w-4 h-4 text-brand-gold" />}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Mantiene el logo superior de Afinitive, incrusta la imagen/flyer y la firma de Ricardo Bertalmio.
                    </p>
                  </div>

                  {/* Opción 2 */}
                  <div
                    onClick={() => setLayoutMode('image_sig')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      layoutMode === 'image_sig'
                        ? 'bg-brand-gold/15 border-brand-gold ring-1 ring-brand-gold shadow-md'
                        : 'bg-[#08121D] border-brand-gold/15 hover:border-brand-gold/30 hover:bg-[#0D1B2A]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-100">Sin Encabezado + Firma</span>
                      {layoutMode === 'image_sig' && <Check className="w-4 h-4 text-brand-gold" />}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Oculta el logo superior, muestra la imagen/flyer y finaliza con la firma de Ricardo.
                    </p>
                  </div>

                  {/* Opción 3 */}
                  <div
                    onClick={() => setLayoutMode('image_only')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      layoutMode === 'image_only'
                        ? 'bg-brand-gold/15 border-brand-gold ring-1 ring-brand-gold shadow-md'
                        : 'bg-[#08121D] border-brand-gold/15 hover:border-brand-gold/30 hover:bg-[#0D1B2A]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-100">Solo Flyer / Imagen</span>
                      {layoutMode === 'image_only' && <Check className="w-4 h-4 text-brand-gold" />}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Oculta el encabezado y la firma. Muestra únicamente la imagen publicitaria limpia.
                    </p>
                  </div>

                  {/* Opción 4 */}
                  <div
                    onClick={() => setLayoutMode('header_text_sig')}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      layoutMode === 'header_text_sig'
                        ? 'bg-brand-gold/15 border-brand-gold ring-1 ring-brand-gold shadow-md'
                        : 'bg-[#08121D] border-brand-gold/15 hover:border-brand-gold/30 hover:bg-[#0D1B2A]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-slate-100">Carta / Texto Institucional</span>
                      {layoutMode === 'header_text_sig' && <Check className="w-4 h-4 text-brand-gold" />}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Encabezado Afinitive + Texto redactado formal + Firma ejecutiva de Ricardo.
                    </p>
                  </div>

                </div>
              </div>

              {/* CONTENEDOR EN 2 COLUMNAS: FORMULARIO + VISTA PREVIA EN VIVO */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Columna Izquierda: Configuración de Contenido y Botones (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  
                  {/* Datos Básicos */}
                  <div className="bg-[#08121D] p-3.5 rounded-xl border border-brand-gold/15 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-brand-gold font-semibold uppercase block">
                          Nombre de la Plantilla *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Taller Zoom IA - Ricardo"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          className="w-full px-3 py-2 bg-[#0D1B2A] border border-brand-gold/20 rounded-lg text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-brand-gold"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-brand-gold font-semibold uppercase block">
                          Categoría
                        </label>
                        <select
                          value={templateCategory}
                          onChange={(e) => setTemplateCategory(e.target.value)}
                          className="w-full px-3 py-2 bg-[#0D1B2A] border border-brand-gold/20 rounded-lg text-xs text-slate-100 outline-none focus:border-brand-gold cursor-pointer"
                        >
                          <option value="Eventos">Eventos</option>
                          <option value="Inmobiliario">Inmobiliario</option>
                          <option value="Prospección">Prospección</option>
                          <option value="Seguimiento">Seguimiento</option>
                          <option value="General">General</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-brand-gold font-semibold uppercase block">
                        Asunto del Correo *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: {{nombre}}, invitación exclusiva al evento online de Afinitive"
                        value={templateSubject}
                        onChange={(e) => setTemplateSubject(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0D1B2A] border border-brand-gold/20 rounded-lg text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-brand-gold"
                      />
                    </div>
                  </div>

                  {/* 2. ADJUNTAR IMAGEN (Si el layout lo soporta) */}
                  {layoutMode !== 'header_text_sig' && (
                    <div className="bg-[#08121D] p-3.5 rounded-xl border border-brand-gold/15 space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-brand-gold font-bold uppercase tracking-wider flex items-center gap-2">
                          <ImageIcon className="w-4 h-4" /> 2. Adjuntar Imagen / Flyer:
                        </label>
                        {imageUrl && (
                          <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Imagen cargada
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Opción A: Subir Archivo */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-slate-300 font-medium block">Opción A: Subir imagen desde tu PC</span>
                          <label className="flex items-center justify-center gap-2 px-3 py-2.5 bg-[#0D1B2A] hover:bg-brand-navy-dark border border-dashed border-brand-gold/40 hover:border-brand-gold rounded-lg text-xs text-slate-200 cursor-pointer transition-all shadow-sm">
                            <Upload className="w-4 h-4 text-brand-gold" />
                            <span>Seleccionar archivo (PNG / JPG / WebP)</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageFileChange}
                              className="hidden"
                            />
                          </label>
                        </div>

                        {/* Opción B: Pegar URL */}
                        <div className="space-y-1.5">
                          <span className="text-[11px] text-slate-300 font-medium block">Opción B: Pegar enlace de imagen (URL)</span>
                          <input
                            type="url"
                            placeholder="https://links.afinitive.com.pe/img/evento.jpeg"
                            value={imageUrl}
                            onChange={(e) => setImageUrl(e.target.value)}
                            className="w-full px-3 py-2 bg-[#0D1B2A] border border-brand-gold/20 rounded-lg text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-brand-gold font-mono text-[11px]"
                          />
                        </div>
                      </div>

                      {/* Enlace de Redirección de la Imagen */}
                      <div className="space-y-1 pt-1 border-t border-brand-gold/10">
                        <span className="text-[11px] text-slate-400 block">Link al hacer clic en la imagen (Opcional):</span>
                        <input
                          type="url"
                          placeholder="https://eventos.afinitive.com.pe/?id=regsitro-de-tiktok"
                          value={imageClickUrl}
                          onChange={(e) => setImageClickUrl(e.target.value)}
                          className="w-full px-3 py-1.5 bg-[#0D1B2A] border border-brand-gold/15 rounded-lg text-xs text-slate-300 placeholder-slate-600 outline-none focus:border-brand-gold"
                        />
                      </div>
                    </div>
                  )}

                  {/* 3. REDACTAR TEXTO */}
                  {layoutMode !== 'image_only' && (
                    <div className="bg-[#08121D] p-3.5 rounded-xl border border-brand-gold/15 space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-brand-gold font-bold uppercase tracking-wider flex items-center gap-2">
                          <FileText className="w-4 h-4" /> 3. Texto del Mensaje:
                        </label>
                        <span className="text-[10px] text-slate-400">
                          Usa <code className="text-amber-300">{'{{nombre}}'}</code> para personalizar
                        </span>
                      </div>
                      <textarea
                        rows={4}
                        placeholder="Estimado/a {{nombre}}:&#10;&#10;Escribe aquí el cuerpo del mensaje..."
                        value={textContent}
                        onChange={(e) => setTextContent(e.target.value)}
                        className="w-full px-3 py-2 bg-[#0D1B2A] border border-brand-gold/20 rounded-lg text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-brand-gold resize-y"
                      />
                    </div>
                  )}

                  {/* 4. BOTONES PERSONALIZADOS (CTAs) */}
                  <div className="bg-[#08121D] p-3.5 rounded-xl border border-brand-gold/15 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="text-xs text-brand-gold font-bold uppercase tracking-wider flex items-center gap-2">
                        <Ticket className="w-4 h-4" /> 4. Botones de Acción (CTAs):
                      </label>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          type="button"
                          onClick={() => handleAddButton('whatsapp')}
                          className="px-2 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <MessageCircle className="w-3 h-3" /> + WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddButton('registro')}
                          className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Ticket className="w-3 h-3" /> + Registro
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddButton('agenda')}
                          className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Calendar className="w-3 h-3" /> + Agenda
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddButton('personalizado')}
                          className="px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Link2 className="w-3 h-3" /> + Link
                        </button>
                      </div>
                    </div>

                    {buttons.length === 0 ? (
                      <p className="text-[11px] text-slate-500 italic">
                        No hay botones agregados. Puedes añadir botones de WhatsApp, Registro o Agenda con los botones superiores.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {buttons.map((btn, index) => (
                          <div key={btn.id} className="p-2.5 bg-[#0D1B2A] rounded-lg border border-brand-gold/15 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-bold text-slate-300">
                                Botón #{index + 1} ({btn.tipo.toUpperCase()})
                              </span>
                              <div className="flex items-center gap-2">
                                <select
                                  value={btn.color}
                                  onChange={(e) => handleUpdateButton(btn.id, { color: e.target.value as any })}
                                  className="px-2 py-0.5 bg-[#08121D] border border-slate-700 rounded text-[10px] text-slate-300 outline-none"
                                >
                                  <option value="gold">Dorado Corporativo</option>
                                  <option value="green">Verde WhatsApp</option>
                                  <option value="blue">Azul Calendario</option>
                                  <option value="dark">Oscuro Elegante</option>
                                </select>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveButton(btn.id)}
                                  className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded cursor-pointer"
                                  title="Quitar botón"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div>
                                <input
                                  type="text"
                                  placeholder="Texto del botón"
                                  value={btn.texto}
                                  onChange={(e) => handleUpdateButton(btn.id, { texto: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-[#08121D] border border-brand-gold/15 rounded text-xs text-slate-100 outline-none"
                                />
                              </div>
                              <div>
                                <input
                                  type="text"
                                  placeholder="URL destino (https://...)"
                                  value={btn.url}
                                  onChange={(e) => handleUpdateButton(btn.id, { url: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-[#08121D] border border-brand-gold/15 rounded text-xs text-slate-100 outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Estilo de Fondo Oficial (Siempre Fondo Blanco / Letras Oscuras) */}
                  <div className="flex items-center justify-between p-3 bg-[#08121D] rounded-xl border border-brand-gold/15 text-xs text-slate-300">
                    <span className="font-semibold text-slate-200">☀️ Formato Oficial Afinitive:</span>
                    <span className="px-3 py-1 rounded-lg font-bold text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                      ✓ Fondo Blanco / Letras Negras
                    </span>
                  </div>

                </div>

                {/* Columna Derecha: Vista Previa en Vivo (5 cols) */}
                <div className="lg:col-span-5 flex flex-col">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-brand-gold font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <Eye className="w-4 h-4" /> Vista Previa en Tiempo Real:
                    </span>
                    <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      Ancho 600px Responsive
                    </span>
                  </div>

                  <div className="bg-slate-900 border border-brand-gold/20 rounded-xl p-3 flex-1 overflow-y-auto max-h-[520px] shadow-inner">
                    <iframe
                      title="Live Email Preview"
                      srcDoc={generatedHtml}
                      className="w-full h-[480px] bg-transparent border-0 rounded"
                    />
                  </div>
                </div>

              </div>

              {/* Botones de Acción Finales */}
              <div className="flex justify-end gap-3 pt-3 border-t border-brand-gold/15">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-7 py-2.5 bg-gradient-to-r from-brand-gold-dark to-brand-gold hover:opacity-95 text-brand-navy font-bold rounded-xl text-xs shadow-lg hover:shadow-brand-gold/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-brand-navy border-t-transparent rounded-full animate-spin"></div>
                      <span>{editingTemplateId ? 'Actualizando Plantilla...' : 'Guardando en Biblioteca...'}</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingTemplateId ? 'Guardar Cambios en la Plantilla' : 'Guardar y Usar Plantilla'}</span>
                    </>
                  )}
                </button>
              </div>

            </form>
          )}
        </div>
      </div>
    </div>
  );
};
