import { Injectable, Logger, NotFoundException, BadRequestException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

export interface EventoData {
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

export interface RegistroAsistenteData {
  nombre: string;
  correo: string;
  celular: string;
  pais?: string;
  interes_inversion?: string;
  persona_contacto?: string;
}

@Injectable()
export class EventosService implements OnModuleInit {
  private readonly logger = new Logger(EventosService.name);
  private supabase: any;
  private resend: Resend;
  private senderEmail: string;

  constructor(private configService: ConfigService) {
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
    let descripcion = ev.descripcion || '';

    if (!imagen_url && descripcion && descripcion.includes('[IMG_URL:')) {
      const match = descripcion.match(/\[IMG_URL:(.*?)\]/);
      if (match) {
        imagen_url = match[1];
        descripcion = descripcion.replace(/\[IMG_URL:.*?\]\n?/, '');
      }
    }

    return {
      ...ev,
      tipo: ev.tipo || 'webinar',
      imagen_url,
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
    if (!esLeadForm && (!data.fecha_inicio || !data.link_reunion)) {
      throw new BadRequestException('Para un webinar, la fecha de inicio y link de reunión son obligatorios');
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

    const payload: any = {
      id: eventId,
      nombre: data.nombre.trim(),
      tipo: data.tipo || 'webinar',
      fecha_inicio: data.fecha_inicio || (esLeadForm ? null : new Date().toISOString()),
      link_reunion: (data.link_reunion || '').trim(),
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

    if (error && (error.message?.includes('imagen_url') || error.code === 'PGRST204')) {
      const imgUrl = (payload as any).imagen_url;
      delete (payload as any).imagen_url;
      if (imgUrl) {
        payload.descripcion = `[IMG_URL:${imgUrl}]\n${payload.descripcion || ''}`;
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

    const updatePayload: any = { ...data };
    delete updatePayload.id;
    delete updatePayload.created_at;

    if (updatePayload.duracion_minutos) {
      updatePayload.duracion_minutos = Number(updatePayload.duracion_minutos);
    }

    let { data: updated, error } = await this.supabase
      .from('eventos')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error && (error.message?.includes('imagen_url') || error.code === 'PGRST204')) {
      const imgUrl = updatePayload.imagen_url;
      delete updatePayload.imagen_url;
      if (imgUrl !== undefined) {
        let cleanDesc = (updatePayload.descripcion || '').replace(/\[IMG_URL:.*?\]\n?/, '');
        updatePayload.descripcion = imgUrl ? `[IMG_URL:${imgUrl}]\n${cleanDesc}` : cleanDesc;
      }
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
        evento_nombre: eventosMap[asistente.evento_id]?.nombre || asistente.evento_id,
        evento_tipo: eventosMap[asistente.evento_id]?.tipo || 'webinar',
        evento_fecha: eventosMap[asistente.evento_id]?.fecha_inicio || null,
      }));
    } catch (err: any) {
      this.logger.error(`Error al listar todos los asistentes: ${err.message}`);
      return [];
    }
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
    const personaContactoClean = data.persona_contacto?.trim() || (evento.tipo === 'lead_form' ? 'Formulario TikTok' : 'Landing Oficial');

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
      persona_contacto: personaContactoClean,
    };

    let { data: asistenteInsertado, error: insertError } = await this.supabase
      .from('asistentes_evento')
      .insert(asistentePayload)
      .select()
      .single();

    // Si falla por columnas pais o interes_inversion no migradas aún, reintentar sin ellas
    if (insertError && (insertError.message?.includes('pais') || insertError.message?.includes('interes_inversion') || insertError.code === 'PGRST204')) {
      const fallbackPayload = {
        evento_id: eventoId,
        nombre: nombreClean,
        correo: emailClean,
        celular: celularClean,
        persona_contacto: `${personaContactoClean} | País: ${paisClean} | Interés: ${interesClean || 'No especificado'}`,
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

    // 5. Enviar Correo de Confirmación solo si es un webinar con fecha
    if (!esLeadForm && evento.fecha_inicio && evento.link_reunion) {
      try {
        await this.enviarCorreoConfirmacion(evento, {
          nombre: nombreClean,
          correo: emailClean,
          celular: celularClean,
        });
      } catch (mailErr) {
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

    const eventPayload: any = {
      summary: `${evento.nombre} - ${asistente.nombre}`,
      description: `${evento.descripcion || 'Presentación Exclusiva Afinitive'}\n\n💻 Enlace de Acceso Zoom: ${evento.link_reunion}\n\n👤 Asistente: ${asistente.nombre}\n✉️ Correo: ${asistente.correo}\n📱 Celular: ${asistente.celular}\n\nOrganizado por Ricardo Bertalmio Ruibal - CEO Afinitive Wealth Management.`,
      location: evento.link_reunion,
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

    try {
      const res = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: eventPayload,
        sendUpdates: 'all', // Envía notificación y agrega al calendario del cliente y de Ricardo
      });

      this.logger.log(`Evento de Google Calendar creado: ${res.data.id}`);
      return { id: res.data.id, htmlLink: res.data.htmlLink };
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
                    <strong>Modalidad:</strong> En vivo vía Zoom
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

        <!-- Botón Primario: Ingresar a la Sala Zoom (Dorado Luxury Afinitive) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" align="center" style="margin-bottom: 16px;">
          <tr>
            <td align="center">
              <a href="${evento.link_reunion}" target="_blank" style="display: inline-block; background-color: #c9a84c; background-image: linear-gradient(135deg, #d4af37 0%, #b38e2d 100%); color: #ffffff !important; font-size: 15px; font-weight: 700; text-decoration: none; padding: 14px 36px; border-radius: 28px; box-shadow: 0 2px 6px rgba(201, 168, 76, 0.4); text-align: center;">
                Ingresar a la Sala Zoom
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
}
