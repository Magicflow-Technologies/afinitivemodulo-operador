import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';
import { TemplatesService } from '../templates/templates.service';
import { TemplateRenderEngine } from '../templates/domain/template-render.engine';

// Catálogo de Firmas Corporativas Disponibles
const SIGNATURES = {
  ricardo: `
              <!-- FIRMA: RICARDO BERTALMIO -->
              <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 100%; background-color: #ffffff;">
                <tr>
                  <!-- 1. Columna del Logo -->
                  <td valign="middle" style="padding-right: 15px;">
                    <img src="https://dashbportal.com/afinitive/afi.jpeg" alt="Afinitive" width="120" style="display: block; border: none;">
                  </td>

                  <!-- 2. Columna de la Foto de Perfil -->
                  <td valign="middle" style="padding-right: 20px;">
                    <img src="https://dashbportal.com/afinitive/rbertalmio.png" alt="Ricardo Bertalmio Ruibal" width="90" style="display: block; border-radius: 50%; box-shadow: 0px 0px 5px rgba(0,0,0,0.15);">
                  </td>

                  <!-- 3. Columna de Datos de Contacto -->
                  <td valign="middle">
                    
                    <!-- Nombre y Cargo -->
                    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 8px;">
                      <tr>
                        <td style="padding-bottom: 3px;">
                          <span style="font-size: 18px; color: #000000; font-weight: bold; margin: 0; line-height: 1.1; font-family: Arial, sans-serif;">Ricardo Bertalmio Ruibal</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="font-size: 13px; color: #555555; margin: 0; font-family: Arial, sans-serif;">CEO Afinitive Wealth Management</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Datos de Contacto -->
                    <table cellpadding="0" cellspacing="0" border="0" style="font-size: 12px; color: #000000; font-family: Arial, sans-serif;">
                      <tr>
                        <td valign="middle" style="padding: 0 15px 4px 0; white-space: nowrap;">
                          <img src="https://cdn-icons-png.flaticon.com/512/15/15874.png" width="13" style="vertical-align: middle; margin-right: 4px; border: none;" alt="Celular">
                          <span style="vertical-align: middle;">(511) 982100208</span>
                        </td>
                        <td valign="middle" style="padding: 0 0 4px 0; white-space: nowrap;">
                          <img src="https://cdn-icons-png.flaticon.com/512/2838/2838912.png" width="13" style="vertical-align: middle; margin-right: 4px; border: none;" alt="Ubicación">
                          <span style="vertical-align: middle;">Av. Camino Real, San Isidro.</span>
                        </td>
                      </tr>
                      <tr>
                        <td valign="middle" style="padding: 0 15px 0 0; white-space: nowrap;">
                          <a href="https://afinitive.com.pe" style="text-decoration: none; color: #000000;" target="_blank">
                            <img src="https://cdn-icons-png.flaticon.com/512/1006/1006771.png" width="13" style="vertical-align: middle; margin-right: 4px; border: none;" alt="Web">
                            <span style="vertical-align: middle;">afinitive.com.pe</span>
                          </a>
                        </td>
                        <td valign="middle" style="padding: 0; white-space: nowrap;">
                          <a href="https://www.linkedin.com/in/ricardo-bertalmio" style="text-decoration: none; color: #000000;" target="_blank">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="13" style="vertical-align: middle; margin-right: 4px; border: none;" alt="LinkedIn">
                            <span style="vertical-align: middle;">ricardo-bertalmio</span>
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
  `
};

@Injectable()
export class EmailTrackingService {
  private readonly logger = new Logger(EmailTrackingService.name);
  private supabase: any;
  private resend: Resend;
  private senderEmail: string;

  constructor(
    private configService: ConfigService,
    private templatesService: TemplatesService,
    private renderEngine: TemplateRenderEngine,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY') || this.configService.get<string>('SUPABASE_ANON_KEY');
    const resendApiKey = this.configService.get<string>('RESEND_API_KEY');
    this.senderEmail = this.configService.get<string>('RESEND_SENDER_EMAIL') || 'onboarding@resend.dev';

    if (!supabaseUrl || !supabaseKey) {
      this.logger.error('Falta la configuración de Supabase (SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY/SUPABASE_ANON_KEY).');
    } else {
      // Usamos el cliente de supabase apuntando al esquema afinitivebd
      this.supabase = createClient(supabaseUrl, supabaseKey, {
        db: {
          schema: 'afinitivebd',
        },
      });
    }

    if (!resendApiKey) {
      this.logger.error('Falta la configuración de Resend (RESEND_API_KEY).');
    } else {
      this.resend = new Resend(resendApiKey);
    }
  }

  async sendEmail(
    recipientEmail: string, 
    customSender?: string, 
    customSubject?: string, 
    customBody?: string,
    signatureId?: string,
    attachment?: { filename: string; content: string },
    proposedTime?: string,
    recipientName?: string,
    templateId?: string,
    customTemplateType?: string,
  ) {
    this.logger.log(`Intentando enviar correo a: ${recipientEmail} desde: ${customSender || this.senderEmail} con firma: ${signatureId || 'default (ricardo)'}${templateId ? ` con plantilla: ${templateId}` : ''}${attachment ? ` con adjunto: ${attachment.filename}` : ''}`);

    if (!this.resend) {
      throw new HttpException('El servicio de Resend no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const sender = customSender || this.senderEmail;
    const backendBaseUrl = (this.configService.get<string>('BACKEND_PUBLIC_URL') || process.env.BACKEND_PUBLIC_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 3080}`).replace(/\/+$/, '');

    const renderContext = {
      recipientEmail,
      recipientName: recipientName || 'Marielisa',
      proposedTime,
      signatureId: (signatureId as any) || 'ricardo',
      backendBaseUrl,
    };

    let renderedSubject = customSubject || 'Invitación Exclusiva - Afinitive';
    let renderedHtml = '';

    if (templateId) {
      try {
        const tpl = await this.templatesService.getTemplateById(templateId);
        const result = this.renderEngine.render(tpl, renderContext);
        renderedSubject = customSubject || result.subject;
        renderedHtml = result.html;
      } catch (err) {
        this.logger.warn(`No se pudo cargar la plantilla ${templateId}: ${err.message}. Usando renderizado por defecto.`);
      }
    }

    if (!renderedHtml) {
      if (customBody) {
        const detectedType = (customTemplateType as any) || this.renderEngine.detectTemplateType(customBody);
        const result = this.renderEngine.render({
          type: detectedType,
          htmlContent: customBody,
          subject: customSubject || renderedSubject,
        }, renderContext);
        renderedSubject = result.subject;
        renderedHtml = result.html;
      } else {
        const defaultTemplate = await this.templatesService.getTemplateById('00000000-0000-0000-0000-000000000001').catch(() => null);
        if (defaultTemplate) {
          const result = this.renderEngine.render(defaultTemplate, renderContext);
          renderedSubject = result.subject;
          renderedHtml = result.html;
        } else {
          const result = this.renderEngine.render({
            type: 'standard_wrapper',
            htmlContent: 'Este es un correo electrónico de prueba enviado para validar el Módulo de Monitoreo Omnicanal.',
            subject: renderedSubject,
          }, renderContext);
          renderedSubject = result.subject;
          renderedHtml = result.html;
        }
      }
    }

    try {
      // Opciones de envío de correo
      const mailOptions: any = {
        from: sender,
        to: [recipientEmail],
        subject: renderedSubject,
        html: renderedHtml,
      };

      // Si existe un archivo adjunto del usuario, agregarlo
      const attachments: any[] = [];
      if (attachment && attachment.content) {
        attachments.push({
          filename: attachment.filename,
          content: Buffer.from(attachment.content, 'base64'),
        });
      }

      if (attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      if (attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      // Enviamos el correo usando el SDK de Resend.
      const response = await this.resend.emails.send(mailOptions);

      if (response.error) {
        this.logger.error(`Error de Resend: ${JSON.stringify(response.error)}`);
        throw new HttpException(`Error al enviar correo mediante Resend: ${response.error.message}`, HttpStatus.BAD_REQUEST);
      }

      const emailId = response.data?.id;
      if (!emailId) {
        throw new HttpException('No se recibió el ID del correo desde Resend', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      this.logger.log(`Correo enviado con éxito. Resend ID: ${emailId}`);

      // Registrar en Supabase
      const insertRecord: any = {
        recipient_email: recipientEmail,
        subject: renderedSubject,
        status: 'Enviado',
        resend_email_id: emailId,
        sent_at: new Date().toISOString(),
      };

      if (proposedTime) {
        insertRecord.proposed_time = proposedTime;
      }
      if (recipientName) {
        insertRecord.recipient_name = recipientName;
      }

      let { data, error } = await this.supabase
        .from('email_tracking_test')
        .insert([insertRecord])
        .select();

      // En caso de que las nuevas columnas no existan todavía en Supabase, reintentar inserción básica
      if (error && (insertRecord.proposed_time || insertRecord.recipient_name)) {
        this.logger.warn(`Inserción enriquecida falló (${error.message}). Reintentando inserción básica...`);
        const fallback = await this.supabase
          .from('email_tracking_test')
          .insert([
            {
              recipient_email: recipientEmail,
              subject: renderedSubject,
              status: 'Enviado',
              resend_email_id: emailId,
              sent_at: new Date().toISOString(),
            },
          ])
          .select();
        data = fallback.data;
        error = fallback.error;
      }

      if (error) {
        this.logger.error(`Error al insertar en Supabase: ${JSON.stringify(error)}`);
        throw new HttpException(`Error al guardar registro en base de datos: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      return {
        success: true,
        message: 'Correo enviado y registrado en Supabase',
        data: data[0],
      };
    } catch (error) {
      this.logger.error(`Excepción durante el proceso de envío: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Error inesperado: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async handleWebhook(payload: any) {
    this.logger.log(`Recibida petición de Webhook. Tipo de evento: ${payload?.type}`);

    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // El evento esperado es 'email.opened'
    if (payload?.type !== 'email.opened') {
      this.logger.log(`Evento ignorado: ${payload?.type}. Solo procesamos 'email.opened'`);
      return { success: true, message: `Evento ${payload?.type} ignorado` };
    }

    const emailId = payload.data?.email_id || payload.data?.id;
    if (!emailId) {
      this.logger.warn('No se encontró el ID del correo en el payload del webhook.');
      throw new HttpException('Payload inválido: Falta email_id', HttpStatus.BAD_REQUEST);
    }

    this.logger.log(`Buscando correo con Resend ID: ${emailId} para marcar como Leído.`);

    try {
      const { data, error } = await this.supabase
        .from('email_tracking_test')
        .update({
          status: 'Leído',
          opened_at: new Date().toISOString(),
        })
        .eq('resend_email_id', emailId)
        .select();

      if (error) {
        this.logger.error(`Error al actualizar en Supabase: ${JSON.stringify(error)}`);
        throw new HttpException(`Error al actualizar registro en base de datos: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      if (!data || data.length === 0) {
        this.logger.warn(`No se encontró ningún correo con el Resend ID: ${emailId}`);
        return { success: false, message: `No se encontró ningún registro para el ID: ${emailId}` };
      }

      this.logger.log(`Correo ${emailId} actualizado con éxito a Leído.`);
      return {
        success: true,
        message: 'Estado de correo actualizado a Leído',
        data: data[0],
      };
    } catch (error) {
      this.logger.error(`Excepción durante el procesamiento del webhook: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Error inesperado en webhook: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private getGoogleAuth(scopes: string[]): any {
    // 1. Variable de entorno directa (si se configura en .env como JSON string)
    const envCreds = this.configService.get<string>('GOOGLE_CALENDAR_CREDENTIALS') || process.env.GOOGLE_CALENDAR_CREDENTIALS;
    if (envCreds) {
      try {
        const credentials = typeof envCreds === 'string' ? JSON.parse(envCreds) : envCreds;
        return new google.auth.GoogleAuth({
          credentials,
          scopes,
        });
      } catch (err) {
        this.logger.warn(`Error al parsear GOOGLE_CALENDAR_CREDENTIALS: ${err.message}`);
      }
    }

    // 2. Buscar archivo en múltiples rutas relativas y absolutas
    const possiblePaths = [
      path.resolve(__dirname, '..', '..', 'afinitive-calendar-sync-bddfdbc9e9de.json'),
      path.resolve(process.cwd(), 'afinitive-calendar-sync-bddfdbc9e9de.json'),
      path.resolve(process.cwd(), 'backend', 'afinitive-calendar-sync-bddfdbc9e9de.json'),
      path.resolve(process.cwd(), 'dist', 'afinitive-calendar-sync-bddfdbc9e9de.json'),
      path.resolve(__dirname, '..', 'afinitive-calendar-sync-bddfdbc9e9de.json'),
    ];

    const keyFilePath = possiblePaths.find((p) => fs.existsSync(p));
    if (!keyFilePath) {
      this.logger.error(`No se encontró el archivo afinitive-calendar-sync-bddfdbc9e9de.json en ninguna de las rutas esperadas: ${possiblePaths.join(', ')}`);
      throw new HttpException('Archivo de credenciales de Google Calendar no encontrado.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.logger.log(`Cargando credenciales de Google Calendar desde: ${keyFilePath}`);
    return new google.auth.GoogleAuth({
      keyFile: keyFilePath,
      scopes,
    });
  }

  async testGoogleCalendarConnection(calendarId?: string) {
    const id = calendarId || 'rbertalmio@afinitive.com.pe';
    this.logger.log(`Iniciando prueba de conexión a Google Calendar para el ID: ${id}`);

    try {
      const auth = this.getGoogleAuth(['https://www.googleapis.com/auth/calendar.readonly']);
      const calendar = google.calendar({ version: 'v3', auth });

      this.logger.log(`Haciendo petición a la API de Google Calendar para listar eventos...`);
      const response = await calendar.events.list({
        calendarId: id,
        timeMin: new Date().toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = response.data.items;
      this.logger.log(`¡Conexión validada exitosamente! Se obtuvieron ${events?.length || 0} eventos.`);

      if (events && events.length > 0) {
        this.logger.log('--- Horarios de Eventos Encontrados ---');
        events.forEach((event, index) => {
          const start = event.start?.dateTime || event.start?.date || 'N/A';
          const end = event.end?.dateTime || event.end?.date || 'N/A';
          this.logger.log(`Evento ${index + 1}: [${event.summary}] | Inicio: ${start} | Fin: ${end}`);
        });
        this.logger.log('---------------------------------------');
      } else {
        this.logger.log('No se encontraron eventos próximos en este calendario.');
      }

      return {
        success: true,
        message: 'Conexión a Google Calendar validada correctamente.',
        eventCount: events?.length || 0,
        events: events?.map(e => ({
          summary: e.summary,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
        })) || [],
      };
    } catch (error) {
      this.logger.error(`Error de conexión con Google Calendar: ${error.message}`);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Error en Google Calendar: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getCalendarSettings() {
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const { data, error } = await this.supabase
      .from('calendar_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error || !data) {
      if (error) {
        this.logger.warn(`Error al consultar calendar_settings de Supabase: ${error.message}. Usando valores predeterminados de contingencia.`);
      }
      // Valores por defecto
      return {
        id: 1,
        slot_duration: 60,
        morning_start: '09:00',
        morning_end: '12:00',
        afternoon_start: '14:00',
        afternoon_end: '17:00',
        send_interval: 2,
        send_interval_unit: 'minutes',
      };
    }

    return {
      ...data,
      slot_duration: Number(data.slot_duration) || 60,
      send_interval: Number(data.send_interval) || 2,
      send_interval_unit: data.send_interval_unit || 'minutes',
    };
  }

  async saveCalendarSettings(settings: {
    slot_duration: number;
    morning_start: string;
    morning_end: string;
    afternoon_start: string;
    afternoon_end: string;
    send_interval: number;
    send_interval_unit: string;
  }) {
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const payload = {
      id: 1,
      slot_duration: Number(settings.slot_duration) || 60,
      morning_start: settings.morning_start,
      morning_end: settings.morning_end,
      afternoon_start: settings.afternoon_start,
      afternoon_end: settings.afternoon_end,
      send_interval: Number(settings.send_interval) || 2,
      send_interval_unit: settings.send_interval_unit || 'minutes',
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await this.supabase
      .from('calendar_settings')
      .upsert(payload)
      .select();

    if (error) {
      this.logger.error(`Error al guardar configuraciones en Supabase: ${error.message}`);
      throw new HttpException(`Error al guardar configuraciones: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.logger.log(`Configuraciones guardadas con éxito: intervalo=${payload.send_interval} ${payload.send_interval_unit}, duración=${payload.slot_duration}min`);
    return data[0];
  }

  // Helper para construir fechas con la zona horaria fija de Lima, Perú (UTC-5)
  private createLimaDate(year: number, month: number, day: number, hour: number, minute: number): Date {
    const pad = (n: number) => String(n).padStart(2, '0');
    return new Date(`${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:00-05:00`);
  }

  // Helper para obtener el día actual según la zona horaria America/Lima
  private getTodayInLima(): { year: number; month: number; day: number; dayOfWeek: number } {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Lima',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });
    const parts = formatter.formatToParts(now);
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    let day = now.getDate();

    for (const p of parts) {
      if (p.type === 'year') year = parseInt(p.value, 10);
      if (p.type === 'month') month = parseInt(p.value, 10);
      if (p.type === 'day') day = parseInt(p.value, 10);
    }

    const d = new Date(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T12:00:00-05:00`);
    return { year, month, day, dayOfWeek: d.getDay() };
  }

  async findNextAvailableSlot(
    calendarId: string,
    durationMinutes: number,
    morningStart: string,
    morningEnd: string,
    afternoonStart: string,
    afternoonEnd: string,
    occupiedEvents: any[],
    reservedSlots: Date[]
  ): Promise<Date> {
    const parseTime = (timeStr: string) => {
      const [h, m] = (timeStr || '09:00').split(':').map(Number);
      return { hours: isNaN(h) ? 9 : h, minutes: isNaN(m) ? 0 : m };
    };

    const morningS = parseTime(morningStart);
    const morningE = parseTime(morningEnd);
    const afternoonS = parseTime(afternoonStart);
    const afternoonE = parseTime(afternoonEnd);

    const todayLima = this.getTodayInLima();
    // Empezamos la búsqueda a partir del día de mañana en Lima
    let currentDayDate = new Date(`${todayLima.year}-${String(todayLima.month).padStart(2, '0')}-${String(todayLima.day).padStart(2, '0')}T12:00:00-05:00`);
    currentDayDate.setDate(currentDayDate.getDate() + 1);

    // Buscaremos durante un máximo de 14 días
    for (let day = 0; day < 14; day++) {
      // Saltar fines de semana (Sábado = 6, Domingo = 0)
      const dayOfWeek = currentDayDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDayDate.setDate(currentDayDate.getDate() + 1);
        continue;
      }

      const yyyy = currentDayDate.getFullYear();
      const mm = currentDayDate.getMonth() + 1;
      const dd = currentDayDate.getDate();

      const slots: { start: Date; end: Date }[] = [];
      
      const addSlotsForBlock = (startHour: number, startMin: number, endHour: number, endMin: number) => {
        let currentSlotStart = this.createLimaDate(yyyy, mm, dd, startHour, startMin);
        const limit = this.createLimaDate(yyyy, mm, dd, endHour, endMin);

        while (currentSlotStart.getTime() + durationMinutes * 60000 <= limit.getTime()) {
          const slotStart = new Date(currentSlotStart);
          const slotEnd = new Date(currentSlotStart.getTime() + durationMinutes * 60000);
          slots.push({ start: slotStart, end: slotEnd });
          currentSlotStart = new Date(currentSlotStart.getTime() + durationMinutes * 60000);
        }
      };

      // Bloque de Mañana
      addSlotsForBlock(morningS.hours, morningS.minutes, morningE.hours, morningE.minutes);
      // Bloque de Tarde
      addSlotsForBlock(afternoonS.hours, afternoonS.minutes, afternoonE.hours, afternoonE.minutes);

      // Evaluar cada slot candidato
      for (const slot of slots) {
        // 1. Verificar si ya fue reservado en esta misma sesión
        const isReservedInSession = reservedSlots.some(res => 
          res.getTime() < slot.end.getTime() && res.getTime() + durationMinutes * 60000 > slot.start.getTime()
        );
        if (isReservedInSession) continue;

        // 2. Verificar si se cruza con algún evento ocupado de Google Calendar
        const isOccupied = occupiedEvents.some(event => {
          const eventStart = new Date(event.start?.dateTime || event.start?.date);
          const eventEnd = new Date(event.end?.dateTime || event.end?.date);
          return slot.start.getTime() < eventEnd.getTime() && slot.end.getTime() > eventStart.getTime();
        });

        if (!isOccupied) {
          return slot.start;
        }
      }

      currentDayDate.setDate(currentDayDate.getDate() + 1);
    }

    // Fallback si no se encontró slot libre
    const fallbackDay = this.getTodayInLima();
    return this.createLimaDate(fallbackDay.year, fallbackDay.month, fallbackDay.day + 1, morningS.hours || 9, morningS.minutes || 0);
  }

  async loadContactsIntoQueue(contacts: { name: string; email: string; phone?: string }[]) {
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    // 1. Limpiar cola pendiente previa
    await this.supabase
      .from('email_queue')
      .delete()
      .eq('status', 'pending');

    // 2. Obtener configuraciones de agenda
    const settings = await this.getCalendarSettings();
    const calendarId = 'rbertalmio@afinitive.com';

    // 3. Consultar histórico de envíos de Supabase (email_tracking_test) para validar duplicidad y regla de enfriamiento (60 días)
    const { data: trackingHistory, error: historyErr } = await this.supabase
      .from('email_tracking_test')
      .select('recipient_email, sent_at, status');

    if (historyErr) {
      this.logger.warn(`No se pudo consultar email_tracking_test para validación de duplicados: ${historyErr.message}`);
    }

    // Mapa de último envío por correo electrónico
    const historyMap = new Map<string, { sent_at: string; status: string }>();
    if (trackingHistory) {
      for (const record of trackingHistory) {
        if (!record.recipient_email) continue;
        const emailKey = record.recipient_email.trim().toLowerCase();
        const existing = historyMap.get(emailKey);
        if (!existing || new Date(record.sent_at).getTime() > new Date(existing.sent_at).getTime()) {
          historyMap.set(emailKey, { sent_at: record.sent_at, status: record.status });
        }
      }
    }

    // 4. Filtrar duplicados internos del CSV y verificar regla de enfriamiento (Cool-down) de 60 días
    const COOLDOWN_DAYS = 60;
    const now = new Date();
    const seenInCsv = new Set<string>();
    const validContacts: { name: string; email: string; phone?: string }[] = [];
    const skippedContacts: { name: string; email: string; reason: string; lastSentAt?: string; daysAgo?: number }[] = [];

    for (const contact of contacts) {
      const emailClean = contact.email.trim().toLowerCase();

      // Caso A: Duplicado dentro del mismo CSV
      if (seenInCsv.has(emailClean)) {
        skippedContacts.push({
          name: contact.name,
          email: contact.email,
          reason: 'Duplicado dentro del mismo archivo CSV.',
        });
        continue;
      }
      seenInCsv.add(emailClean);

      // Caso B: Verificación contra histórico de envíos previos
      const lastContact = historyMap.get(emailClean);
      if (lastContact && lastContact.sent_at) {
        const sentDate = new Date(lastContact.sent_at);
        const diffMs = now.getTime() - sentDate.getTime();
        const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (daysAgo < COOLDOWN_DAYS) {
          const timeText = daysAgo === 0 ? 'hoy' : `hace ${daysAgo} día(s)`;
          skippedContacts.push({
            name: contact.name,
            email: contact.email,
            reason: `Contactado recientemente (${timeText} - Estado: ${lastContact.status || 'Enviado'}). Regla de enfriamiento: ${COOLDOWN_DAYS} días.`,
            lastSentAt: lastContact.sent_at,
            daysAgo: daysAgo,
          });
          continue;
        }
      }

      // Contacto nuevo o fuera de enfriamiento
      validContacts.push(contact);
    }

    // 5. Consultar eventos de Ricardo en Google Calendar para los próximos 14 días
    let occupiedEvents: any[] = [];
    try {
      const auth = this.getGoogleAuth(['https://www.googleapis.com/auth/calendar.readonly']);
      const calendar = google.calendar({ version: 'v3', auth });
      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      occupiedEvents = response.data.items || [];
    } catch (err) {
      this.logger.error(`Error consultando calendario de Ricardo para asignación de cola: ${err.message}`);
    }

    const reservedSlots: Date[] = [];
    const queueItems: any[] = [];

    // 6. Calcular slot y armar records ÚNICAMENTE para los contactos válidos
    for (const contact of validContacts) {
      const slotTime = await this.findNextAvailableSlot(
        calendarId,
        settings.slot_duration,
        settings.morning_start,
        settings.morning_end,
        settings.afternoon_start,
        settings.afternoon_end,
        occupiedEvents,
        reservedSlots
      );

      reservedSlots.push(slotTime);

      queueItems.push({
        recipient_name: contact.name,
        recipient_email: contact.email,
        recipient_phone: contact.phone || null,
        proposed_time: slotTime.toISOString(),
        status: 'pending'
      });
    }

    // 7. Guardar en base de datos
    let insertedData: any[] = [];
    if (queueItems.length > 0) {
      const { data, error } = await this.supabase
        .from('email_queue')
        .insert(queueItems)
        .select();

      if (error) {
        throw new HttpException(`Error al guardar contactos en cola: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      insertedData = data || [];
    }

    return {
      success: true,
      totalUploaded: contacts.length,
      validCount: queueItems.length,
      skippedCount: skippedContacts.length,
      skippedContacts,
      data: insertedData,
    };
  }

  async getPendingQueue() {
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const { data, error } = await this.supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw new HttpException(`Error al obtener cola pendiente: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data || [];
  }

  async updateQueueItem(id: string, proposedTime?: string, status?: string) {
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const updateData: any = {};
    if (proposedTime) updateData.proposed_time = proposedTime;
    if (status) updateData.status = status;

    const { data, error } = await this.supabase
      .from('email_queue')
      .update(updateData)
      .eq('id', id)
      .select();

    if (error) {
      throw new HttpException(`Error al actualizar elemento de la cola: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data[0];
  }

  private workerTimeout: NodeJS.Timeout | null = null;

  async stopEmailQueue() {
    this.queueProgress.isProcessing = false;
    if (this.workerTimeout) {
      clearTimeout(this.workerTimeout);
      this.workerTimeout = null;
    }

    if (this.supabase) {
      // Revertir cualquier correo que haya quedado en estado 'processing' de vuelta a 'pending'
      await this.supabase
        .from('email_queue')
        .update({ status: 'pending' })
        .eq('status', 'processing');
    }

    this.logger.log('Procesamiento de cola de correos detenido por el usuario.');
    return { success: true, message: 'La cola de envíos ha sido detenida.' };
  }

  async clearQueue() {
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (this.workerTimeout) {
      clearTimeout(this.workerTimeout);
      this.workerTimeout = null;
    }

    const { error } = await this.supabase
      .from('email_queue')
      .delete()
      .neq('status', 'processing_completed_dummy_value'); // Borrar todo

    if (error) {
      throw new HttpException(`Error al limpiar la cola: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    this.queueProgress.isProcessing = false;
    this.queueProgress.total = 0;
    this.queueProgress.sent = 0;
    this.queueProgress.failed = 0;
    this.queueProgress.currentId = null;

    return { success: true, message: 'Cola limpiada correctamente.' };
  }

  private queueProgress = {
    isProcessing: false,
    total: 0,
    sent: 0,
    failed: 0,
    currentId: null as string | null,
    signatureId: 'ricardo',
    attachment: null as { filename: string; content: string } | null,
    templateId: null as string | null,
    customSubject: null as string | null,
    customBody: null as string | null,
    customTemplateType: null as string | null,
  };

  getQueueStatus() {
    return this.queueProgress;
  }

  async processEmailQueue(
    signatureId?: string, 
    attachment?: { filename: string; content: string },
    overrideInterval?: number,
    overrideIntervalUnit?: string,
    templateId?: string,
    customSubject?: string,
    customBody?: string,
    customTemplateType?: string
  ) {
    if (this.queueProgress.isProcessing) {
      return { success: true, message: 'La cola ya se está procesando actualmente.' };
    }

    const { count, error: countErr } = await this.supabase
      .from('email_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (countErr) {
      throw new HttpException(`Error al contar pendientes: ${countErr.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    if (!count || count === 0) {
      throw new HttpException('No hay correos pendientes en la cola para enviar.', HttpStatus.BAD_REQUEST);
    }

    this.queueProgress.isProcessing = true;
    this.queueProgress.signatureId = signatureId || 'ricardo';
    this.queueProgress.attachment = attachment || null;
    this.queueProgress.templateId = templateId || null;
    this.queueProgress.customSubject = customSubject || null;
    this.queueProgress.customBody = customBody || null;
    this.queueProgress.customTemplateType = customTemplateType || null;
    this.queueProgress.total = count;
    this.queueProgress.sent = 0;
    this.queueProgress.failed = 0;
    this.queueProgress.currentId = null;

    // Si el usuario especificó intervalo directamente en la petición, sincronizarlo y usarlo de inmediato
    if (overrideInterval && Number(overrideInterval) > 0) {
      try {
        const currentSettings = await this.getCalendarSettings();
        await this.saveCalendarSettings({
          slot_duration: currentSettings.slot_duration,
          morning_start: currentSettings.morning_start,
          morning_end: currentSettings.morning_end,
          afternoon_start: currentSettings.afternoon_start,
          afternoon_end: currentSettings.afternoon_end,
          send_interval: Number(overrideInterval),
          send_interval_unit: overrideIntervalUnit || 'minutes',
        });
      } catch (err) {
        this.logger.warn(`No se pudo sincronizar overrideInterval: ${err.message}`);
      }
    }

    const settings = await this.getCalendarSettings();
    const intervalVal = Number(overrideInterval) > 0 ? Number(overrideInterval) : Number(settings.send_interval);
    const intervalUnit = overrideIntervalUnit || settings.send_interval_unit;

    let intervalMs = intervalVal * 1000;
    if (intervalUnit === 'minutes') {
      intervalMs = intervalVal * 60000;
    } else if (intervalUnit === 'hours') {
      intervalMs = intervalVal * 3600000;
    }

    this.logger.log(`Iniciando worker de cola (${count} correos). Intervalo configurado: ${intervalVal} ${intervalUnit} (${intervalMs}ms).`);

    this.runQueueWorker().catch(err => {
      this.logger.error(`Error crítico en la ejecución del worker de la cola: ${err.message}`);
      this.queueProgress.isProcessing = false;
    });

    return { success: true, message: 'Procesamiento de cola iniciado.', total: count, interval: `${intervalVal} ${intervalUnit}` };
  }

  async runQueueWorker() {
    if (!this.queueProgress.isProcessing) return;

    const { data: pendingItems, error } = await this.supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (error || !pendingItems || pendingItems.length === 0) {
      this.queueProgress.isProcessing = false;
      this.logger.log('Procesamiento de cola de correos completado.');
      return;
    }

    const item = pendingItems[0];
    this.queueProgress.currentId = item.id;

    await this.supabase
      .from('email_queue')
      .update({ status: 'processing' })
      .eq('id', item.id);

    try {
      const SENDERS = {
        ricardo: 'Ricardo Bertalmio <rbertalmio@afinitive.com.pe>'
      };
      const signature = this.queueProgress.signatureId || 'ricardo';
      const activeSender = SENDERS[signature as keyof typeof SENDERS] || undefined;

      await this.sendEmail(
        item.recipient_email,
        activeSender,
        this.queueProgress.customSubject || undefined,
        this.queueProgress.customBody || undefined,
        signature,
        this.queueProgress.attachment || undefined,
        item.proposed_time,
        item.recipient_name,
        this.queueProgress.templateId || undefined,
        this.queueProgress.customTemplateType || undefined,
      );

      await this.supabase
        .from('email_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', item.id);

      this.queueProgress.sent++;
      this.logger.log(`Correo enviado a ${item.recipient_email} (${this.queueProgress.sent}/${this.queueProgress.total})`);
    } catch (err) {
      this.logger.error(`Error enviando correo de la cola para ${item.recipient_email}: ${err.message}`);
      await this.supabase
        .from('email_queue')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', item.id);

      this.queueProgress.failed++;
    }

    // Consultar dinámicamente el intervalo activo más reciente de Supabase
    let nextIntervalMs = 120000;
    try {
      const activeSettings = await this.getCalendarSettings();
      let calculatedMs = Number(activeSettings.send_interval) * 1000;
      if (activeSettings.send_interval_unit === 'minutes') {
        calculatedMs = Number(activeSettings.send_interval) * 60000;
      } else if (activeSettings.send_interval_unit === 'hours') {
        calculatedMs = Number(activeSettings.send_interval) * 3600000;
      }
      nextIntervalMs = calculatedMs;
    } catch (e) {
      this.logger.warn(`No se pudo refrescar intervalo activo para el siguiente ciclo: ${e.message}`);
    }

    this.logger.log(`Esperando ${nextIntervalMs / 1000}s (${nextIntervalMs / 60000} min) antes del próximo envío...`);

    this.workerTimeout = setTimeout(() => {
      this.runQueueWorker();
    }, nextIntervalMs);
  }

  async confirmMeeting(calendarId: string, time: string, email: string, name: string) {
    this.logger.log(`Intentando confirmar cita en Google Calendar para: ${email} a las ${time}`);

    try {
      const auth = this.getGoogleAuth(['https://www.googleapis.com/auth/calendar']);
      const calendar = google.calendar({ version: 'v3', auth });
      const settings = await this.getCalendarSettings();
      const startTime = new Date(time);
      const endTime = new Date(startTime.getTime() + settings.slot_duration * 60000);

      const event = {
        summary: `Reunión Afinitive - ${name || email}`,
        description: `Llamada de asesoría patrimonial confirmada en la campaña masiva por el cliente ${name || ''} (${email})`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/Lima',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Lima',
        },
      };

      await calendar.events.insert({
        calendarId: calendarId,
        requestBody: event,
      });

      this.logger.log(`¡Cita registrada con éxito en el calendario de ${calendarId}!`);

      // Actualizar estado en Supabase para reflejar que el cliente agendó la cita
      if (this.supabase && email) {
        try {
          const emailClean = email.trim().toLowerCase();
          const nowIso = new Date().toISOString();

          // 1. Actualizar en email_tracking_test (Tracking de correos enviados)
          const { error: trackErr } = await this.supabase
            .from('email_tracking_test')
            .update({
              status: 'Agendado',
              opened_at: nowIso,
            })
            .ilike('recipient_email', emailClean);

          if (trackErr) {
            this.logger.warn(`No se pudo actualizar status en email_tracking_test para ${emailClean}: ${trackErr.message}`);
          } else {
            this.logger.log(`Cliente ${emailClean} actualizado a 'Agendado' en email_tracking_test.`);
          }

          // 2. Actualizar en email_queue (Cola de envíos)
          const { error: queueErr } = await this.supabase
            .from('email_queue')
            .update({
              status: 'agendado',
            })
            .ilike('recipient_email', emailClean);

          if (queueErr) {
            this.logger.warn(`No se pudo actualizar status en email_queue para ${emailClean}: ${queueErr.message}`);
          } else {
            this.logger.log(`Cliente ${emailClean} actualizado a 'agendado' en email_queue.`);
          }
        } catch (dbErr) {
          this.logger.warn(`Error al actualizar estado 'Agendado' en base de datos: ${dbErr.message}`);
        }
      }

      const advisorName = 'Ricardo Bertalmio Ruibal';

      return `
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Cita Confirmada | Afinitive</title>
            <style>
              body { font-family: Arial, sans-serif; background-color: #F8FAFC; color: #0F2942; text-align: center; padding: 50px 20px; }
              .card { max-width: 500px; margin: 0 auto; background: #FFFFFF; padding: 40px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); border: 1px solid #E2E8F0; }
              .icon { font-size: 50px; color: #10B981; margin-bottom: 20px; }
              h1 { font-size: 24px; font-weight: bold; margin-bottom: 10px; color: #0D1B2A; }
              p { font-size: 15px; color: #64748B; line-height: 1.6; margin-bottom: 30px; }
              .logo { margin-bottom: 30px; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="logo">
                <img src="https://dashbportal.com/afinitive/afi.jpeg" alt="Afinitive Logo" width="100">
              </div>
              <div class="icon">📅</div>
              <h1>¡Reunión Confirmada!</h1>
              <p>Hola <strong>${name || email}</strong>, tu cita ha sido registrada con éxito en el calendario de ${advisorName}.<br>Hemos enviado la invitación a tu correo electrónico <strong>${email}</strong>.</p>
              <div style="font-size: 13px; color: #94A3B8;">Afinitive Wealth Management</div>
            </div>
          </body>
        </html>
      `;
    } catch (err) {
      this.logger.error(`Error confirmando reunión: ${err.message}`);
      throw new HttpException(`Error al programar la reunión en Google Calendar: ${err.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async bookAppointmentPublic(data: {
    name: string;
    email: string;
    phone: string;
    time?: string;
    investmentRange?: string;
    consentPromo?: boolean;
    consentPrivacy?: boolean;
    consentDemand?: boolean;
    notes?: string;
    calendarId?: string;
    bookingSource?: string;
  }) {
    const { name, email, phone, time, investmentRange, consentPromo, consentPrivacy, consentDemand, notes, bookingSource } = data;
    if (!name || !email || !phone) {
      throw new HttpException('Nombre, correo electrónico y celular son requeridos.', HttpStatus.BAD_REQUEST);
    }

    const calendarId = data.calendarId || 'rbertalmio@afinitive.com';
    const advisorName = 'Ricardo Bertalmio Ruibal';
    const invRange = investmentRange || 'No especificado';
    const source = bookingSource || (time ? 'calendario_publico' : 'whatsapp_profiling');

    this.logger.log(`Procesando perfilamiento/agendamiento público de ${name} (${email} / ${phone}) [Rango: ${invRange}, Origen: ${source}]`);

    let startTime: Date | null = null;
    let endTime: Date | null = null;
    let eventId: string | null = null;
    let meetLink: string | null = null;

    if (time) {
      startTime = new Date(time);
      if (!isNaN(startTime.getTime())) {
        const settings = await this.getCalendarSettings();
        const durationMinutes = Number(settings.slot_duration) || 60;
        endTime = new Date(startTime.getTime() + durationMinutes * 60000);

        try {
          const auth = this.getGoogleAuth(['https://www.googleapis.com/auth/calendar']);
          const calendar = google.calendar({ version: 'v3', auth });

          const event: any = {
            summary: `Reunión Afinitive - ${name} [${invRange}]`,
            description: `Sesión de Asesoría Patrimonial Estratégica con Afinitive Wealth Management.\n\n👤 Invitado: ${name}\n✉️ Correo: ${email}\n📱 Celular / WhatsApp: ${phone}\n💰 Rango de Inversión: ${invRange}\n📝 Notas: ${notes || 'Consulta General'}\n🛡️ Asesor: ${advisorName}\n\n* Datos registrados desde el Calendario Público Oficial.`,
            start: {
              dateTime: startTime.toISOString(),
              timeZone: 'America/Lima',
            },
            end: {
              dateTime: endTime.toISOString(),
              timeZone: 'America/Lima',
            },
            attendees: [
              { email: email, displayName: name },
              { email: calendarId, displayName: advisorName },
            ],
            conferenceData: {
              createRequest: {
                requestId: `meet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                conferenceSolutionKey: { type: 'hangoutsMeet' },
              },
            },
          };

          const res = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: event,
            conferenceDataVersion: 1,
            sendUpdates: 'all',
          });

          eventId = res.data.id || null;
          meetLink = res.data.hangoutLink || res.data.conferenceData?.entryPoints?.find(p => p.entryPointType === 'video')?.uri || null;
          this.logger.log(`Evento de Google Calendar creado con éxito: ${eventId}`);
        } catch (gErr) {
          this.logger.warn(`No se pudo registrar en Google Calendar automáticamente: ${gErr.message}. Continuando con registro en BD.`);
        }
      }
    }

    // Registrar en Supabase (Reutilizando y enriqueciendo email_tracking_test y public_appointments)
    if (this.supabase) {
      try {
        const nowIso = new Date().toISOString();
        const emailClean = email.trim().toLowerCase();

        // 1. Guardar o actualizar en email_tracking_test
        const trackingPayload: any = {
          recipient_email: emailClean,
          recipient_name: name,
          recipient_phone: phone,
          investment_range: invRange,
          consent_promo: !!consentPromo,
          consent_privacy: consentPrivacy !== false,
          consent_demand: !!consentDemand,
          booking_notes: notes || null,
          booking_source: source,
          status: time ? 'Agendado' : 'WhatsApp Perfilado',
          opened_at: nowIso,
        };

        if (startTime) {
          trackingPayload.proposed_time = startTime.toISOString();
        }

        const { data: existing } = await this.supabase
          .from('email_tracking_test')
          .select('id')
          .ilike('recipient_email', emailClean)
          .limit(1);

        if (existing && existing.length > 0) {
          await this.supabase
            .from('email_tracking_test')
            .update(trackingPayload)
            .eq('id', existing[0].id);
        } else {
          trackingPayload.subject = `Contacto Directo: ${invRange}`;
          trackingPayload.sender_email = 'rbertalmio@afinitive.com.pe';
          trackingPayload.resend_email_id = `booking-${Date.now()}-${Math.random().toString(36).substring(7)}`;
          await this.supabase
            .from('email_tracking_test')
            .insert(trackingPayload);
        }

        // 2. Intentar guardar en public_appointments si existe la tabla
        try {
          await this.supabase
            .from('public_appointments')
            .insert({
              recipient_name: name,
              recipient_email: emailClean,
              recipient_phone: phone,
              investment_range: invRange,
              proposed_time: startTime ? startTime.toISOString() : null,
              consent_promo: !!consentPromo,
              consent_privacy: consentPrivacy !== false,
              consent_demand: !!consentDemand,
              notes: notes || null,
              advisor_name: advisorName,
              advisor_calendar: calendarId,
              status: startTime ? 'Agendado' : 'WhatsApp Contactado',
            });
        } catch {
          // Si la tabla no existe aún, ya quedó seguro en email_tracking_test
        }

        this.logger.log(`Datos de perfilamiento y cita de ${name} almacenados con éxito en la base de datos.`);
      } catch (dbErr) {
        this.logger.warn(`Error al registrar agendamiento en Supabase: ${dbErr.message}`);
      }
    }

    // Enviar correo de confirmación al cliente si Resend está disponible y se eligió horario
    if (this.resend && startTime) {
      try {
        const formattedDateSpanish = startTime.toLocaleDateString('es-ES', {
          timeZone: 'America/Lima',
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
        });

        const settings = await this.getCalendarSettings();
        const durationMinutes = Number(settings.slot_duration) || 60;

        await this.resend.emails.send({
          from: this.senderEmail || 'Ricardo Bertalmio <rbertalmio@afinitive.com.pe>',
          to: email,
          subject: `Confirmación de Reunión: ${name} y Ricardo Bertalmio — Afinitive`,
          html: `
            <div style="background-color: #F8FAFC; padding: 40px 20px; font-family: Arial, sans-serif; color: #0F2942;">
              <div style="max-width: 540px; margin: 0 auto; background-color: #FFFFFF; border-radius: 10px; border: 1px solid #E2E8F0; padding: 35px 30px;">
                <div style="text-align: center; margin-bottom: 25px;">
                  <img src="https://links.afinitive.com.pe/img/afinitive_logo.png" alt="Afinitive" width="65" style="display: inline-block;">
                  <h2 style="font-size: 20px; color: #0D1B2A; margin: 15px 0 5px 0;">¡Tu cita ha sido agendada con éxito!</h2>
                  <p style="font-size: 14px; color: #64748B; margin: 0;">Sesión de Asesoría Patrimonial</p>
                </div>
                
                <div style="background-color: #F1F5F9; border-radius: 8px; padding: 20px; margin-bottom: 25px; font-size: 14px; line-height: 1.6;">
                  <p style="margin: 0 0 8px 0;"><strong>👤 Asesor:</strong> ${advisorName} (CEO Afinitive)</p>
                  <p style="margin: 0 0 8px 0;"><strong>📅 Fecha y Hora:</strong> ${formattedDateSpanish}</p>
                  <p style="margin: 0 0 8px 0;"><strong>⏱️ Duración:</strong> ${durationMinutes} minutos</p>
                  ${meetLink ? `<p style="margin: 0 0 8px 0;"><strong>📹 Google Meet:</strong> <a href="${meetLink}" style="color: #0D1B2A; font-weight: bold;">Unirse a la llamada</a></p>` : ''}
                  ${phone ? `<p style="margin: 0;"><strong>📱 Contacto:</strong> ${phone}</p>` : ''}
                </div>

                <p style="font-size: 13px; color: #475569; line-height: 1.6; text-align: justify; margin-bottom: 25px;">
                  Estimado(a) <strong>${name}</strong>, nos pondremos en contacto contigo a la fecha y hora acordada. Si requieres reprogramar o necesitas atención inmediata, puedes escribirnos por WhatsApp al <a href="https://wa.me/51982100208" style="color: #25D366; font-weight: bold;">(511) 982100208</a>.
                </p>

                <div style="border-top: 1px solid #E2E8F0; padding-top: 20px; text-align: center; font-size: 11px; color: #94A3B8;">
                  Afinitive Wealth Management • Av. Camino Real, San Isidro, Lima.
                </div>
              </div>
            </div>
          `,
        });
      } catch (emailErr) {
        this.logger.warn(`No se pudo enviar correo de confirmación de reserva: ${emailErr.message}`);
      }
    }

    return {
      success: true,
      message: startTime ? 'Reunión agendada exitosamente' : 'Perfilamiento para WhatsApp guardado exitosamente',
      appointment: {
        name,
        email,
        phone,
        time: startTime ? startTime.toISOString() : undefined,
        advisorName,
        meetLink,
        investmentRange: invRange,
        bookingSource: source,
      },
    };
  }

  async trackWhatsAppClick(email?: string, name?: string, signatureId?: string): Promise<string> {
    this.logger.log(`Registrando clic en WhatsApp para el destinatario: ${email || 'Desconocido'}`);

    const frontendUrl = (this.configService.get<string>('FRONTEND_URL') || process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/+$/, '');
    const targetUrl = `${frontendUrl}/agendar?mode=whatsapp&email=${encodeURIComponent(email || '')}&name=${encodeURIComponent(name || '')}`;

    if (this.supabase && email) {
      try {
        const emailClean = email.trim().toLowerCase();
        const nowIso = new Date().toISOString();

        // 1. Actualizar en email_tracking_test
        const { data: existingRecords, error: fetchErr } = await this.supabase
          .from('email_tracking_test')
          .select('id, status, opened_at, whatsapp_clicked_at')
          .ilike('recipient_email', emailClean);

        if (!fetchErr && existingRecords && existingRecords.length > 0) {
          for (const record of existingRecords) {
            const updatePayload: any = {
              whatsapp_clicked_at: nowIso,
            };
            if (!record.opened_at) {
              updatePayload.opened_at = nowIso;
            }
            if (record.status === 'Enviado') {
              updatePayload.status = 'Leído';
            }

            await this.supabase
              .from('email_tracking_test')
              .update(updatePayload)
              .eq('id', record.id);
          }
          this.logger.log(`Cliente ${emailClean} registrado con clic de WhatsApp en email_tracking_test.`);
        }

        // 2. Actualizar en email_queue si existe
        const { error: queueErr } = await this.supabase
          .from('email_queue')
          .update({
            whatsapp_clicked_at: nowIso,
          })
          .ilike('recipient_email', emailClean);

        if (queueErr) {
          this.logger.warn(`No se pudo actualizar whatsapp_clicked_at en email_queue: ${queueErr.message}`);
        } else {
          this.logger.log(`Cliente ${emailClean} registrado con clic de WhatsApp en email_queue.`);
        }
      } catch (dbErr) {
        this.logger.warn(`Error al registrar clic de WhatsApp en base de datos: ${dbErr.message}`);
      }
    }

    return `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="refresh" content="0; url=${targetUrl}">
          <title>Redirigiendo a Afinitive | WhatsApp</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0D1B2A; color: #FFFFFF; text-align: center; padding: 60px 20px; margin: 0; }
            .card { max-width: 440px; margin: 0 auto; background: #1B2A4A; padding: 40px 30px; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); border: 1px solid rgba(201, 168, 76, 0.3); }
            .icon { font-size: 48px; margin-bottom: 15px; }
            h2 { margin: 0 0 10px 0; color: #FFFFFF; font-size: 20px; font-weight: 600; }
            p { color: #94A3B8; font-size: 14px; line-height: 1.5; margin: 0 0 20px 0; }
            .spinner { width: 36px; height: 36px; border: 3px solid rgba(255,255,255,0.15); border-top: 3px solid #25D366; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 20px auto; }
            @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            a.btn { display: inline-block; background-color: #25D366; color: #FFFFFF; padding: 12px 28px; font-weight: bold; border-radius: 8px; text-decoration: none; font-size: 14px; transition: background 0.2s; box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3); }
            a.btn:hover { background-color: #20BA56; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="icon">💬</div>
            <h2>Conectando con WhatsApp...</h2>
            <p>Te estamos redirigiendo para completar tus preferencias y coordinar con <strong>Afinitive Wealth Management</strong>.</p>
            <div class="spinner"></div>
            <p style="font-size: 12px; color: #64748B; margin-top: 15px;">Si no abre automáticamente en unos segundos:</p>
            <a href="${targetUrl}" class="btn">Continuar</a>
          </div>
          <script>
            window.location.href = "${targetUrl}";
          </script>
        </body>
      </html>
    `;
  }

  async getAvailableSlots(signatureId?: string) {
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const settings = await this.getCalendarSettings();
    const calendarId = 'rbertalmio@afinitive.com';

    // 1. Consultar eventos ocupados en Google Calendar para los próximos 14 días
    let occupiedEvents: any[] = [];
    try {
      const auth = this.getGoogleAuth(['https://www.googleapis.com/auth/calendar.readonly']);
      const calendar = google.calendar({ version: 'v3', auth });
      const response = await calendar.events.list({
        calendarId: calendarId,
        timeMin: new Date().toISOString(),
        timeMax: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      occupiedEvents = response.data.items || [];
    } catch (err) {
      this.logger.error(`Error consultando calendario para obtener slots libres: ${err.message}`);
    }

    // 2. Obtener slots ya reservados en la base de datos (Omitido para permitir reasignación libre del operador)

    const parseTime = (timeStr: string) => {
      const [h, m] = (timeStr || '09:00').split(':').map(Number);
      return { hours: isNaN(h) ? 9 : h, minutes: isNaN(m) ? 0 : m };
    };

    const morningS = parseTime(settings.morning_start);
    const morningE = parseTime(settings.morning_end);
    const afternoonS = parseTime(settings.afternoon_start);
    const afternoonE = parseTime(settings.afternoon_end);

    const availableSlotsByDay: { [key: string]: string[] } = {};

    const todayLima = this.getTodayInLima();
    // Empezamos desde mañana en Lima
    let currentDayDate = new Date(`${todayLima.year}-${String(todayLima.month).padStart(2, '0')}-${String(todayLima.day).padStart(2, '0')}T12:00:00-05:00`);
    currentDayDate.setDate(currentDayDate.getDate() + 1);

    for (let day = 0; day < 14; day++) {
      const dayOfWeek = currentDayDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        currentDayDate.setDate(currentDayDate.getDate() + 1);
        continue;
      }

      const yyyy = currentDayDate.getFullYear();
      const mm = currentDayDate.getMonth() + 1;
      const dd = currentDayDate.getDate();
      const pad = (n: number) => String(n).padStart(2, '0');
      const dayKey = `${yyyy}-${pad(mm)}-${pad(dd)}`;

      const slots: { start: Date; end: Date; timeLabel: string }[] = [];

      const addSlotsForBlock = (startHour: number, startMin: number, endHour: number, endMin: number) => {
        let currentSlotStart = this.createLimaDate(yyyy, mm, dd, startHour, startMin);
        const limit = this.createLimaDate(yyyy, mm, dd, endHour, endMin);

        while (currentSlotStart.getTime() + settings.slot_duration * 60000 <= limit.getTime()) {
          const slotStart = new Date(currentSlotStart);
          const slotEnd = new Date(currentSlotStart.getTime() + settings.slot_duration * 60000);
          
          const hStr = slotStart.toLocaleTimeString('en-GB', { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', hour12: false });
          slots.push({ start: slotStart, end: slotEnd, timeLabel: hStr });
          
          currentSlotStart = new Date(currentSlotStart.getTime() + settings.slot_duration * 60000);
        }
      };

      // Agregar mañana y tarde
      addSlotsForBlock(morningS.hours, morningS.minutes, morningE.hours, morningE.minutes);
      addSlotsForBlock(afternoonS.hours, afternoonS.minutes, afternoonE.hours, afternoonE.minutes);

      const dayFreeSlots: string[] = [];

      for (const slot of slots) {
        // Verificar si colisiona con eventos de Google Calendar
        const isOccupiedInGoogle = occupiedEvents.some(event => {
          const eventStart = new Date(event.start?.dateTime || event.start?.date);
          const eventEnd = new Date(event.end?.dateTime || event.end?.date);
          return slot.start.getTime() < eventEnd.getTime() && slot.end.getTime() > eventStart.getTime();
        });

        if (isOccupiedInGoogle) continue;

        dayFreeSlots.push(slot.timeLabel);
      }

      if (dayFreeSlots.length > 0) {
        availableSlotsByDay[dayKey] = dayFreeSlots;
      }

      currentDayDate.setDate(currentDayDate.getDate() + 1);
    }

    return availableSlotsByDay;
  }

  getGreeting(fullName: string): string {
    if (!fullName) return 'Estimado(a)';
    
    const firstName = fullName.trim().split(' ')[0].toLowerCase();
    
    const maleExceptions = ['luca', 'andrea', 'bautista', 'borja', 'jozef', 'mustafa'];
    
    const femaleExceptions = [
      'isabel', 'carmen', 'raquel', 'beatriz', 'pilar', 'lourdes', 
      'ines', 'belen', 'irene', 'abigail', 'judith', 'esther', 
      'miriam', 'wendy', 'shirley', 'rut', 'ruth'
    ];
    
    if (femaleExceptions.includes(firstName)) {
      return 'Estimada';
    }
    
    if (maleExceptions.includes(firstName)) {
      return 'Estimado';
    }
    
    if (firstName.endsWith('a') || firstName.endsWith('y')) {
      return 'Estimada';
    }
    
    return 'Estimado';
  }
}
