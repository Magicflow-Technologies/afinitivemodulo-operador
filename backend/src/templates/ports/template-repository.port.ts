import { EmailTemplate, CreateTemplateDto, UpdateTemplateDto } from '../domain/email-template.entity';

export const TEMPLATE_REPOSITORY_PORT = 'ITemplateRepository';

export interface ITemplateRepository {
  create(dto: CreateTemplateDto): Promise<EmailTemplate>;
  findAll(filter?: { category?: string; isActive?: boolean }): Promise<EmailTemplate[]>;
  findById(id: string): Promise<EmailTemplate | null>;
  update(id: string, dto: UpdateTemplateDto): Promise<EmailTemplate>;
  delete(id: string): Promise<boolean>;
}
