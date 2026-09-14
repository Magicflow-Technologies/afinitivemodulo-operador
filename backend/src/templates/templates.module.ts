import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TemplateController } from './adapters/template.controller';
import { TemplatesService } from './templates.service';
import { SupabaseTemplateRepository } from './adapters/supabase-template.repository';
import { TemplateRenderEngine } from './domain/template-render.engine';
import { TEMPLATE_SERVICE_PORT } from './ports/template-service.port';
import { TEMPLATE_REPOSITORY_PORT } from './ports/template-repository.port';

@Module({
  imports: [ConfigModule],
  controllers: [TemplateController],
  providers: [
    TemplateRenderEngine,
    {
      provide: TEMPLATE_REPOSITORY_PORT,
      useClass: SupabaseTemplateRepository,
    },
    {
      provide: TEMPLATE_SERVICE_PORT,
      useClass: TemplatesService,
    },
    TemplatesService,
  ],
  exports: [
    TEMPLATE_SERVICE_PORT,
    TemplatesService,
    TemplateRenderEngine,
  ],
})
export class TemplatesModule {}
