import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { EmailTrackingModule } from '../email-tracking/email-tracking.module';
import { TemplatesModule } from '../templates/templates.module';
import { EventosModule } from '../eventos/eventos.module';

@Module({
  imports: [
    ConfigModule,
    EmailTrackingModule,
    TemplatesModule,
    EventosModule,
  ],
  controllers: [AgentController],
  providers: [AgentService],
  exports: [AgentService],
})
export class AgentModule {}
