export type TemplateType = 'full_html' | 'standard_wrapper';
export type TemplateCategory = 'General' | 'Inmobiliario' | 'Prospección' | 'Eventos' | 'Eventos & Landings' | 'Seguimiento';
export type TemplateCreator = 'manual' | 'ai_agent' | 'system' | 'eventos_modulo';
export type TemplateActionType = 'whatsapp_lead' | 'calendar_booking' | 'event_invitation' | 'custom_html';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  type: TemplateType;
  actionType?: TemplateActionType;
  htmlContent: string;
  category: TemplateCategory;
  createdBy: TemplateCreator;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export class CreateTemplateDto {
  name: string;
  subject: string;
  type?: TemplateType;
  actionType?: TemplateActionType;
  htmlContent: string;
  category?: TemplateCategory;
  createdBy?: TemplateCreator;
  metadata?: Record<string, any>;
}

export class UpdateTemplateDto {
  name?: string;
  subject?: string;
  type?: TemplateType;
  actionType?: TemplateActionType;
  htmlContent?: string;
  category?: TemplateCategory;
  isActive?: boolean;
  metadata?: Record<string, any>;
}

export interface RenderContext {
  recipientEmail: string;
  recipientName?: string;
  recipientPhone?: string;
  proposedTime?: string;
  signatureId?: 'ricardo' | string;
  backendBaseUrl?: string;
  actionType?: TemplateActionType;
  customParams?: Record<string, string>;
}
