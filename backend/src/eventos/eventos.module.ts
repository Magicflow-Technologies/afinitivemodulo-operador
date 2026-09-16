import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventosController } from './eventos.controller';
import { EventosService } from './eventos.service';

@Module({
  imports: [ConfigModule],
  controllers: [EventosController],
  providers: [EventosService],
  exports: [EventosService],
})
export class EventosModule {}
