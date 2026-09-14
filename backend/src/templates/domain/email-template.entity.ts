export type TemplateType = 'full_html' | 'standard_wrapper';
export type TemplateCategory = 'General' | 'Inmobiliario' | 'Prospección' | 'Eventos' | 'Seguimiento';
export type TemplateCreator = 'manual' | 'ai_agent' | 'system';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  type: TemplateType;
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
  htmlContent: string;
  category?: TemplateCategory;
  createdBy?: TemplateCreator;
  metadata?: Record<string, any>;
}

export class UpdateTemplateDto {
  name?: string;
  subject?: string;
  type?: TemplateType;
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
  customParams?: Record<string, string>;
}
