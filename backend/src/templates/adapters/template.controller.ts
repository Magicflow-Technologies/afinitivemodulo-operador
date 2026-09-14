import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpCode, 
  HttpStatus,
  Inject
} from '@nestjs/common';
import type { ITemplateService } from '../ports/template-service.port';
import { TEMPLATE_SERVICE_PORT } from '../ports/template-service.port';
import { CreateTemplateDto, UpdateTemplateDto, RenderContext } from '../domain/email-template.entity';

@Controller('api/templates')
export class TemplateController {
  constructor(
    @Inject(TEMPLATE_SERVICE_PORT)
    private readonly templateService: ITemplateService,
  ) {}

  @Get()
  async listTemplates(
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool = isActive !== undefined ? isActive === 'true' : undefined;
    return await this.templateService.listTemplates({ category, isActive: activeBool });
  }

  @Get(':id')
  async getTemplate(@Param('id') id: string) {
    return await this.templateService.getTemplateById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(@Body() dto: CreateTemplateDto) {
    return await this.templateService.createTemplate(dto);
  }

  @Put(':id')
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return await this.templateService.updateTemplate(id, dto);
  }

  @Delete(':id')
  async deleteTemplate(@Param('id') id: string) {
    return await this.templateService.deleteTemplate(id);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async renderPreview(
    @Body() body: {
      templateId?: string;
      customTemplate?: {
        type?: string;
        htmlContent: string;
        subject?: string;
      };
      context?: Partial<RenderContext>;
    }
  ) {
    const defaultContext: RenderContext = {
      recipientEmail: body.context?.recipientEmail || 'prospecto@ejemplo.com',
      recipientName: body.context?.recipientName || 'Marielisa',
      recipientPhone: body.context?.recipientPhone || '+51999888777',
      proposedTime: body.context?.proposedTime || new Date(Date.now() + 86400000 * 2).toISOString(),
      signatureId: body.context?.signatureId || 'ricardo',
      backendBaseUrl: body.context?.backendBaseUrl || process.env.BACKEND_PUBLIC_URL || 'http://localhost:3080',
    };

    if (body.templateId) {
      return await this.templateService.renderPreview(body.templateId, defaultContext);
    } else if (body.customTemplate) {
      return await this.templateService.renderPreview(
        {
          type: body.customTemplate.type || 'full_html',
          htmlContent: body.customTemplate.htmlContent,
          subject: body.customTemplate.subject,
        },
        defaultContext
      );
    }

    // Default fallback
    return await this.templateService.renderPreview(
      '00000000-0000-0000-0000-000000000001',
      defaultContext
    );
  }
}
