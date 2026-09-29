import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';
import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [ConfigModule, TemplatesModule],
  controllers: [EventosController],
  providers: [EventosService],
  exports: [EventosService],
})
export class EventosModule {}
