import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import * as fs from 'fs';
import * as path from 'path';
import { google } from 'googleapis';

// Catálogo de Firmas Corporativas Disponibles
const SIGNATURES = {
  irina: `
              <!-- FIRMA: IRINA PORTILLA -->
              <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 100%; background-color: #ffffff;">
                <tr>
                  <!-- 1. Columna del Logo -->
                  <td valign="middle" style="padding-right: 15px;">
                    <img src="https://dashbportal.com/afinitive/afi.jpeg" alt="Afinitive" width="120" style="display: block; border: none;">
                  </td>

                  <!-- 2. Columna de la Foto de Perfil -->
                  <td valign="middle" style="padding-right: 20px;">
                    <img src="https://dashbportal.com/afinitive/foto_irina.png" alt="Irina Portilla Farfán" width="90" style="display: block; border-radius: 50%; box-shadow: 0px 0px 5px rgba(0,0,0,0.15);">
                  </td>

                  <!-- 3. Columna de Datos de Contacto -->
                  <td valign="middle">
                    
                    <!-- Nombre y Cargo -->
                    <table cellpadding="0" cellspacing="0" border="0" style="width: 100%; margin-bottom: 8px;">
                      <tr>
                        <td style="padding-bottom: 3px;">
                          <span style="font-size: 18px; color: #000000; font-weight: bold; margin: 0; line-height: 1.1; font-family: Arial, sans-serif;">Irina Portilla Farfán</span>
                        </td>
                      </tr>
                      <tr>
                        <td>
                          <span style="font-size: 13px; color: #555555; margin: 0; font-family: Arial, sans-serif;">Client Experience Manager</span>
                        </td>
                      </tr>
                    </table>

                    <!-- Datos de Contacto -->
                    <table cellpadding="0" cellspacing="0" border="0" style="font-size: 12px; color: #000000; font-family: Arial, sans-serif;">
                      <tr>
                        <td valign="middle" style="padding: 0 15px 4px 0; white-space: nowrap;">
                          <img src="https://cdn-icons-png.flaticon.com/512/15/15874.png" width="13" style="vertical-align: middle; margin-right: 4px; border: none;" alt="Celular">
                          <span style="vertical-align: middle;">(511) 930111655</span>
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
                          <a href="https://www.linkedin.com/in/irina-portilla-farfan" style="text-decoration: none; color: #000000;" target="_blank">
                            <img src="https://cdn-icons-png.flaticon.com/512/174/174857.png" width="13" style="vertical-align: middle; margin-right: 4px; border: none;" alt="LinkedIn">
                            <span style="vertical-align: middle;">irina-portilla-farfan</span>
                          </a>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
  `,
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

  constructor(private configService: ConfigService) {
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
    recipientName?: string
  ) {
    this.logger.log(`Intentando enviar correo de prueba a: ${recipientEmail} desde: ${customSender || this.senderEmail} con firma: ${signatureId || 'default (irina)'}${attachment ? ` con adjunto: ${attachment.filename}` : ''}`);

    if (!this.resend) {
      throw new HttpException('El servicio de Resend no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const sender = customSender || this.senderEmail;
    const subject = customSubject || 'Invitación Exclusiva - Afinitive';
    const emailBody = customBody || 'Este es un correo electrónico de prueba enviado para validar el Módulo de Monitoreo Omnicanal.';
    
    // Formatear saltos de línea para el cuerpo del mensaje en caso de que sea texto plano
    const formattedBodyHtml = emailBody.replace(/\n/g, '<br />');

    // Botón de confirmar cita dinámico (apunta al backend usando URL pública en producción o localhost en desarrollo)
    const backendBaseUrl = (this.configService.get<string>('BACKEND_PUBLIC_URL') || process.env.BACKEND_PUBLIC_URL || process.env.APP_URL || `http://localhost:${process.env.PORT || 3080}`).replace(/\/+$/, '');
    const confirmLink = `${backendBaseUrl}/api/test-email/confirm-meeting?calendarId=${signatureId === 'ricardo' ? 'rbertalmio@afinitive.com' : 'iportilla@afinitive.com.pe'}&time=${encodeURIComponent(proposedTime || '')}&email=${encodeURIComponent(recipientEmail)}&name=${encodeURIComponent(recipientName || '')}`;
    
    const confirmButtonHtml = `
      <div style="text-align: center; margin: 25px 0;">
        <a href="${confirmLink}" 
           style="display: inline-block; background-color: #0D1B2A; color: #FFFFFF; padding: 12px 30px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 6px; letter-spacing: 0.5px; box-shadow: 0 2px 5px rgba(0,0,0,0.15); font-family: Arial, sans-serif;">
          📅 CONFIRMAR CITA
        </a>
      </div>
    `;

    let finalBodyHtml = formattedBodyHtml;
    if (finalBodyHtml.includes('[CONFIRMAR_CITA]')) {
      finalBodyHtml = finalBodyHtml.replace('[CONFIRMAR_CITA]', confirmButtonHtml);
    } else if (finalBodyHtml.includes('[AGENDAR_LLAMADA]')) {
      finalBodyHtml = finalBodyHtml.replace('[AGENDAR_LLAMADA]', confirmButtonHtml);
    } else {
      // Si no contiene ningún marcador, agregamos el botón de confirmación de cita por defecto al final
      finalBodyHtml = finalBodyHtml + confirmButtonHtml;
    }

    // Obtener la firma correspondiente del catálogo
    const activeSignatureHtml = (signatureId && signatureId in SIGNATURES)
      ? SIGNATURES[signatureId as keyof typeof SIGNATURES]
      : SIGNATURES['irina'];

    const logoUrl = this.configService.get<string>('EMAIL_LOGO_URL') || process.env.EMAIL_LOGO_URL || 'https://operador.afinitive.com.pe/afinitive_logo.png';

    try {
      // Opciones de envío de correo
      const mailOptions: any = {
        from: sender,
        to: [recipientEmail],
        subject: subject,
        html: `
          <div style="background-color: #F0F4F8; padding: 40px 20px; font-family: Arial, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;">
              
              <!-- Cabecera Premium en Fondo Blanco -->
              <div style="padding: 30px 40px 25px 40px; border-bottom: 1px solid #F1F5F9; background-color: #FFFFFF;">
                <table cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF;">
                  <tr>
                    <td valign="middle" style="padding-right: 15px; line-height: 0;">
                      <!-- Logo del Árbol Azul de Afinitive -->
                      <img src="${logoUrl}" alt="Afinitive Logo" width="65" style="display: block; border: none;">
                    </td>
                    <td valign="middle" style="line-height: 1.15;">
                      <div style="font-family: Arial, sans-serif;">
                        <span style="font-size: 10px; color: #5B728A; letter-spacing: 2px; text-transform: uppercase; font-weight: normal; display: block; margin-bottom: 1px;">AFINITIVE</span>
                        <span style="font-size: 17px; color: #0F2942; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; display: block;">WEALTH MANAGEMENT</span>
                      </div>
                    </td>
                  </tr>
                </table>
              </div>

              <!-- Cuerpo del Correo -->
              <div style="padding: 30px 40px 20px 40px; font-size: 15px; line-height: 1.6; color: #334155; min-height: 100px;">
                ${finalBodyHtml}
              </div>
              
              <!-- Firma del Operador: Fondo Blanco (HTML Dinámico de Firma) -->
              <div style="background-color: #ffffff; padding: 20px 40px 30px 40px; border-top: 1px solid #F1F5F9;">
                ${activeSignatureHtml}
              </div>
              
              <!-- Pie de Monitoreo -->
              <div style="background-color: #F8FAFC; padding: 15px; text-align: center; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0;">
                Este correo de invitación contiene elementos de monitoreo de recepción. Afinitive Inc.
              </div>
            </div>
          </div>
        `,
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
      const { data, error } = await this.supabase
        .from('email_tracking_test')
        .insert([
          {
            recipient_email: recipientEmail,
            subject: subject,
            status: 'Enviado',
            resend_email_id: emailId,
            sent_at: new Date().toISOString(),
          },
        ])
        .select();

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
      // Valores por defecto
      return {
        id: 1,
        slot_duration: 60,
        morning_start: '09:00',
        morning_end: '12:00',
        afternoon_start: '14:00',
        afternoon_end: '17:00',
        send_interval: 5,
        send_interval_unit: 'minutes',
      };
    }

    return data;
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

    const { data, error } = await this.supabase
      .from('calendar_settings')
      .upsert({
        id: 1,
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select();

    if (error) {
      throw new HttpException(`Error al guardar configuraciones: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return data[0];
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
    // Empezamos la búsqueda a partir del día de mañana
    let searchDate = new Date();
    searchDate.setDate(searchDate.getDate() + 1);
    searchDate.setHours(0, 0, 0, 0);

    const parseTime = (timeStr: string) => {
      const [h, m] = timeStr.split(':').map(Number);
      return { hours: h, minutes: m };
    };

    const morningS = parseTime(morningStart);
    const morningE = parseTime(morningEnd);
    const afternoonS = parseTime(afternoonStart);
    const afternoonE = parseTime(afternoonEnd);

    // Buscaremos durante un máximo de 14 días
    for (let day = 0; day < 14; day++) {
      // Saltar fines de semana (Sábado = 6, Domingo = 0)
      const dayOfWeek = searchDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        searchDate.setDate(searchDate.getDate() + 1);
        continue;
      }

      // Candidatos de mañana
      const slots: { start: Date; end: Date }[] = [];
      
      const addSlotsForBlock = (startHour: number, startMin: number, endHour: number, endMin: number) => {
        let current = new Date(searchDate);
        current.setHours(startHour, startMin, 0, 0);

        const limit = new Date(searchDate);
        limit.setHours(endHour, endMin, 0, 0);

        while (current.getTime() + durationMinutes * 60000 <= limit.getTime()) {
          const slotStart = new Date(current);
          const slotEnd = new Date(current.getTime() + durationMinutes * 60000);
          slots.push({ start: slotStart, end: slotEnd });
          current = new Date(current.getTime() + durationMinutes * 60000);
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

      searchDate.setDate(searchDate.getDate() + 1);
    }

    const fallbackDate = new Date();
    fallbackDate.setDate(fallbackDate.getDate() + 1);
    fallbackDate.setHours(10, 0, 0, 0);
    return fallbackDate;
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

    // 3. Consultar todos los eventos de Ricardo en Google Calendar para los próximos 14 días
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

    // 4. Calcular slot y armar records
    for (const contact of contacts) {
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

    // 5. Guardar en base de datos
    if (queueItems.length > 0) {
      const { data, error } = await this.supabase
        .from('email_queue')
        .insert(queueItems)
        .select();

      if (error) {
        throw new HttpException(`Error al guardar contactos en cola: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
      }
      return data;
    }

    return [];
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

  async clearQueue() {
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
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
    signatureId: 'irina',
    attachment: null as { filename: string; content: string } | null,
  };

  getQueueStatus() {
    return this.queueProgress;
  }

  async processEmailQueue(signatureId?: string, attachment?: { filename: string; content: string }) {
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
    this.queueProgress.signatureId = signatureId || 'irina';
    this.queueProgress.attachment = attachment || null;
    this.queueProgress.total = count;
    this.queueProgress.sent = 0;
    this.queueProgress.failed = 0;
    this.queueProgress.currentId = null;

    const settings = await this.getCalendarSettings();
    let intervalMs = settings.send_interval * 1000;
    if (settings.send_interval_unit === 'minutes') {
      intervalMs = settings.send_interval * 60000;
    } else if (settings.send_interval_unit === 'hours') {
      intervalMs = settings.send_interval * 3600000;
    }

    this.runQueueWorker(intervalMs).catch(err => {
      this.logger.error(`Error crítico en la ejecución del worker de la cola: ${err.message}`);
      this.queueProgress.isProcessing = false;
    });

    return { success: true, message: 'Procesamiento de cola iniciado.', total: count };
  }

  async runQueueWorker(intervalMs: number) {
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
      const date = new Date(item.proposed_time);
      const formattedDate = date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });

      const SENDERS = {
        irina: 'Irina Portilla <iportilla@afinitive.com.pe>',
        ricardo: 'Ricardo Bertalmio <rbertalmio@afinitive.com.pe>'
      };
      const signature = this.queueProgress.signatureId || 'irina';
      const activeSender = SENDERS[signature as keyof typeof SENDERS] || undefined;

      const nameInBody = signature === 'ricardo' ? 'Ricardo Bertalmio Ruibal' : 'Irina Portilla Farfán';
      const roleInBody = signature === 'ricardo'
        ? 'Soy economista de la Universidad del Pacífico y dirijo Afinitive Wealth Management'
        : 'Soy Client Experience Manager en Afinitive Wealth Management';

      const greeting = this.getGreeting(item.recipient_name);
      const personalizedBody = `${greeting} ${item.recipient_name}:

Le escribo porque encontré su perfil en LinkedIn. Compartimos varios contactos en común, y me pareció oportuno tomar la iniciativa de escribirle.

Mi nombre es <strong>${nameInBody}</strong>. ${roleInBody}, una boutique de asesoría patrimonial. Le escribo porque sé perfectamente lo frustrante que es para perfiles como el suyo lidiar con la banca tradicional en Lima, donde casi siempre le intentan colocar sus propios productos financieros masivos, <strong>en lugar de ofrecer asesoría integral, objetiva y profesional</strong>.

Nosotros operamos al revés: no tenemos productos propios. Trabajamos con arquitectura abierta para optimizar la estructura de ingresos y el capital de un grupo muy selecto de personas:

• Morgan Stanley
• BNY Mellon
• Coril

Le adjunto una presentación muy ejecutiva (<em>Afinitive Wealth | Tailor Made</em>) que detalla cómo estructuramos los balances y flujos, y maximizamos ingresos a partir de una inversión más eficiente que la que la oferta masiva puede lograr. Si nos busca en Google o LinkedIn, verá que mi trayectoria y la de mi equipo es transparente y de largo aliento.

Entendiendo que sus tiempos son ajustados, le acomodaría una reunión virtual vía Meet o una llamada telefónica de 20 minutos el día <strong>${formattedDate}</strong>?

[CONFIRMAR_CITA]

Me avisa para agendar,`;

      await this.sendEmail(
        item.recipient_email,
        activeSender,
        'Invitación Exclusiva - Afinitive Wealth Management',
        personalizedBody,
        signature,
        this.queueProgress.attachment || undefined,
        item.proposed_time,
        item.recipient_name
      );

      await this.supabase
        .from('email_queue')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', item.id);

      this.queueProgress.sent++;
    } catch (err) {
      this.logger.error(`Error enviando correo de la cola para ${item.recipient_email}: ${err.message}`);
      await this.supabase
        .from('email_queue')
        .update({ status: 'failed', error_message: err.message })
        .eq('id', item.id);

      this.queueProgress.failed++;
    }

    setTimeout(() => {
      this.runQueueWorker(intervalMs);
    }, intervalMs);
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
              <p>Hola <strong>${name || email}</strong>, tu cita ha sido registrada con éxito en el calendario de Ricardo Bertalmio.<br>Hemos enviado la invitación a tu correo electrónico <strong>${email}</strong>.</p>
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

  async getAvailableSlots(signatureId?: string) {
    if (!this.supabase) {
      throw new HttpException('El servicio de Supabase no está configurado', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const settings = await this.getCalendarSettings();
    const signature = signatureId || 'irina';
    const calendarId = signature === 'ricardo' ? 'rbertalmio@afinitive.com' : 'iportilla@afinitive.com.pe';

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
      const [h, m] = timeStr.split(':').map(Number);
      return { hours: h, minutes: m };
    };

    const morningS = parseTime(settings.morning_start);
    const morningE = parseTime(settings.morning_end);
    const afternoonS = parseTime(settings.afternoon_start);
    const afternoonE = parseTime(settings.afternoon_end);

    const availableSlotsByDay: { [key: string]: string[] } = {};

    let searchDate = new Date();
    // Empezamos desde mañana
    searchDate.setDate(searchDate.getDate() + 1);
    searchDate.setHours(0, 0, 0, 0);

    for (let day = 0; day < 14; day++) {
      const dayOfWeek = searchDate.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        searchDate.setDate(searchDate.getDate() + 1);
        continue;
      }

      const slots: { start: Date; end: Date }[] = [];

      const addSlotsForBlock = (startHour: number, startMin: number, endHour: number, endMin: number) => {
        let current = new Date(searchDate);
        current.setHours(startHour, startMin, 0, 0);

        const limit = new Date(searchDate);
        limit.setHours(endHour, endMin, 0, 0);

        while (current.getTime() + settings.slot_duration * 60000 <= limit.getTime()) {
          const slotStart = new Date(current);
          const slotEnd = new Date(current.getTime() + settings.slot_duration * 60000);
          slots.push({ start: slotStart, end: slotEnd });
          current = new Date(current.getTime() + settings.slot_duration * 60000);
        }
      };

      // Agregar mañana y tarde
      addSlotsForBlock(morningS.hours, morningS.minutes, morningE.hours, morningE.minutes);
      addSlotsForBlock(afternoonS.hours, afternoonS.minutes, afternoonE.hours, afternoonE.minutes);

      const yyyy = searchDate.getFullYear();
      const mm = String(searchDate.getMonth() + 1).padStart(2, '0');
      const dd = String(searchDate.getDate()).padStart(2, '0');
      const dayKey = `${yyyy}-${mm}-${dd}`;
      const dayFreeSlots: string[] = [];

      for (const slot of slots) {
        // Verificar si colisiona con eventos de Google Calendar
        const isOccupiedInGoogle = occupiedEvents.some(event => {
          const eventStart = new Date(event.start?.dateTime || event.start?.date);
          const eventEnd = new Date(event.end?.dateTime || event.end?.date);
          return slot.start.getTime() < eventEnd.getTime() && slot.end.getTime() > eventStart.getTime();
        });

        if (isOccupiedInGoogle) continue;

        // (Verificación de slots en base de datos omitida para permitir libre edición)

        // Formatear la hora en HH:MM
        const hours = slot.start.getHours().toString().padStart(2, '0');
        const minutes = slot.start.getMinutes().toString().padStart(2, '0');
        dayFreeSlots.push(`${hours}:${minutes}`);
      }

      if (dayFreeSlots.length > 0) {
        availableSlotsByDay[dayKey] = dayFreeSlots;
      }

      searchDate.setDate(searchDate.getDate() + 1);
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
