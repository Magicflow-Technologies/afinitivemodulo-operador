import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Resend } from 'resend';

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
    signatureId?: string
  ) {
    this.logger.log(`Intentando enviar correo de prueba a: ${recipientEmail} desde: ${customSender || this.senderEmail} con firma: ${signatureId || 'default (irina)'}`);

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

    // Obtener la firma correspondiente del catálogo
    const activeSignatureHtml = (signatureId && signatureId in SIGNATURES)
      ? SIGNATURES[signatureId as keyof typeof SIGNATURES]
      : SIGNATURES['irina'];

    try {
      // Enviamos el correo usando el SDK de Resend.
      // Encapsulamos el mensaje dinámico del usuario dentro de la plantilla corporativa premium.
      const response = await this.resend.emails.send({
        from: sender,
        to: [recipientEmail],
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid rgba(201, 168, 76, 0.3); border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.15);">
            <!-- Contenido del Correo: Fondo Oscuro Corporativo -->
            <div style="padding: 30px 30px 40px 30px; background-color: #0D1B2A; color: #FFFFFF;">
              <div style="text-align: center; border-bottom: 1px solid rgba(201, 168, 76, 0.3); padding-bottom: 15px; margin-bottom: 25px;">
                <h2 style="color: #C9A84C; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">AFINITIVE</h2>
                <span style="font-size: 10px; color: #C9A84C; letter-spacing: 2px; text-transform: uppercase;">Invitación Exclusiva</span>
              </div>
              <div style="font-size: 15px; line-height: 1.6; color: #E2E8F0; min-height: 100px;">
                ${formattedBodyHtml}
              </div>
            </div>
            
            <!-- Firma del Operador: Fondo Blanco (HTML Dinámico de Firma) -->
            <div style="background-color: #ffffff; padding: 25px; border-top: 1px solid rgba(201, 168, 76, 0.2);">
              ${activeSignatureHtml}
            </div>
            
            <!-- Pie de Monitoreo -->
            <div style="background-color: #F8FAFC; padding: 12px; text-align: center; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0;">
              Este correo de invitación contiene elementos de monitoreo de recepción. Afinitive Inc.
            </div>
          </div>
        `,
      });

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
}
