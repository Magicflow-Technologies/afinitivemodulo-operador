import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Res,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { EventosService } from './eventos.service';

export class CreateEventoDto {
  id?: string;
  nombre: string;
  tipo?: 'webinar' | 'lead_form';
  fecha_inicio?: string;
  link_reunion?: string;
  descripcion?: string;
  duracion_minutos?: number;
  activo?: boolean;
  imagen_url?: string;
}

export class RegistroAsistenteDto {
  nombre: string;
  correo: string;
  celular: string;
  pais?: string;
  interes_inversion?: string;
  persona_contacto?: string;
}

@Controller('api/eventos')
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  // Listar todos los eventos
  @Get()
  async getAllEvents() {
    const eventos = await this.eventosService.findAllEvents();
    return { success: true, data: eventos };
  }

  // Obtener todos los asistentes consolidados con información del evento
  @Get('asistentes/todos')
  async getTodosAsistentes() {
    const asistentes = await this.eventosService.getAllAsistentes();
    return { success: true, data: asistentes };
  }

  // Subir imagen / flyer a Supabase Storage
  @Post('upload-imagen')
  @UseInterceptors(FileInterceptor('file'))
  async uploadImagen(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No se ha enviado ningún archivo de imagen');
    }
    const result = await this.eventosService.uploadImageToStorage(file);
    return result;
  }

  // Obtener un evento por ID
  @Get(':id')
  async getEventById(@Param('id') id: string) {
    const evento = await this.eventosService.findEventById(id);
    return { success: true, data: evento };
  }

  // Crear un nuevo evento
  @Post()
  async createEvent(@Body() body: CreateEventoDto) {
    const created = await this.eventosService.createEvent(body);
    return { success: true, data: created };
  }

  // Actualizar un evento existente
  @Put(':id')
  async updateEvent(@Param('id') id: string, @Body() body: Partial<CreateEventoDto>) {
    const updated = await this.eventosService.updateEvent(id, body);
    return { success: true, data: updated };
  }

  // Eliminar un evento
  @Delete(':id')
  async deleteEvent(@Param('id') id: string) {
    const result = await this.eventosService.deleteEvent(id);
    return { success: true, data: result };
  }

  // Obtener asistentes de un evento
  @Get(':id/asistentes')
  async getAsistentes(@Param('id') id: string) {
    const asistentes = await this.eventosService.getAsistentesByEvento(id);
    return { success: true, data: asistentes };
  }

  // Registrar asistente al evento (Público)
  @Post(':id/registro')
  async registrarAsistente(
    @Param('id') id: string,
    @Body() body: RegistroAsistenteDto,
  ) {
    const result = await this.eventosService.registrarAsistente(id, body);
    return result;
  }

  // Descargar archivo .ics de calendario para el evento
  @Get(':id/ics')
  async downloadIcs(
    @Param('id') id: string,
    @Res() res: any,
  ) {
    const evento = await this.eventosService.findEventById(id);
    const icsContent = this.eventosService.generateIcsContent(evento, {});

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="evento-${id}.ics"`,
    );
    res.status(HttpStatus.OK).send(icsContent);
  }
}
