import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { TemplatesService } from '../templates/templates.service';

export interface EventoData {
  id?: string;
  nombre: string;
  tipo?: 'webinar' | 'lead_form';
  fecha_inicio?: string;
  link_reunion?: string;
  plantilla_id?: string;
  generar_meet?: boolean;
  descripcion?: string;
  duracion_minutos?: number;
  activo?: boolean;
  imagen_url?: string;
}

export interface RegistroAsistenteData {
  nombre: string;
  correo: string;
  celular: string;
  pais?: string;
  interes_inversion?: string;
  capital_disponible?: string;
  persona_contacto?: string;
}

@Injectable()
export class EventosService implements OnModuleInit {
  private readonly logger = new Logger(EventosService.name);
  private supabase: any;
  private resend: Resend;
  private senderEmail: string;
  private automatizacionActiva: boolean = true;

  constructor(
    private configService: ConfigService,
    private templatesService: TemplatesService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey =
      this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') ||
      this.configService.get<string>('SUPABASE_ANON_KEY');
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.senderEmail =
      this.configService.get<string>('RESEND_SENDER_EMAIL') || 'onboarding@resend.dev';

    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        db: {
          schema: 'afinitivebd',
        },
      });
    }

    if (resendApiKey) {
      this.resend = new Resend(resendApiKey);
    }
  }

  async onModuleInit() {
    // No se reinsertan eventos predeterminados para respetar los eventos eliminados por el usuario
  }

  private parseEvent(ev: any): any {
    if (!ev) return ev;
    let imagen_url = ev.imagen_url;
    let plantilla_id = ev.plantilla_id || '';
    let descripcion = ev.descripcion || '';

    if (!imagen_url && descripcion && descripcion.includes('[IMG_URL:')) {
      const match = descripcion.match(/\[IMG_URL:(.*?)\]/);
      if (match) {
        imagen_url = match[1];
        descripcion = descripcion.replace(/\[IMG_URL:.*?\]\n?/, '');
      }
    }

    if (!plantilla_id && descripcion && descripcion.includes('[PLANTILLA_ID:')) {
      const matchPl = descripcion.match(/\[PLANTILLA_ID:(.*?)\]/);
      if (matchPl) {
        plantilla_id = matchPl[1];
        descripcion = descripcion.replace(/\[PLANTILLA_ID:.*?\]\n?/, '');
      }
    }

    return {
      ...ev,
      tipo: ev.tipo || 'webinar',
      imagen_url,
      plantilla_id,
      descripcion,
    };
  }


  // 1. Obtener todos los eventos con conteo de asistentes
  async findAllEvents(): Promise<any[]> {
    if (!this.supabase) return [];

    try {
      const { data: eventos, error } = await this.supabase
        .from('eventos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obtener conteo de asistentes por evento
      const { data: asistentes, error: asistError } = await this.supabase
        .from('asistentes_evento')
        .select('evento_id');

      const countsMap: { [key: string]: number } = {};
      if (asistentes && !asistError) {
        asistentes.forEach((a: any) => {
          if (a.evento_id) {
            countsMap[a.evento_id] = (countsMap[a.evento_id] || 0) + 1;
          }
        });
      }

      return (eventos || []).map((ev: any) => {
        const parsed = this.parseEvent(ev);
        return {
          ...parsed,
          asistentes_count: countsMap[ev.id] || 0,
        };
      });
    } catch (err) {
      this.logger.error(`Error al listar eventos: ${err.message}`);
      throw new BadRequestException(`Error al consultar eventos: ${err.message}`);
    }
  }

  // 2. Obtener un evento por ID
  async findEventById(id: string): Promise<any> {
    if (!this.supabase) throw new NotFoundException('Supabase no disponible');

    try {
      const { data: evento, error } = await this.supabase
        .from('eventos')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error || !evento) {
        throw new NotFoundException(`Evento con ID ${id} no encontrado`);
      }

      // Conteo de asistentes
      const { count } = await this.supabase
        .from('asistentes_evento')
        .select('*', { count: 'exact', head: true })
        .eq('evento_id', id);

      return {
        ...this.parseEvent(evento),
        asistentes_count: count || 0,
      };
    } catch (err) {
      throw new NotFoundException(err.message || 'Evento no encontrado');
    }
  }

  // 3. Crear nuevo evento o formulario de captura
  async createEvent(data: EventoData): Promise<any> {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    if (!data.nombre) {
      throw new BadRequestException('El nombre del evento / formulario es obligatorio');
    }

    const esLeadForm = data.tipo === 'lead_form';
    const generarMeet = data.generar_meet !== false; // Activo por defecto siempre

    if (!esLeadForm && !data.fecha_inicio) {
      throw new BadRequestException('Para un webinar o evento con agenda, la fecha de inicio es obligatoria');
    }

    // Generar slug si no se envía ID
    let eventId = data.id
      ? data.id.toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      : data.nombre
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '-')
          .replace(/-+/g, '-')
          .substring(0, 40) + '-' + Date.now().toString().slice(-4);

    const initialLink = (data.link_reunion || '').trim();
    const finalLink = initialLink || (generarMeet && !esLeadForm ? 'Google Meet (Generación Automática)' : '');

    const payload: any = {
      id: eventId,
      nombre: data.nombre.trim(),
      tipo: data.tipo || 'webinar',
      fecha_inicio: data.fecha_inicio || (esLeadForm ? null : new Date().toISOString()),
      link_reunion: finalLink,
      plantilla_id: data.plantilla_id || null,
      descripcion: data.descripcion || '',
      duracion_minutos: Number(data.duracion_minutos) || 45,
      activo: data.activo !== false,
      imagen_url: data.imagen_url || null,
    };

    let { data: created, error } = await this.supabase
      .from('eventos')
      .insert(payload)
      .select()
      .single();

    if (error && (error.message?.includes('imagen_url') || error.message?.includes('plantilla_id') || error.code === 'PGRST204')) {
      const imgUrl = (payload as any).imagen_url;
      const plantId = (payload as any).plantilla_id;
      delete (payload as any).imagen_url;
      delete (payload as any).plantilla_id;
      
      let extraMeta = '';
      if (imgUrl) extraMeta += `[IMG_URL:${imgUrl}]\n`;
      if (plantId) extraMeta += `[PLANTILLA_ID:${plantId}]\n`;
      if (extraMeta) {
        payload.descripcion = `${extraMeta}${payload.descripcion || ''}`;
      }

      const retry = await this.supabase
        .from('eventos')
        .insert(payload)
        .select()
        .single();
      created = retry.data;
      error = retry.error;
    }

    if (error) {
      this.logger.error(`Error al crear evento: ${error.message}`);
      throw new BadRequestException(`No se pudo crear el evento: ${error.message}`);
    }

    return this.parseEvent(created);
  }

  // 4. Actualizar evento existente
  async updateEvent(id: string, data: Partial<EventoData>): Promise<any> {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    const updatePayload: any = {};
    if (data.nombre !== undefined) updatePayload.nombre = typeof data.nombre === 'string' ? data.nombre.trim() : data.nombre;
    if (data.tipo !== undefined) updatePayload.tipo = data.tipo;
    if (data.fecha_inicio !== undefined) updatePayload.fecha_inicio = data.fecha_inicio;
    if (data.link_reunion !== undefined) updatePayload.link_reunion = data.link_reunion;
    if (data.descripcion !== undefined) updatePayload.descripcion = data.descripcion;
    if (data.duracion_minutos !== undefined) updatePayload.duracion_minutos = Number(data.duracion_minutos) || 60;
    if (data.activo !== undefined) updatePayload.activo = data.activo;
    if (data.imagen_url !== undefined) updatePayload.imagen_url = data.imagen_url;
    if (data.plantilla_id !== undefined) updatePayload.plantilla_id = data.plantilla_id;

    let { data: updated, error } = await this.supabase
      .from('eventos')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      this.logger.warn(`Primer intento de update falló (${error.message}), reintentando con fallback de columnas...`);
      const imgUrl = updatePayload.imagen_url;
      const plantId = updatePayload.plantilla_id;
      delete updatePayload.imagen_url;
      delete updatePayload.plantilla_id;

      let cleanDesc = (updatePayload.descripcion || '')
        .replace(/\[IMG_URL:.*?\]\n?/, '')
        .replace(/\[PLANTILLA_ID:.*?\]\n?/, '');

      let extraMeta = '';
      if (imgUrl) extraMeta += `[IMG_URL:${imgUrl}]\n`;
      if (plantId) extraMeta += `[PLANTILLA_ID:${plantId}]\n`;
      updatePayload.descripcion = `${extraMeta}${cleanDesc}`;

      const retry = await this.supabase
        .from('eventos')
        .update(updatePayload)
        .eq('id', id)
        .select()
        .single();
      updated = retry.data;
      error = retry.error;
    }

    if (error) {
      this.logger.error(`Error final al actualizar evento: ${error.message}`);
      throw new BadRequestException(`No se pudo actualizar el evento: ${error.message}`);
    }

    return this.parseEvent(updated);
  }

  // 5. Eliminar evento
  async deleteEvent(id: string): Promise<{ success: boolean }> {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    // Primero eliminar asistentes vinculados o dejarlos en cascada
    await this.supabase.from('asistentes_evento').delete().eq('evento_id', id);

    const { error } = await this.supabase.from('eventos').delete().eq('id', id);
    if (error) {
      throw new BadRequestException(`Error al eliminar evento: ${error.message}`);
    }

    return { success: true };
  }

  // 6. Obtener asistentes de un evento específico
  async getAsistentesByEvento(eventoId: string): Promise<any[]> {
    if (!this.supabase) return [];

    const { data, error } = await this.supabase
      .from('asistentes_evento')
      .select('*')
      .eq('evento_id', eventoId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(`Error al obtener asistentes: ${error.message}`);
    }

    return data || [];
  }

  // 6.b Obtener TODOS los asistentes consolidados con información del evento/landing
  async getAllAsistentes(): Promise<any[]> {
    if (!this.supabase) return [];

    try {
      const { data: asistentes, error } = await this.supabase
        .from('asistentes_evento')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Obtener todos los eventos para cruzar nombres y tipos
      const { data: eventos } = await this.supabase
        .from('eventos')
        .select('id, nombre, tipo, fecha_inicio');

      const eventosMap: { [key: string]: any } = {};
      if (eventos) {
        eventos.forEach((ev: any) => {
          eventosMap[ev.id] = ev;
        });
      }

      return (asistentes || []).map((asistente: any) => ({
        ...asistente,
        estado: asistente.estado || 'pendiente',
        evento_nombre: eventosMap[asistente.evento_id]?.nombre || asistente.evento_id,
        evento_tipo: eventosMap[asistente.evento_id]?.tipo || 'webinar',
        evento_fecha: eventosMap[asistente.evento_id]?.fecha_inicio || null,
      }));
    } catch (err: any) {
      this.logger.error(`Error al listar todos los asistentes: ${err.message}`);
      return [];
    }
  }

  // 6.c Actualizar estado de atención de un asistente/lead
  async updateAsistenteEstado(asistenteId: string, estado: string, notas?: string): Promise<any> {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    const payload: any = {
      estado: estado || 'pendiente',
    };

    if (notas !== undefined) {
      payload.notas = notas;
    }

    if (estado === 'atendido' || estado === 'en_proceso' || estado === 'contactado') {
      payload.fecha_atencion = new Date().toISOString();
    }

    const { data, error } = await this.supabase
      .from('asistentes_evento')
      .update(payload)
      .eq('id', asistenteId)
      .select()
      .maybeSingle();

    if (error) {
      this.logger.warn(`Error al actualizar estado de asistente ${asistenteId}: ${error.message}`);
      throw new BadRequestException(`No se pudo actualizar el estado: ${error.message}`);
    }

    return { success: true, data };
  }

  // 7. Registrar Asistente / Lead
  async registrarAsistente(eventoId: string, data: RegistroAsistenteData): Promise<any> {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    if (!data.nombre || !data.correo || !data.celular) {
      throw new BadRequestException('Nombre, correo y celular son obligatorios');
    }

    // 1. Obtener detalles del evento
    let evento: any = null;
    try {
      evento = await this.findEventById(eventoId);
    } catch {
      if (eventoId === 'dr-finanzas-bio' || eventoId === 'bio') {
        evento = {
          id: eventoId,
          nombre: 'Dr. Finanzas - Link in Bio',
          tipo: 'lead_form',
          descripcion: 'Registro desde Link in Bio TikTok / Instagram',
          activo: true,
        };
      }
    }

    if (!evento) {
      throw new NotFoundException('Evento o formulario no encontrado');
    }

    const emailClean = data.correo.trim().toLowerCase();
    const nombreClean = data.nombre.trim();
    const celularClean = data.celular.trim();
    const paisClean = data.pais?.trim() || 'Perú';
    const interesClean = data.interes_inversion?.trim() || null;
    const capitalClean = data.capital_disponible?.trim() || null;
    let personaContactoClean = data.persona_contacto?.trim() || (evento.tipo === 'lead_form' ? 'Formulario TikTok' : 'Landing Oficial');
    if (capitalClean && !personaContactoClean.includes('Capital:')) {
      personaContactoClean = `${personaContactoClean} | Capital: ${capitalClean}`;
    }

    // 2. Comprobar si la persona ya está registrada para este evento en específico
    const { data: existente } = await this.supabase
      .from('asistentes_evento')
      .select('*')
      .eq('evento_id', eventoId)
      .or(`correo.eq.${emailClean},celular.eq.${celularClean}`)
      .limit(1)
      .maybeSingle();

    const esLeadForm = evento.tipo === 'lead_form';
    const calendarLinks = esLeadForm ? {} : this.generarEnlacesCalendario(evento, nombreClean);

    if (existente) {
      this.logger.log(`Asistente ya registrado previamente en evento ${eventoId}: ${emailClean} / ${celularClean}`);
      return {
        success: true,
        ya_registrado: true,
        asistente: existente,
        evento: {
          id: evento.id,
          nombre: evento.nombre,
          tipo: evento.tipo,
          fecha_inicio: evento.fecha_inicio,
          link_reunion: evento.link_reunion,
          duracion_minutos: evento.duracion_minutos,
        },
        calendar_links: calendarLinks,
        message: esLeadForm
          ? `¡Hola ${existente.nombre}! Tus datos ya se encuentran registrados. Te contactaremos pronto.`
          : `¡Hola ${existente.nombre}! Ya te encuentras registrado para este evento. Tu lugar está asegurado.`,
      };
    }

    // 4. Si es nuevo registro, insertar asistente en afinitivebd.asistentes_evento
    const asistentePayload: any = {
      evento_id: eventoId,
      nombre: nombreClean,
      correo: emailClean,
      celular: celularClean,
      pais: paisClean,
      interes_inversion: interesClean,
      capital_disponible: capitalClean,
      persona_contacto: personaContactoClean,
    };

    let { data: asistenteInsertado, error: insertError } = await this.supabase
      .from('asistentes_evento')
      .insert(asistentePayload)
      .select()
      .single();

    // Si falla por columnas pais, interes_inversion o capital_disponible no migradas aún, reintentar sin ellas
    if (insertError && (insertError.message?.includes('pais') || insertError.message?.includes('interes_inversion') || insertError.message?.includes('capital_disponible') || insertError.code === 'PGRST204')) {
      const fallbackPayload = {
        evento_id: eventoId,
        nombre: nombreClean,
        correo: emailClean,
        celular: celularClean,
        persona_contacto: `${personaContactoClean} | País: ${paisClean} | Interés: ${interesClean || 'No especificado'} | Capital: ${capitalClean || 'No especificado'}`,
      };
      const retry = await this.supabase
        .from('asistentes_evento')
        .insert(fallbackPayload)
        .select()
        .single();
      asistenteInsertado = retry.data;
      insertError = retry.error;
    }

    if (insertError) {
      this.logger.error(`Error al registrar asistente: ${insertError.message}`);
      throw new BadRequestException(`Error al guardar registro: ${insertError.message}`);
    }

    // 5. Si la automatización está activa, procesar Webhook IA + Correo con Plantilla Vinculada
    if (this.automatizacionActiva && asistenteInsertado?.id) {
      setTimeout(() => {
        this.procesarAsistenteIndividual(asistenteInsertado.id).catch((err) => {
          this.logger.warn(`Error en procesamiento automático para asistente ${asistenteInsertado.id}: ${err.message}`);
        });
      }, 500);
    } else if (!esLeadForm && evento.fecha_inicio && evento.link_reunion) {
      // Fallback básico si la automatización está apagada
      try {
        await this.enviarCorreoConfirmacion(evento, {
          nombre: nombreClean,
          correo: emailClean,
          celular: celularClean,
        });
      } catch (mailErr: any) {
        this.logger.warn(`No se pudo enviar correo de confirmación: ${mailErr.message}`);
      }
    }

    return {
      success: true,
      ya_registrado: false,
      asistente: asistenteInsertado,
      evento: {
        id: evento.id,
        nombre: evento.nombre,
        tipo: evento.tipo,
        fecha_inicio: evento.fecha_inicio,
        link_reunion: evento.link_reunion,
        duracion_minutos: evento.duracion_minutos,
      },
      calendar_links: calendarLinks,
      message: esLeadForm
        ? '¡Tus datos han sido registrados exitosamente! Nos pondremos en contacto contigo a la brevedad.'
        : '¡Asistencia confirmada con éxito! Tu lugar ha sido reservado.',
    };
  }

  // Agendamiento en Google Calendar mediante Service Account
  private async iniciarAgendamientoGoogleCalendar(evento: any, asistente: { nombre: string; correo: string; celular: string }) {
    const keyFilePath = path.join(process.cwd(), 'afinitive-calendar-sync-bddfdbc9e9de.json');
    if (!fs.existsSync(keyFilePath)) {
      this.logger.warn('Archivo de credenciales de Google Service Account no encontrado.');
      return null;
    }

    const auth = new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
    });

    const calendar = google.calendar({ version: 'v3', auth });
    const ricardoEmail = 'ricardo@afinitive.pe';

    const fechaInicio = new Date(evento.fecha_inicio);
    const duracion = Number(evento.duracion_minutos) || 45;
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60 * 1000);

    const esMeetDeseado = evento.generar_meet !== false && (
      !evento.link_reunion ||
      evento.link_reunion.includes('Google Meet') ||
      evento.link_reunion.includes('meet.google.com') ||
      !evento.link_reunion.includes('zoom.us')
    );

    const eventPayload: any = {
      summary: `${evento.nombre} - ${asistente.nombre}`,
      description: `${evento.descripcion || 'Presentación Exclusiva Afinitive'}\n\n💻 Enlace de Acceso: ${evento.link_reunion || 'Google Meet'}\n\n👤 Asistente: ${asistente.nombre}\n✉️ Correo: ${asistente.correo}\n📱 Celular: ${asistente.celular}\n\nOrganizado por Ricardo Bertalmio Ruibal - CEO Afinitive Wealth Management.`,
      location: evento.link_reunion || (esMeetDeseado ? 'Google Meet' : 'Online'),
      start: {
        dateTime: fechaInicio.toISOString(),
        timeZone: 'America/Lima',
      },
      end: {
        dateTime: fechaFin.toISOString(),
        timeZone: 'America/Lima',
      },
      attendees: [
        { email: asistente.correo, displayName: asistente.nombre },
        { email: ricardoEmail, displayName: 'Ricardo Bertalmio - Afinitive' },
      ],
    };

    if (esMeetDeseado) {
      eventPayload.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' },
        },
      };
    }

    try {
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventPayload,
        conferenceDataVersion: esMeetDeseado ? 1 : 0,
        sendUpdates: 'all', // Envía notificación y agrega al calendario del cliente y de Ricardo
      });

      const meetLink = res.data.hangoutLink || res.data.conferenceData?.entryPoints?.find((p: any) => p.entryPointType === 'video')?.uri || null;
      this.logger.log(`Evento de Google Calendar creado: ${res.data.id} - Meet Link: ${meetLink || 'N/A'}`);
      return { id: res.data.id, htmlLink: res.data.htmlLink, meetLink };
    } catch (err) {
      this.logger.warn(`Error en Google Calendar insert: ${err.message}`);
      return null;
    }
  }

  // Enviar correo de confirmación con Resend (Fondo Blanco, Google Style)
  private async enviarCorreoConfirmacion(evento: any, asistente: { nombre: string; correo: string; celular: string }) {
    if (!this.resend) return;

    const fechaInicio = new Date(evento.fecha_inicio);
    const fechaFormateada = fechaInicio.toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

    const calendarLinks = this.generarEnlacesCalendario(evento, asistente.nombre);

    const isMeet = (evento.link_reunion || '').toLowerCase().includes('meet.google.com') || (evento.link_reunion || '').toLowerCase().includes('meet');
    const modalidadTexto = isMeet 
      ? 'En vivo vía Google Meet' 
      : (evento.link_reunion?.includes('zoom.us') ? 'En vivo vía Zoom' : 'Virtual / Asesoría Online');
    const botonTexto = isMeet 
      ? '🎥 Unirse con Google Meet' 
      : (evento.link_reunion?.includes('zoom.us') ? '💻 Ingresar a la Sala Zoom' : '🔗 Ingresar a la Reunión');

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Confirmación de Asistencia - Afinitive</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; background-color: #f8f9fa; color: #202124; }
  </style>
</head>
<body style="background-color: #f8f9fa; color: #202124; margin: 0; padding: 32px 12px; font-family: 'Google Sans', Roboto, -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;">
  
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="max-width: 580px; margin: 0 auto; background-color: #ffffff; border: 1px solid #dadce0; border-radius: 16px; overflow: hidden; box-shadow: 0 1px 3px rgba(60,64,67,0.08), 0 4px 8px rgba(60,64,67,0.04);">
    
    <!-- Encabezado con Logo Afinitive para Fondo Blanco -->
    <tr>
      <td style="background-color: #ffffff; padding: 32px 24px 20px 24px; text-align: center; border-bottom: 1px solid #f1f3f4;">
        <img 
          src="https://links.afinitive.com.pe/img/logo_arvol_oscuro_fondo_blanco.png" 
          alt="Afinitive Wealth Management" 
          width="170" 
          style="display: block; margin: 0 auto; max-width: 170px; height: auto; border: 0;" 
        />
      </td>
    </tr>

    <!-- Contenido Principal -->
    <tr>
      <td style="padding: 32px 32px 24px 32px; background-color: #ffffff;">
        
        <!-- Badge de Confirmación Estilo Google -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 18px;">
          <tr>
            <td style="background-color: #e6f4ea; border-radius: 100px; padding: 6px 14px; font-size: 12px; font-weight: 700; color: #137333; letter-spacing: 0.3px;">
              ✓ &nbsp;REGISTRO CONFIRMADO
            </td>
          </tr>
        </table>

        <!-- Título Saludo -->
        <h1 style="color: #202124; margin: 0 0 14px 0; font-size: 22px; font-weight: 700; line-height: 1.35;">
          ¡Hola ${asistente.nombre}! Tu lugar ha sido reservado.
        </h1>

        <!-- Párrafo Descriptivo -->
        <p style="color: #5f6368; font-size: 14px; line-height: 1.6; margin: 0 0 24px 0;">
          Has completado con éxito tu registro para la presentación privada exclusiva. A continuación tienes todos los detalles para conectarte:
        </p>

        <!-- Tarjeta de Detalles del Evento (Estilo Google Card / Material) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8f9fa; border: 1px solid #e8eaed; border-left: 4px solid #c9a84c; border-radius: 12px; margin-bottom: 28px;">
          <tr>
            <td style="padding: 20px 22px;">
              
              <div style="font-size: 16px; font-weight: 700; color: #202124; margin-bottom: 14px;">
                ${evento.nombre}
              </div>

              <!-- Fila Fecha -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px;">
                <tr>
                  <td width="24" valign="top" style="font-size: 16px; line-height: 1.4;">📅</td>
                  <td style="color: #3c4043; font-size: 14px; line-height: 1.5; padding-left: 8px;">
                    <strong>Fecha y Hora:</strong> ${fechaFormateada} (Hora de Lima)
                  </td>
                </tr>
              </table>

              <!-- Fila Modalidad -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom: 10px;">
                <tr>
                  <td width="24" valign="top" style="font-size: 16px; line-height: 1.4;">💻</td>
                  <td style="color: #3c4043; font-size: 14px; line-height: 1.5; padding-left: 8px;">
                    <strong>Modalidad:</strong> ${modalidadTexto}
                  </td>
                </tr>
              </table>

              <!-- Fila Enlace Directo -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="24" valign="top" style="font-size: 16px; line-height: 1.4;">🔗</td>
                  <td style="color: #3c4043; font-size: 14px; line-height: 1.5; padding-left: 8px; word-break: break-all;">
                    <strong>Enlace de Acceso:</strong><br>
                    <a href="${evento.link_reunion}" target="_blank" style="color: #1a73e8; text-decoration: none; font-weight: 600;">${evento.link_reunion}</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <!-- Botón Primario: Ingresar a la Sala Meet/Zoom (Dorado Luxury Afinitive) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 16px;">
          <tr>
            <td align="center">
              <a href="${evento.link_reunion}" target="_blank" style="display: inline-block; background-color: #c9a84c; background-image: linear-gradient(135deg, #d4af37 0%, #b38e2d 100%); color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 28px; box-shadow: 0 2px 6px rgba(201, 168, 76, 0.4); text-align: center;">
                ${botonTexto}
              </a>
            </td>
          </tr>
        </table>

        <!-- Botón Secundario: Añadir a Google Calendar (Google Style) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 28px;">
          <tr>
            <td align="center">
              <a href="${calendarLinks.google_calendar}" target="_blank" style="display: inline-block; background-color: #ffffff; border: 1px solid #dadce0; color: #1a73e8 !important; font-size: 13px; font-weight: 600; text-decoration: none; padding: 10px 22px; border-radius: 20px; text-align: center;">
                📅 &nbsp;Añadir a mi Google Calendar
              </a>
            </td>
          </tr>
        </table>

        <!-- Nota de Cierre -->
        <p style="color: #70757a; font-size: 13px; line-height: 1.6; text-align: center; margin: 0;">
          Ricardo Bertalmio y el equipo de Afinitive te esperan puntualmente.
        </p>

      </td>
    </tr>

    <!-- Footer Corporativo Google Minimal -->
    <tr>
      <td style="background-color: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #ebebeb; font-size: 12px; color: #80868b; line-height: 1.6;">
        <strong style="color: #5f6368;">Afinitive Wealth Management</strong><br>
        San Isidro, Lima, Perú • Todos los derechos reservados.
      </td>
    </tr>

  </table>

</body>
</html>
    `;

    await this.resend.emails.send({
      from: `Afinitive Eventos <${this.senderEmail}>`,
      to: asistente.correo,
      subject: `Confirmación de Registro: ${evento.nombre}`,
      html: html,
    });
  }

  // Genera URLs directas para Google Calendar y descarga .ICS
  private generarEnlacesCalendario(evento: any, asistenteNombre: string) {
    const fechaInicio = new Date(evento.fecha_inicio);
    const duracion = Number(evento.duracion_minutos) || 45;
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60 * 1000);

    const formatGoogleTime = (d: Date) => {
      return d.toISOString().replace(/-|:|\.\d+/g, '');
    };

    const gStart = formatGoogleTime(fechaInicio);
    const gEnd = formatGoogleTime(fechaFin);

    const googleCalendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
      evento.nombre,
    )}&dates=${gStart}/${gEnd}&details=${encodeURIComponent(
      `${evento.descripcion || ''}\n\nEnlace de acceso: ${evento.link_reunion}\nOrganizador: Ricardo Bertalmio (Afinitive)`,
    )}&location=${encodeURIComponent(evento.link_reunion)}&add=${encodeURIComponent(
      'ricardo@afinitive.pe',
    )}`;

    return {
      google_calendar: googleCalendarUrl,
      zoom_url: evento.link_reunion,
    };
  }

  // Genera contenido de archivo .ics para descarga directa
  generateIcsContent(evento: any, asistente: { nombre?: string; correo?: string }) {
    const fechaInicio = new Date(evento.fecha_inicio);
    const duracion = Number(evento.duracion_minutos) || 45;
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60 * 1000);

    const formatDateToICS = (date: Date): string => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      const h = String(date.getUTCHours()).padStart(2, '0');
      const min = String(date.getUTCMinutes()).padStart(2, '0');
      const s = String(date.getUTCSeconds()).padStart(2, '0');
      return `${y}${m}${d}T${h}${min}${s}Z`;
    };

    const icsDTStamp = formatDateToICS(new Date());
    const icsDTStart = formatDateToICS(fechaInicio);
    const icsDTEnd = formatDateToICS(fechaFin);
    const uid = `afinitive-evento-${evento.id}-${Date.now()}@afinitive.pe`;

    return [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Afinitive//Eventos//ES',
      'CALSCALE:GREGORIAN',
      'METHOD:REQUEST',
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${icsDTStamp}`,
      `DTSTART:${icsDTStart}`,
      `DTEND:${icsDTEnd}`,
      `SUMMARY:${evento.nombre}`,
      `DESCRIPTION:${(evento.descripcion || '').replace(/\n/g, '\\n')}\\n\\nEnlace Zoom: ${evento.link_reunion}`,
      `LOCATION:${evento.link_reunion}`,
      `ORGANIZER;CN="Ricardo Bertalmio - Afinitive":mailto:ricardo@afinitive.pe`,
      asistente.correo
        ? `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED;CN="${asistente.nombre || 'Invitado'}":mailto:${asistente.correo}`
        : '',
      'STATUS:CONFIRMED',
      'SEQUENCE:0',
      'TRANSP:OPAQUE',
      'END:VEVENT',
      'END:VCALENDAR',
    ]
      .filter(Boolean)
      .join('\r\n');
  }

  // 8. Subir imagen / flyer a Supabase Storage
  async uploadImageToStorage(file: any): Promise<{ success: boolean; url: string; fileName: string }> {
    if (!this.supabase) {
      throw new BadRequestException('Supabase no está configurado');
    }

    if (!file || !file.buffer) {
      throw new BadRequestException('No se ha proporcionado ningún archivo');
    }

    const bucketName = 'eventos';

    // Asegurar que el bucket exista y sea público
    try {
      const { data: buckets } = await this.supabase.storage.listBuckets();
      const exists = buckets?.some((b: any) => b.name === bucketName);
      if (!exists) {
        await this.supabase.storage.createBucket(bucketName, {
          public: true,
          fileSizeLimit: 10485760, // 10MB
        });
        this.logger.log(`Bucket '${bucketName}' creado en Supabase Storage`);
      }
    } catch (bErr) {
      this.logger.warn(`Nota sobre verificación de bucket: ${bErr.message}`);
    }

    // Generar nombre de archivo único y limpio
    const originalExt = path.extname(file.originalname || '').toLowerCase() || '.jpg';
    const cleanBaseName = (file.originalname || 'imagen')
      .toLowerCase()
      .replace(originalExt, '')
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);

    const fileName = `${cleanBaseName}-${Date.now()}${originalExt}`;

    // Subir a Supabase Storage
    const { error: uploadError } = await this.supabase.storage
      .from(bucketName)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype || 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      this.logger.error(`Error al subir imagen a Supabase Storage: ${uploadError.message}`);
      throw new BadRequestException(`No se pudo subir la imagen: ${uploadError.message}`);
    }

    // Obtener URL pública directa
    const { data: urlData } = this.supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    return {
      success: true,
      url: urlData.publicUrl,
      fileName: fileName,
    };
  }

  // 12. Agendar Cita Directa 1 a 1 con Lead Registrado (Google Calendar + Meet + Email Confirmación Resend)
  async agendarCitaDirecta(data: {
    asistente_id?: string;
    nombre: string;
    correo: string;
    celular?: string;
    titulo?: string;
    fecha_inicio: string;
    duracion_minutos?: number;
    generar_meet?: boolean;
    notas?: string;
  }): Promise<any> {
    if (!data.correo || !data.nombre) {
      throw new BadRequestException('El nombre y correo del invitado son requeridos');
    }
    if (!data.fecha_inicio) {
      throw new BadRequestException('La fecha y hora de la cita son obligatorias');
    }

    const duracion = Number(data.duracion_minutos) || 45;
    const titulo = data.titulo?.trim() || `Sesión de Asesoría Patrimonial — ${data.nombre}`;
    const fechaInicio = new Date(data.fecha_inicio);
    const fechaFin = new Date(fechaInicio.getTime() + duracion * 60 * 1000);
    const generarMeet = data.generar_meet !== false;

    // 1. Google Calendar Insert con Google Meet
    let googleRes: any = null;
    let meetLink: string | null = null;
    try {
      const keyFilePath = path.join(process.cwd(), 'afinitive-calendar-sync-bddfdbc9e9de.json');
      if (fs.existsSync(keyFilePath)) {
        const auth = new google.auth.GoogleAuth({
          keyFile: keyFilePath,
          scopes: ['https://www.googleapis.com/auth/calendar', 'https://www.googleapis.com/auth/calendar.events'],
        });
        const calendar = google.calendar({ version: 'v3', auth });
        const ricardoEmail = 'ricardo@afinitive.pe';

        const eventPayload: any = {
          summary: `${titulo} [Afinitive]`,
          description: `Sesión de Asesoría Patrimonial Estratégica con Afinitive Wealth Management.\n\n👤 Invitado: ${data.nombre}\n✉️ Correo: ${data.correo}\n📱 Celular: ${data.celular || 'No registrado'}\n📝 Notas / Objetivo: ${data.notas || 'Asesoría Personalizada'}\n\nOrganizado por Ricardo Bertalmio Ruibal - CEO Afinitive.`,
          start: { dateTime: fechaInicio.toISOString(), timeZone: 'America/Lima' },
          end: { dateTime: fechaFin.toISOString(), timeZone: 'America/Lima' },
          attendees: [
            { email: data.correo, displayName: data.nombre },
            { email: ricardoEmail, displayName: 'Ricardo Bertalmio - Afinitive' },
          ],
        };

        if (generarMeet) {
          eventPayload.conferenceData = {
            createRequest: {
              requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          };
        }

        const res = await calendar.events.insert({
          calendarId: 'primary',
          requestBody: eventPayload,
          conferenceDataVersion: generarMeet ? 1 : 0,
          sendUpdates: 'all',
        });

        googleRes = res.data;
        meetLink = res.data.hangoutLink || res.data.conferenceData?.entryPoints?.find((p: any) => p.entryPointType === 'video')?.uri || null;
        this.logger.log(`Cita agendada en Google Calendar: ${res.data.id} - Meet: ${meetLink}`);
      }
    } catch (gErr) {
      this.logger.warn(`Error al agendar en Google Calendar: ${gErr.message}`);
    }

    // 2. Correo de confirmación con Resend
    const fakeEvento = {
      nombre: titulo,
      descripcion: data.notas || 'Sesión de Asesoría Patrimonial Estratégica con Ricardo Bertalmio.',
      fecha_inicio: data.fecha_inicio,
      duracion_minutos: duracion,
      link_reunion: meetLink || (generarMeet ? 'https://meet.google.com' : 'Coordinación telefónica'),
    };
    await this.enviarCorreoConfirmacion(fakeEvento, {
      nombre: data.nombre,
      correo: data.correo,
      celular: data.celular || '',
    });

    // 3. Actualizar estado en Supabase
    if (this.supabase && data.asistente_id) {
      await this.supabase
        .from('asistentes_evento')
        .update({
          estado: 'en_proceso',
          fecha_atencion: new Date().toISOString(),
          notas: data.notas ? `[CITA AGENDADA]: ${data.notas}` : 'Cita agendada con Google Meet',
        })
        .eq('id', data.asistente_id);
    }

    return {
      success: true,
      googleEventId: googleRes?.id || null,
      meetLink: meetLink,
      message: 'Cita agendada, sala de Google Meet creada y correo de confirmación enviado exitosamente',
    };
  }

  // ==========================================
  // AUTOMATIZACIÓN DE NUEVOS REGISTROS & COLAS
  // ==========================================

  // Estado del interruptor de automatización
  async getAutomatizacionStatus(): Promise<{ activa: boolean; totalPendientes: number }> {
    let totalPendientes = 0;
    if (this.supabase) {
      const { count } = await this.supabase
        .from('asistentes_evento')
        .select('*', { count: 'exact', head: true })
        .or('estado.eq.pendiente,estado.is.null');
      totalPendientes = count || 0;
    }
    return {
      activa: this.automatizacionActiva,
      totalPendientes,
    };
  }

  setAutomatizacionActiva(activa: boolean): { success: boolean; activa: boolean } {
    this.automatizacionActiva = !!activa;
    this.logger.log(`Automatización de nuevos registros ${this.automatizacionActiva ? 'ACTIVADA' : 'DESACTIVADA'}`);
    return { success: true, activa: this.automatizacionActiva };
  }

  // 1. Envío al Webhook de la IA
  async enviarWebhookIA(payload: {
    nombre: string;
    telefono: string;
    email: string;
    evento: string;
    fecha: string;
    hora: string;
    link_zoom: string;
    origen: string;
    plantilla_id?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    const webhookUrl = 'https://agent-afinitive.vercel.app/api/webhook/nuevo-registro';
    this.logger.log(`Enviando registro a Webhook IA: ${payload.email} (${payload.nombre}) -> ${webhookUrl}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errText = await res.text();
        this.logger.warn(`Webhook IA retornó HTTP ${res.status}: ${errText}`);
        return { success: false, error: `HTTP ${res.status}: ${errText || 'Error en Webhook IA'}` };
      }

      let resJson: any = {};
      try {
        resJson = await res.json();
      } catch {
        resJson = { statusText: res.statusText };
      }

      this.logger.log(`Webhook IA respondió con éxito para ${payload.email}`);
      return { success: true, data: resJson };
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.logger.error(`Error al conectar con Webhook IA: ${err.message}`);
      return { success: false, error: err.message || 'Error al conectar con Webhook IA' };
    }
  }

  // Método auxiliar para obtener fecha, hora y Zoom link exactos sin fallback a 'por coordinar'
  private async obtenerFechaHoraYZoomEvento(evento: any): Promise<{
    fechaFormateada: string;
    horaFormateada: string;
    zoomLink: string;
  }> {
    let zoomLink = (evento?.link_reunion || '').trim();
    if (!zoomLink || zoomLink.toLowerCase().includes('google meet (generación automática)')) {
      zoomLink = 'https://us06web.zoom.us/j/89341125166?pwd=xU1Mcw6TygLry6yu0VToxpXD4KL3H0.1';
    }

    let targetDate: Date | null = null;
    if (evento?.fecha_inicio) {
      try {
        const d = new Date(evento.fecha_inicio);
        if (!isNaN(d.getTime())) {
          targetDate = d;
        }
      } catch {}
    }

    // Si el evento no tiene fecha_inicio (ej. formularios de TikTok / bio link), buscar evento con fecha en Supabase
    if (!targetDate && this.supabase) {
      try {
        const { data: proximoEvento } = await this.supabase
          .from('eventos')
          .select('fecha_inicio, link_reunion')
          .not('fecha_inicio', 'is', null)
          .eq('activo', true)
          .order('fecha_inicio', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (proximoEvento?.fecha_inicio) {
          const d = new Date(proximoEvento.fecha_inicio);
          if (!isNaN(d.getTime())) {
            targetDate = d;
            if ((!evento?.link_reunion || evento.link_reunion.includes('Google Meet')) && proximoEvento.link_reunion) {
              zoomLink = proximoEvento.link_reunion;
            }
          }
        }
      } catch {}
    }

    // Si aún no hay targetDate, calcular el próximo jueves a las 7:30 PM (19:30) en hora Lima
    if (!targetDate) {
      const now = new Date();
      const currentDay = now.getDay(); // 0: dom, 4: jue
      let daysUntilThursday = (4 - currentDay + 7) % 7;
      if (daysUntilThursday === 0 && now.getHours() >= 20) {
        daysUntilThursday = 7;
      }
      targetDate = new Date(now.getTime() + daysUntilThursday * 24 * 60 * 60 * 1000);
      targetDate.setHours(19, 30, 0, 0);
    }

    let fechaFormateada = 'Jueves 1 de Octubre';
    let horaFormateada = '7:30 PM';

    try {
      const diaSemana = targetDate.toLocaleDateString('es-PE', { weekday: 'long', timeZone: 'America/Lima' });
      const diaNum = targetDate.toLocaleDateString('es-PE', { day: 'numeric', timeZone: 'America/Lima' });
      const mesNombre = targetDate.toLocaleDateString('es-PE', { month: 'long', timeZone: 'America/Lima' });
      
      const diaCap = diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1);
      const mesCap = mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1);
      
      fechaFormateada = `${diaCap} ${diaNum} de ${mesCap}`;

      horaFormateada = targetDate.toLocaleTimeString('es-PE', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Lima',
      }).toUpperCase();
    } catch {
      fechaFormateada = 'Jueves 1 de Octubre';
      horaFormateada = '7:30 PM';
    }

    return {
      fechaFormateada,
      horaFormateada,
      zoomLink,
    };
  }

  // 2. Envío de Correo Electrónico usando la Plantilla Vinculada
  async enviarCorreoConPlantilla(asistente: any, evento: any): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.resend) {
      return { success: false, error: 'Servicio Resend no configurado' };
    }

    const cleanName = (asistente.nombre || 'Estimado(a)').trim();
    const firstName = cleanName.split(' ')[0] || cleanName;

    const { fechaFormateada, horaFormateada, zoomLink } = await this.obtenerFechaHoraYZoomEvento(evento);

    const backendBaseUrl = (this.configService.get<string>('BACKEND_PUBLIC_URL') || process.env.BACKEND_PUBLIC_URL || 'https://links.afinitive.com.pe').replace(/\/+$/, '');

    const renderContext = {
      recipientEmail: asistente.correo,
      recipientName: cleanName,
      recipientPhone: asistente.celular || '',
      proposedTime: evento?.fecha_inicio,
      backendBaseUrl,
      customParams: {
        evento: evento?.nombre || 'Evento Afinitive',
        evento_nombre: evento?.nombre || 'Evento Afinitive',
        link_zoom: zoomLink,
        link_reunion: zoomLink,
        zoom_url: zoomLink,
        fecha: fechaFormateada,
        hora: horaFormateada,
        celular: asistente.celular || '',
        telefono: asistente.celular || '',
        correo: asistente.correo,
      },
    };

    let renderedSubject = `Confirmación y Acceso: ${evento?.nombre || 'Evento Afinitive'}`;
    let renderedHtml = '';

    const plantillaId = evento?.plantilla_id;

    if (plantillaId) {
      try {
        const tpl = await this.templatesService.getTemplateById(plantillaId);
        if (tpl) {
          const renderResult = this.templatesService.getRenderEngine().render(tpl, renderContext);
          renderedSubject = renderResult.subject || renderedSubject;
          renderedHtml = renderResult.html;
        }
      } catch (tplErr: any) {
        this.logger.warn(`No se pudo cargar plantilla ${plantillaId}: ${tplErr.message}. Usando plantilla institucional estándar.`);
      }
    }

    // Si no había plantilla vinculada o falló, usar plantilla HTML de alta conversión Afinitive
    if (!renderedHtml) {
      renderedHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="margin-bottom: 24px; text-align: center;">
            <img src="https://links.afinitive.com.pe/img/afinitive_logo.png" alt="Afinitive" width="140" style="display: inline-block; margin-bottom: 8px;">
            <h2 style="color: #0f172a; margin: 8px 0 4px 0; font-size: 20px;">¡Confirmación de Registro!</h2>
            <p style="color: #64748b; font-size: 14px; margin: 0;">${evento?.nombre || 'Masterclass Afinitive'}</p>
          </div>

          <p style="font-size: 15px; line-height: 1.6;">Hola <strong>${firstName}</strong>,</p>
          <p style="font-size: 14px; line-height: 1.6; color: #334155;">
            Hemos recibido exitosamente tu registro. A continuación tienes los detalles de acceso:
          </p>

          <div style="background-color: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">
            <table style="width: 100%; font-size: 13px; color: #334155;">
              <tr>
                <td style="padding: 4px 0; font-weight: bold; width: 110px;">📅 Fecha:</td>
                <td style="padding: 4px 0;">${fechaFormateada}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; font-weight: bold;">⏰ Hora:</td>
                <td style="padding: 4px 0;">${horaFormateada}</td>
              </tr>
              ${zoomLink ? `
              <tr>
                <td style="padding: 4px 0; font-weight: bold;">💻 Enlace Sala:</td>
                <td style="padding: 4px 0;">
                  <a href="${zoomLink}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: bold;">
                    ${zoomLink}
                  </a>
                </td>
              </tr>` : ''}
            </table>
          </div>

          ${zoomLink ? `
          <div style="text-align: center; margin: 25px 0;">
            <a href="${zoomLink}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 28px; font-weight: bold; text-decoration: none; border-radius: 6px; font-size: 14px;">
              🚀 Ingresar a la Reunión Zoom / Meet
            </a>
          </div>` : ''}

          <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-top: 24px;">
            Si tienes alguna duda o requieres asistencia previa, responde directamente a este correo o comunícate con nosotros.
          </p>

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
            <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, sans-serif;">
              <tr>
                <td valign="middle" style="padding-right: 15px;">
                  <img src="https://dashbportal.com/afinitive/rbertalmio.png" alt="Ricardo Bertalmio Ruibal" width="65" style="border-radius: 50%;">
                </td>
                <td valign="middle">
                  <strong style="color: #0f172a; font-size: 14px; display: block;">Ricardo Bertalmio Ruibal</strong>
                  <span style="color: #64748b; font-size: 12px; display: block;">CEO Afinitive Wealth Management</span>
                  <span style="color: #64748b; font-size: 12px;">📱 (511) 982100208 | <a href="https://afinitive.com.pe" style="color: #2563eb; text-decoration: none;">afinitive.com.pe</a></span>
                </td>
              </tr>
            </table>
          </div>
        </div>
      `;
    }

    try {
      const sendResult = await this.resend.emails.send({
        from: `Ricardo Bertalmio - Afinitive <${this.senderEmail}>`,
        to: [asistente.correo],
        subject: renderedSubject,
        html: renderedHtml,
      });

      if (sendResult.error) {
        this.logger.warn(`Error al enviar correo a ${asistente.correo}: ${sendResult.error.message}`);
        return { success: false, error: sendResult.error.message };
      }

      this.logger.log(`Correo enviado con éxito a ${asistente.correo} (ID: ${sendResult.data?.id})`);
      return { success: true, data: sendResult.data };
    } catch (err: any) {
      this.logger.error(`Error al enviar correo con Resend a ${asistente.correo}: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // 3. Procesar un asistente individual (Webhook IA + Correo con Plantilla -> Estado 'en_proceso')
  async procesarAsistenteIndividual(asistenteId: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    const { data: asistente, error: astErr } = await this.supabase
      .from('asistentes_evento')
      .select('*')
      .eq('id', asistenteId)
      .single();

    if (astErr || !asistente) {
      throw new NotFoundException(`Asistente con ID ${asistenteId} no encontrado`);
    }

    let evento: any = null;
    try {
      evento = await this.findEventById(asistente.evento_id);
    } catch {
      evento = {
        id: asistente.evento_id,
        nombre: 'Masterclass Inversiones y Patrimonio',
        tipo: 'lead_form',
        link_reunion: '',
        plantilla_id: '',
      };
    }

    const { fechaFormateada, horaFormateada, zoomLink } = await this.obtenerFechaHoraYZoomEvento(evento);

    const webhookPayload = {
      nombre: asistente.nombre,
      telefono: asistente.celular,
      email: asistente.correo,
      evento: evento.nombre || 'Masterclass Inversiones',
      fecha: fechaFormateada,
      hora: horaFormateada,
      link_zoom: zoomLink,
      origen: asistente.persona_contacto || (evento.tipo === 'lead_form' ? 'bio_link_tiktok' : 'formulario_web'),
      plantilla_id: evento.plantilla_id || '',
    };

    this.logger.log(`[Automatización] Procesando asistente ${asistente.nombre} (${asistente.correo}) -> Webhook IA [${fechaFormateada} a las ${horaFormateada}]...`);

    // Paso 1: Enviar al Webhook de la IA y esperar OK
    const webhookResult = await this.enviarWebhookIA(webhookPayload);
    if (!webhookResult.success) {
      this.logger.warn(`[Automatización] Falló webhook IA para ${asistente.correo}: ${webhookResult.error}`);
      return {
        success: false,
        error: `Error en Webhook IA: ${webhookResult.error}`,
      };
    }

    // Paso 2: Enviar Correo con Plantilla Vinculada
    const emailResult = await this.enviarCorreoConPlantilla(asistente, evento);
    if (!emailResult.success) {
      this.logger.warn(`[Automatización] Falló envío de correo para ${asistente.correo}: ${emailResult.error}`);
      // Registrar el intento fallido en las notas pero mantener el estado 'pendiente' para reintento automático
      await this.supabase
        .from('asistentes_evento')
        .update({
          notas: `Pendiente de reintento: Webhook IA OK ✓ | Correo falló: ${emailResult.error}`,
        })
        .eq('id', asistenteId);

      return {
        success: false,
        error: `Webhook IA enviado, pero el correo falló (${emailResult.error}). Permanece en cola para reintento.`,
      };
    }

    // Paso 3: Ambos confirmados exitosos -> Cambiar estado a 'en_proceso'
    const updatePayload = {
      estado: 'en_proceso',
      fecha_atencion: new Date().toISOString(),
      notas: `Automatización OK: Webhook IA enviado ✓ + Correo (${evento.plantilla_id || 'estándar'}) enviado ✓`,
    };

    await this.supabase
      .from('asistentes_evento')
      .update(updatePayload)
      .eq('id', asistenteId);

    this.logger.log(`[Automatización] Asistente ${asistente.nombre} procesado con éxito (Estado: en_proceso)`);

    return {
      success: true,
      data: {
        asistenteId,
        nombre: asistente.nombre,
        correo: asistente.correo,
        webhook: webhookResult,
        email: emailResult,
        nuevo_estado: 'en_proceso',
      },
    };
  }

  // 4. Procesar la Cola de Contactos con estado 'pendiente'
  async procesarColaPendientes(limite = 50): Promise<{
    total: number;
    procesados: number;
    fallidos: number;
    resultados: any[];
  }> {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    const { data: pendientes, error } = await this.supabase
      .from('asistentes_evento')
      .select('*')
      .or('estado.eq.pendiente,estado.is.null')
      .order('created_at', { ascending: true })
      .limit(limite);

    if (error) {
      throw new BadRequestException(`Error al consultar cola de pendientes: ${error.message}`);
    }

    const items = pendientes || [];
    this.logger.log(`[Cola Automatización] Iniciando procesamiento de ${items.length} pendientes...`);

    const resultados: any[] = [];
    let procesados = 0;
    let fallidos = 0;

    for (const ast of items) {
      try {
        const res = await this.procesarAsistenteIndividual(ast.id);
        if (res.success) {
          procesados++;
          resultados.push({
            id: ast.id,
            nombre: ast.nombre,
            correo: ast.correo,
            status: 'ok',
          });
        } else {
          fallidos++;
          resultados.push({
            id: ast.id,
            nombre: ast.nombre,
            correo: ast.correo,
            status: 'error',
            error: res.error,
          });
        }
      } catch (err: any) {
        fallidos++;
        resultados.push({
          id: ast.id,
          nombre: ast.nombre,
          correo: ast.correo,
          status: 'error',
          error: err.message,
        });
      }

      // Esperar 800ms entre cada contacto para procesar de forma ordenada
      await new Promise((r) => setTimeout(r, 800));
    }

    return {
      total: items.length,
      procesados,
      fallidos,
      resultados,
    };
  }
}
