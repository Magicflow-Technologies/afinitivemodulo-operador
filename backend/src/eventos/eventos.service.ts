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
  fecha_inicio: string;
  link_reunion: string;
  descripcion?: string;
  duracion_minutos?: number;
  activo?: boolean;
  imagen_url?: string;
}

export interface RegistroAsistenteData {
  nombre: string;
  correo: string;
  celular: string;
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
    await this.ensureDefaultEvent();
  }

  // Asegura que el evento de "THE NEW YORK TOWER" exista por defecto en la BD
  private async ensureDefaultEvent() {
    if (!this.supabase) return;

    try {
      const defaultId = 'the-new-york-tower-2026';
      const { data: existing } = await this.supabase
        .from('eventos')
        .select('id')
        .eq('id', defaultId)
        .maybeSingle();

      if (!existing) {
        const defaultEvent = {
          id: defaultId,
          nombre: '🏙️ THE NEW YORK TOWER 🏙️',
          fecha_inicio: '2026-09-23T19:30:00-05:00', // Miércoles 23 de septiembre 7:30 p.m.
          link_reunion: 'https://us06web.zoom.us/launch/jc/86782072926',
          descripcion: `Una oportunidad de inversión inmobiliaria con concepto Manhattan, ahora en Lima.\nTe invito a una presentación privada donde conocerás cómo invertir utilizando financiamiento y renta por alquiler.\n\n📈 Retorno proyectado: + 17%\n📅 Miércoles 23 de septiembre\n⏰ 7:30 p.m.\n\nEn 45 minutos te mostraremos el modelo y sus números.`,
          duracion_minutos: 45,
          activo: true,
          imagen_url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&auto=format&fit=crop&q=80',
        };

        const { error } = await this.supabase.from('eventos').insert(defaultEvent);
        if (error) {
          this.logger.warn(`No se pudo insertar evento por defecto: ${error.message}`);
        } else {
          this.logger.log(`Evento por defecto '${defaultId}' inicializado con éxito en Supabase`);
        }
      }
    } catch (err) {
      this.logger.error(`Error al asegurar evento por defecto: ${err.message}`);
    }
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

  // 3. Crear nuevo evento
  async createEvent(data: EventoData): Promise<any> {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    if (!data.nombre || !data.fecha_inicio || !data.link_reunion) {
      throw new BadRequestException('El nombre, fecha de inicio y link de reunión son obligatorios');
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

    const payload = {
      id: eventId,
      nombre: data.nombre.trim(),
      fecha_inicio: data.fecha_inicio,
      link_reunion: data.link_reunion.trim(),
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

  // 6. Obtener asistentes de un evento
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

  // 7. Registrar Asistente + Inyectar en Google Calendar (Cliente y Ricardo) + Correo
  async registrarAsistente(eventoId: string, data: RegistroAsistenteData): Promise<any> {
    if (!this.supabase) throw new BadRequestException('Supabase no disponible');

    if (!data.nombre || !data.correo || !data.celular) {
      throw new BadRequestException('Nombre, correo y celular son obligatorios');
    }

    // 1. Obtener detalles del evento
    const evento = await this.findEventById(eventoId);
    if (!evento) {
      throw new NotFoundException('Evento no encontrado');
    }

    const emailClean = data.correo.trim().toLowerCase();
    const nombreClean = data.nombre.trim();
    const celularClean = data.celular.trim();
    const personaContactoClean = data.persona_contacto?.trim() || 'Landing Oficial';

    // 2. Insertar asistente en afinitivebd.asistentes_evento
    const asistentePayload = {
      evento_id: eventoId,
      nombre: nombreClean,
      correo: emailClean,
      celular: celularClean,
      persona_contacto: personaContactoClean,
    };

    const { data: asistenteInsertado, error: insertError } = await this.supabase
      .from('asistentes_evento')
      .insert(asistentePayload)
      .select()
      .single();

    if (insertError) {
      this.logger.error(`Error al registrar asistente: ${insertError.message}`);
      throw new BadRequestException(`Error al guardar registro: ${insertError.message}`);
    }

    // 3. Generar enlaces de calendario directos para el cliente
    const calendarLinks = this.generarEnlacesCalendario(evento, nombreClean);

    // 4. Enviar Correo de Confirmación con Enlace de Zoom e Invitación al Cliente
    try {
      await this.enviarCorreoConfirmacion(evento, {
        nombre: nombreClean,
        correo: emailClean,
        celular: celularClean,
      });
    } catch (mailErr) {
      this.logger.warn(`No se pudo enviar correo de confirmación: ${mailErr.message}`);
    }

    return {
      success: true,
      asistente: asistenteInsertado,
      evento: {
        id: evento.id,
        nombre: evento.nombre,
        fecha_inicio: evento.fecha_inicio,
        link_reunion: evento.link_reunion,
        duracion_minutos: evento.duracion_minutos,
      },
      calendar_links: calendarLinks,
      message: '¡Asistencia confirmada con éxito! Tu lugar ha sido reservado.',
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

  // Enviar correo de confirmación con Resend
  private async enviarCorreoConfirmacion(evento: any, asistente: { nombre: string; correo: string; celular: string }) {
    if (!this.resend) return;

    const fechaInicio = new Date(evento.fecha_inicio);
    const fechaFormateada = fechaInicio.toLocaleString('es-PE', {
      timeZone: 'America/Lima',
      dateStyle: 'full',
      timeStyle: 'short',
    });

    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Confirmación de Asistencia - Afinitive</title>
</head>
<body style="font-family: Arial, sans-serif; background-color: #0b1118; color: #f8fafc; margin: 0; padding: 20px;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #131c27; border: 1px solid #c9a84c; border-radius: 12px; overflow: hidden;">
    <tr>
      <td style="background-color: #0d1b2a; padding: 24px; text-align: center; border-bottom: 2px solid #c9a84c;">
        <h1 style="color: #c9a84c; margin: 0; font-size: 24px;">AFINITIVE</h1>
        <p style="color: #94a3b8; margin: 5px 0 0 0; font-size: 13px;">Wealth Management</p>
      </td>
    </tr>
    <tr>
      <td style="padding: 30px 24px;">
        <h2 style="color: #ffffff; margin-top: 0;">¡Hola ${asistente.nombre}! Tu lugar está confirmado.</h2>
        <p style="color: #cbd5e1; font-size: 15px; line-height: 1.6;">
          Has completado con éxito tu registro para el evento exclusivo:
        </p>
        <div style="background-color: #1b263b; border-left: 4px solid #c9a84c; padding: 16px; border-radius: 6px; margin: 20px 0;">
          <h3 style="color: #c9a84c; margin: 0 0 8px 0;">${evento.nombre}</h3>
          <p style="color: #ffffff; margin: 0 0 6px 0;">📅 <strong>Fecha:</strong> ${fechaFormateada} (Hora Perú)</p>
          <p style="color: #ffffff; margin: 0 0 6px 0;">⏱️ <strong>Duración:</strong> ${evento.duracion_minutos || 45} minutos</p>
          <p style="color: #ffffff; margin: 0;">🔗 <strong>Enlace Zoom:</strong> <a href="${evento.link_reunion}" style="color: #38bdf8; text-decoration: none;">${evento.link_reunion}</a></p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${evento.link_reunion}" target="_blank" style="background-color: #c9a84c; color: #0d1b2a; padding: 14px 28px; text-decoration: none; font-weight: bold; border-radius: 6px; display: inline-block; font-size: 15px;">
            Acceder al Zoom del Evento
          </a>
        </div>

        <p style="color: #94a3b8; font-size: 13px; text-align: center;">
          Ricardo Bertalmio y el equipo de Afinitive te esperan puntualmente.
        </p>
      </td>
    </tr>
    <tr>
      <td style="background-color: #0d1b2a; padding: 16px; text-align: center; border-top: 1px solid #243447; font-size: 12px; color: #64748b;">
        © 2026 Afinitive Wealth Management • San Isidro, Lima, Perú.
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
