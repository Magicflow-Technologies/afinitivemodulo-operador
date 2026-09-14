import React, { useState } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  FileCode, 
  Trash2, 
  Check, 
  Plus, 
  Search
} from 'lucide-react';

export interface EmailTemplateItem {
  id: string;
  name: string;
  subject: string;
  type: 'full_html' | 'standard_wrapper';
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
  onUploadHtml: (file: File, name: string, subject: string, category: string) => Promise<void>;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [templateSubject, setTemplateSubject] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Inmobiliario');
  const [uploading, setUploading] = useState(false);

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
    if (!file.name.endsWith('.html') && !file.name.endsWith('.htm')) {
      alert('Por favor selecciona un archivo con extensión .html');
      return;
    }
    setDroppedFile(file);
    const suggestedName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
    setTemplateName(suggestedName.charAt(0).toUpperCase() + suggestedName.slice(1));
    setTemplateSubject(`Oportunidad Exclusiva - ${suggestedName}`);
    setActiveTab('upload');
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!droppedFile || !templateName.trim() || !templateSubject.trim()) return;

    setUploading(true);
    try {
      await onUploadHtml(droppedFile, templateName, templateSubject, templateCategory);
      setDroppedFile(null);
      setTemplateName('');
      setTemplateSubject('');
      setActiveTab('catalog');
    } catch (err: any) {
      alert(`Error al subir plantilla: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const filteredTemplates = templates.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q) || t.category?.toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0D1B2A] border border-brand-gold/30 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-brand-gold/15 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-brand-gold/10 border border-brand-gold/30 text-brand-gold">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Biblioteca de Plantillas de Correo</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-gold/10 text-brand-gold font-mono font-normal border border-brand-gold/30">
                  {templates.length} disponibles
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Selecciona una plantilla corporativa o sube diseños HTML completos creados por el dueño o el Agente IA.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Nav Tabs */}
        <div className="flex border-b border-brand-gold/15 bg-[#09131E] px-5 pt-3 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'catalog'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Catálogo Guardado</span>
            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px]">{templates.length}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'upload'
                ? 'border-brand-gold text-brand-gold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Nuevo .HTML</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
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
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
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
                            className="text-red-400 hover:text-red-300 p-1 hover:bg-red-500/10 rounded transition-all"
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
            /* Tab: Subir Archivo HTML */
            <form onSubmit={handleSubmitUpload} className="space-y-4">
              {/* Zona Drag & Drop */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center gap-3 cursor-pointer ${
                  dragActive
                    ? 'border-brand-gold bg-brand-gold/10'
                    : droppedFile
                      ? 'border-emerald-500/50 bg-emerald-500/5'
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

                <div className="p-3.5 rounded-full bg-brand-gold/10 border border-brand-gold/30 text-brand-gold">
                  <Upload className="w-6 h-6" />
                </div>

                {droppedFile ? (
                  <div>
                    <p className="font-bold text-sm text-emerald-400 flex items-center justify-center gap-1.5">
                      <Check className="w-4 h-4" /> {droppedFile.name}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {(droppedFile.size / 1024).toFixed(1)} KB &bull; Clic para cambiar archivo
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="font-semibold text-sm text-slate-200">
                      Arrastra tu archivo <span className="text-brand-gold font-mono">.html</span> aquí o haz clic para explorar
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Soporta diseños completos (BEE, Stripo, Mailchimp, Figma o HTML a medida)
                    </p>
                  </div>
                )}
              </div>

              {/* Formulario de Metadatos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-brand-gold font-medium uppercase tracking-wider block">
                    Nombre de la Campaña / Plantilla
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
                    Categoría
                  </label>
                  <select
                    value={templateCategory}
                    onChange={(e) => setTemplateCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-brand-navy-dark border border-brand-gold/20 rounded-xl text-xs text-slate-100 outline-none focus:border-brand-gold"
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
                  Asunto del Correo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: The New York Tower · Preventa a un paso del Parque Kennedy"
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
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={uploading || !droppedFile || !templateName.trim() || !templateSubject.trim()}
                  className="px-6 py-2 bg-gradient-to-r from-brand-gold-dark to-brand-gold text-brand-navy font-bold rounded-xl text-xs shadow-lg hover:shadow-brand-gold/20 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-brand-navy border-t-transparent rounded-full animate-spin"></div>
                      <span>Guardando en Biblioteca...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Guardar y Previsualizar</span>
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
