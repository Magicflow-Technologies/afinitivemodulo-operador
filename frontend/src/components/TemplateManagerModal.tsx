import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  FileCode, 
  Trash2, 
  Check, 
  Plus, 
  Search,
  Code2,
  AlertCircle
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

interface TemplateManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: EmailTemplateItem[];
  selectedTemplateId: string | null;
  onSelectTemplate: (template: EmailTemplateItem) => void;
  onUploadHtml: (fileOrContent: File | string, name: string, subject: string, category: string, actionType?: string) => Promise<void>;
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
  const [activeTab, setActiveTab] = useState<'catalog' | 'upload'>('catalog');
  const [creationMode, setCreationMode] = useState<'file' | 'code'>('file');
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [rawHtmlCode, setRawHtmlCode] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Inmobiliario');
  const [templateActionType, setTemplateActionType] = useState<'whatsapp_lead' | 'calendar_booking'>('whatsapp_lead');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    setFormError(null);
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      setFormError('Solo se admiten archivos con extensión .html o .htm');
      return;
    }
    setDroppedFile(file);
    if (!templateName) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTemplateName(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
    if (!templateSubject) {
      setTemplateSubject('Invitación Exclusiva - Afinitive');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
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

    if (creationMode === 'file' && !droppedFile) {
      setFormError('Por favor selecciona o arrastra un archivo .html.');
      return;
    }

    if (creationMode === 'code' && !rawHtmlCode.trim()) {
      setFormError('Por favor escribe o pega el código HTML de la plantilla.');
      return;
    }

    setUploading(true);
    try {
      const payloadSource = creationMode === 'file' ? droppedFile! : rawHtmlCode.trim();
      await onUploadHtml(payloadSource, templateName.trim(), templateSubject.trim(), templateCategory, templateActionType);
      
      // Limpiar formulario al guardar
      setDroppedFile(null);
      setRawHtmlCode('');
      setTemplateName('');
      setTemplateSubject('');
      setFormError(null);
      setActiveTab('catalog');
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar la plantilla. Por favor verifica los datos.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0D1B2A] border border-brand-gold/30 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-brand-gold/20 bg-brand-navy-dark">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-100">Gestor de Plantillas de Correo</h3>
              <p className="text-xs text-slate-400">
                Selecciona plantillas de captación WhatsApp, agendamiento de citas o sube tus diseños en HTML.
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
        <div className="flex border-b border-brand-gold/15 bg-[#08111B] px-5">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Catálogo de Plantillas ({templates.length})</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('upload');
              setFormError(null);
            }}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'upload'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Crear / Subir Plantilla HTML</span>
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'catalog' ? (
            <>
              {/* Buscador */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar plantilla por nombre, asunto o categoría..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-brand-navy-dark border border-brand-gold/20 focus:border-brand-gold rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none"
                />
              </div>

              {/* Lista de Plantillas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredTemplates.map((template) => {
                  const isSelected = selectedTemplateId === template.id;
                  const isAi = (template.createdBy || template.created_by) === 'ai_agent';
                  const isFull = template.type === 'full_html';
                  const isWhatsapp = template.actionType === 'whatsapp_lead' || template.action_type === 'whatsapp_lead' || template.name?.toLowerCase().includes('whatsapp');
                  const isEvent = template.actionType === 'event_invitation' || template.category === 'Eventos & Landings';

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
                          : 'bg-[#09131E] border-brand-gold/15 hover:border-brand-gold/40 hover:bg-brand-navy-dark'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-100 group-hover:text-brand-gold transition-colors">
                              {template.name}
                            </span>
                          </div>
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
                              🎟️ Evento & Landing
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
                          {isFull ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              Landing HTML
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              Institucional
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded-full text-[10px] text-slate-400 bg-slate-800 border border-slate-700">
                            {template.category || 'General'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-brand-gold/10 mt-3 pt-2 text-[11px] text-slate-500">
                        <span>{template.created_at ? new Date(template.created_at).toLocaleDateString() : 'Sistema'}</span>
                        
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
                  );
                })}

                {filteredTemplates.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-slate-500 text-xs">
                    No se encontraron plantillas con ese criterio.
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Tab: Crear / Subir Plantilla HTML */
            <form onSubmit={handleSave} className="space-y-4">
              
              {/* Selector de Método de Creación */}
              <div className="flex bg-[#08111B] p-1 rounded-xl border border-brand-gold/20 gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setCreationMode('file');
                    setFormError(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    creationMode === 'file'
                      ? 'bg-brand-gold text-brand-navy shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Subir Archivo .HTML</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCreationMode('code');
                    setFormError(null);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    creationMode === 'code'
                      ? 'bg-brand-gold text-brand-navy shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Pegar / Escribir Código HTML</span>
                </button>
              </div>

              {/* Mensaje de Error si ocurre */}
              {formError && (
                <div className="p-3 bg-red-500/15 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{formError}</span>
                </div>
              )}

              {creationMode === 'file' ? (
                /* Zona Drag & Drop de Archivo */
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all flex flex-col items-center justify-center gap-2.5 cursor-pointer ${
                    dragActive
                      ? 'border-brand-gold bg-brand-gold/10'
                      : droppedFile
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-brand-gold/25 hover:border-brand-gold/50 bg-slate-950/40'
                  }`}
                  onClick={() => document.getElementById('html-file-upload-input')?.click()}
                >
                  <input
                    id="html-file-upload-input"
                    type="file"
                    accept=".html,.htm"
                    onChange={handleFileInput}
                    className="hidden"
                  />

                  <div className="p-3 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold">
                    <Upload className="w-5 h-5" />
                  </div>

                  {droppedFile ? (
                    <div>
                      <p className="font-bold text-sm text-emerald-400 flex items-center justify-center gap-1.5">
                        <Check className="w-4 h-4" /> {droppedFile.name}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {(droppedFile.size / 1024).toFixed(1)} KB &bull; Haz clic para cambiar archivo
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-xs sm:text-sm text-slate-200">
                        Arrastra tu archivo <span className="text-brand-gold font-mono">.html</span> aquí o haz clic para explorar
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Compatible con Mailchimp, BEE Free, Stripo, Figma o plantillas personalizadas.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* Editor / Textarea Directo para HTML */
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-brand-gold font-medium uppercase tracking-wider block">
                      Código HTML de la Plantilla
                    </label>
                    <span className="text-[10px] text-slate-400">
                      Usa variables como <code className="text-amber-300">{'{{nombre}}'}</code>, <code className="text-amber-300">[SOLO_WHATSAPP]</code>, etc.
                    </span>
                  </div>
                  <textarea
                    rows={8}
                    required
                    placeholder="<!DOCTYPE html>&#10;<html>&#10;<body>&#10;  <h2>Hola {{nombre}},</h2>&#10;  <p>Te invitamos a conocer nuestras oportunidades...</p>&#10;  <p>[SOLO_WHATSAPP]</p>&#10;</body>&#10;</html>"
                    value={rawHtmlCode}
                    onChange={(e) => setRawHtmlCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-brand-navy-dark border border-brand-gold/20 rounded-xl text-xs text-slate-100 placeholder-slate-600 outline-none focus:border-brand-gold font-mono resize-y"
                  />
                </div>
              )}

              {/* Formulario de Metadatos */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs text-brand-gold font-medium uppercase tracking-wider block">
                    Nombre de la Plantilla <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Preventa The New York Tower"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-brand-navy-dark border border-brand-gold/20 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-brand-gold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-brand-gold font-medium uppercase tracking-wider block">
                    Tipo de Acción
                  </label>
                  <select
                    value={templateActionType}
                    onChange={(e) => setTemplateActionType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-brand-navy-dark border border-brand-gold/20 rounded-xl text-xs text-slate-100 outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="whatsapp_lead">💬 Captación WhatsApp (Sin slots)</option>
                    <option value="calendar_booking">📅 Agendamiento Cita 1 a 1</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-brand-gold font-medium uppercase tracking-wider block">
                    Categoría
                  </label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-brand-navy-dark border border-brand-gold/20 rounded-xl text-xs text-slate-100 outline-none focus:border-brand-gold cursor-pointer"
                  >
                    <option value="Inmobiliario">Inmobiliario</option>
                    <option value="Prospección">Prospección</option>
                    <option value="Eventos">Eventos</option>
                    <option value="Seguimiento">Seguimiento</option>
                    <option value="General">General</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-brand-gold font-medium uppercase tracking-wider block">
                  Asunto del Correo <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: {{nombre}}, invitación a evento online de inversión inmobiliaria"
                  value={templateSubject}
                  onChange={(e) => setTemplateSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-brand-navy-dark border border-brand-gold/20 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-brand-gold"
                />
              </div>

              {/* Botón de Guardado */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-gold-dark to-brand-gold hover:opacity-95 text-brand-navy font-bold rounded-xl text-xs shadow-lg hover:shadow-brand-gold/20 transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer active:scale-98"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-brand-navy border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando en Biblioteca...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Guardar y Usar Plantilla</span>
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

