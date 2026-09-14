import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { ITemplateService } from './ports/template-service.port';
import type { ITemplateRepository } from './ports/template-repository.port';
import { TEMPLATE_REPOSITORY_PORT } from './ports/template-repository.port';
import { EmailTemplate, CreateTemplateDto, UpdateTemplateDto, RenderContext } from './domain/email-template.entity';
import { TemplateRenderEngine } from './domain/template-render.engine';

@Injectable()
export class TemplatesService implements ITemplateService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @Inject(TEMPLATE_REPOSITORY_PORT)
    private readonly templateRepo: ITemplateRepository,
    private readonly renderEngine: TemplateRenderEngine,
  ) {}

  async createTemplate(dto: CreateTemplateDto): Promise<EmailTemplate> {
    this.logger.log(`Creando nueva plantilla: "${dto.name}" (origen: ${dto.createdBy || 'manual'})`);
    
    // Si no se especificó el tipo, auto-detectarlo con el motor
    const detectedType = dto.type || this.renderEngine.detectTemplateType(dto.htmlContent);
    
    return await this.templateRepo.create({
      ...dto,
      type: detectedType,
    });
  }

  async listTemplates(filter?: { category?: string; isActive?: boolean }): Promise<EmailTemplate[]> {
    return await this.templateRepo.findAll(filter);
  }

  async getTemplateById(id: string): Promise<EmailTemplate> {
    const template = await this.templateRepo.findById(id);
    if (!template) {
      throw new NotFoundException(`La plantilla con ID "${id}" no existe.`);
    }
    return template;
  }

  async updateTemplate(id: string, dto: UpdateTemplateDto): Promise<EmailTemplate> {
    await this.getTemplateById(id); // Verificar existencia
    return await this.templateRepo.update(id, dto);
  }

  async deleteTemplate(id: string): Promise<{ success: boolean; message: string }> {
    await this.getTemplateById(id);
    await this.templateRepo.delete(id);
    return { success: true, message: `Plantilla ${id} eliminada correctamente.` };
  }

  async renderPreview(
    templateIdOrCustom: string | { type: string; htmlContent: string; subject?: string },
    context: RenderContext
  ): Promise<{ subject: string; html: string }> {
    let templateToRender: { type: string; htmlContent: string; subject?: string };

    if (typeof templateIdOrCustom === 'string') {
      const dbTemplate = await this.getTemplateById(templateIdOrCustom);
      templateToRender = {
        type: dbTemplate.type,
        htmlContent: dbTemplate.htmlContent,
        subject: dbTemplate.subject,
      };
    } else {
      templateToRender = {
        type: templateIdOrCustom.type || this.renderEngine.detectTemplateType(templateIdOrCustom.htmlContent),
        htmlContent: templateIdOrCustom.htmlContent,
        subject: templateIdOrCustom.subject || 'Vista Previa - Afinitive',
      };
    }

    return this.renderEngine.render(templateToRender, context);
  }

  getRenderEngine(): TemplateRenderEngine {
    return this.renderEngine;
  }
}
