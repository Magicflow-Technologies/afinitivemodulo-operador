import { EmailTemplate, CreateTemplateDto, UpdateTemplateDto, RenderContext } from '../domain/email-template.entity';

export const TEMPLATE_SERVICE_PORT = 'ITemplateService';

export interface ITemplateService {
  createTemplate(dto: CreateTemplateDto): Promise<EmailTemplate>;
  listTemplates(filter?: { category?: string; isActive?: boolean }): Promise<EmailTemplate[]>;
  getTemplateById(id: string): Promise<EmailTemplate>;
  updateTemplate(id: string, dto: UpdateTemplateDto): Promise<EmailTemplate>;
  deleteTemplate(id: string): Promise<{ success: boolean; message: string }>;
  renderPreview(templateIdOrCustom: string | { type: string; htmlContent: string; subject?: string }, context: RenderContext): Promise<{ subject: string; html: string }>;
}
