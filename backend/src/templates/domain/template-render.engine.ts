import { Injectable } from '@nestjs/common';
import { EmailTemplate, RenderContext } from './email-template.entity';

export const SIGNATURES = {
  ricardo: `
    <!-- FIRMA: RICARDO BERTALMIO -->
    <table cellpadding="0" cellspacing="0" border="0" style="font-family: Arial, Helvetica, sans-serif; max-width: 100%; background-color: #ffffff;">
      <tr>
        <td valign="middle" style="padding-right: 15px;">
          <img src="https://links.afinitive.com.pe/img/afinitive_logo.png" alt="Afinitive" width="100" style="display: block; border: none;">
        </td>
        <td valign="middle" style="padding-right: 20px;">
          <img src="https://dashbportal.com/afinitive/rbertalmio.png" alt="Ricardo Bertalmio Ruibal" width="90" style="display: block; border-radius: 50%; box-shadow: 0px 0px 5px rgba(0,0,0,0.15);">
        </td>
        <td valign="middle">
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
  `,
};

@Injectable()
export class TemplateRenderEngine {
  /**
   * Determina si un contenido HTML debe tratarse como un documento HTML completo o parcial.
   */
  public detectTemplateType(content: string): 'full_html' | 'standard_wrapper' {
    if (!content) return 'standard_wrapper';
    const clean = content.trim().toLowerCase();
    if (clean.includes('<!doctype html') || clean.includes('<html') || clean.includes('<body') || clean.includes('<table role="presentation"')) {
      return 'full_html';
    }
    return 'standard_wrapper';
  }

  /**
   * Renderiza el contenido final del correo a partir de una plantilla y contexto del destinatario.
   */
  public render(template: EmailTemplate | { type: string; htmlContent: string; subject?: string }, context: RenderContext): { subject: string; html: string } {
    const signatureId = 'ricardo';
    const baseUrl = (context.backendBaseUrl || 'https://links.afinitive.com.pe').replace(/\/+$/, '');
    const cleanName = (context.recipientName || 'Marielisa').trim();
    const greeting = this.getGreeting(cleanName);
    const formattedDate = this.formatDate(context.proposedTime);

    // Operador / Remitente dinámico (Exclusivo Ricardo Bertalmio)
    const operatorName = 'Ricardo Bertalmio Ruibal';
    const operatorRole = 'Soy economista de la Universidad del Pacífico y dirijo Afinitive Wealth Management';
    const operatorCalendarId = 'rbertalmio@afinitive.com';

    // Generar enlaces de tracking
    const confirmMeetingLink = `${baseUrl}/api/test-email/confirm-meeting?calendarId=${operatorCalendarId}&time=${encodeURIComponent(context.proposedTime || '')}&email=${encodeURIComponent(context.recipientEmail || '')}&name=${encodeURIComponent(cleanName)}`;
    const whatsappTrackingLink = `${baseUrl}/api/test-email/whatsapp-click?email=${encodeURIComponent(context.recipientEmail || '')}&name=${encodeURIComponent(cleanName)}&signatureId=${signatureId}`;

    // Botones de acción dinámicos institucionales
    const actionButtonsHtml = `
      <div style="text-align: center; margin: 30px 0 25px 0;">
        <div style="margin-bottom: 20px;">
          <a href="${confirmMeetingLink}" 
             style="display: inline-block; background-color: #0D1B2A; color: #FFFFFF; padding: 13px 32px; font-weight: bold; font-size: 14px; text-decoration: none; border-radius: 6px; letter-spacing: 0.5px; box-shadow: 0 2px 6px rgba(0,0,0,0.18); font-family: Arial, sans-serif;">
            📅 CONFIRMAR CITA
          </a>
        </div>
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #E2E8F0;">
          <p style="font-size: 13px; color: #64748B; margin: 0 0 10px 0; text-align: center; font-family: Arial, sans-serif;">
            Si deseas más información o cambiar la cita contáctanos aquí:
          </p>
          <a href="${whatsappTrackingLink}" 
             target="_blank"
             style="display: inline-block; background-color: #25D366; color: #FFFFFF; padding: 11px 26px; font-weight: bold; font-size: 13px; text-decoration: none; border-radius: 6px; letter-spacing: 0.5px; box-shadow: 0 2px 6px rgba(37, 211, 102, 0.25); font-family: Arial, sans-serif;">
            💬 Chatear por WhatsApp
          </a>
        </div>
      </div>
    `;

    // Reemplazo de variables universales en el cuerpo
    let processedContent = template.htmlContent || '';

    // Tokens con llaves {{variable}}
    processedContent = processedContent
      .replace(/\{\{\s*nombre\s*\}\}/gi, cleanName)
      .replace(/\{\{\s*saludo\s*\}\}/gi, greeting)
      .replace(/\{\{\s*fecha_reunion\s*\}\}/gi, formattedDate)
      .replace(/\{\{\s*fecha\s*\}\}/gi, formattedDate)
      .replace(/\{\{\s*firma_nombre\s*\}\}/gi, operatorName)
      .replace(/\{\{\s*firma_cargo\s*\}\}/gi, operatorRole)
      .replace(/\{\{\s*whatsapp_link\s*\}\}/gi, whatsappTrackingLink)
      .replace(/\{\{\s*agendar_link\s*\}\}/gi, confirmMeetingLink)
      .replace(/\{\{\s*calendario_link\s*\}\}/gi, confirmMeetingLink)
      .replace(/\{\{\s*confirmar_cita_link\s*\}\}/gi, confirmMeetingLink);

    // Asunto personalizado
    let processedSubject = template.subject || 'Invitación Exclusiva - Afinitive';
    processedSubject = processedSubject
      .replace(/\{\{\s*nombre\s*\}\}/gi, cleanName)
      .replace(/\{\{\s*fecha_reunion\s*\}\}/gi, formattedDate);

    // 1. MODO: DOCUMENTO HTML COMPLETO (Landing / Campaña Autónoma)
    if (template.type === 'full_html') {
      let finalFullHtml = processedContent;
      
      // Auto-detección y reemplazo universal de enlaces de Agenda / Calendario (incluye afinitive.com.pe/agenda)
      finalFullHtml = finalFullHtml.replace(
        /href=["']https?:\/\/(?:www\.)?afinitive\.com(?:\.pe)?\/(?:agenda|agendar|calendario|booking|cita|reservar)[^"']*["']/gi,
        `href="${confirmMeetingLink}"`
      );

      finalFullHtml = finalFullHtml.replace(
        /href=["'](#agendar|#agenda|#calendario|#cita|#booking|#confirmar-cita|#confirm-demo|#calendar-demo)["']/gi,
        `href="${confirmMeetingLink}"`
      );

      // Reemplazo de enlaces cuyo texto sea agendar / cita / confirmar
      finalFullHtml = finalFullHtml.replace(
        /<a\s+([^>]*?)href=["'][^"']*["']([^>]*?>\s*(?:<[^>]+>\s*)*(?:Agenda|Agendar|Confirmar|Reservar)[^<]*?<\/a>)/gi,
        (match, p1, p2) => {
          if (match.includes(confirmMeetingLink)) return match;
          return `<a ${p1}href="${confirmMeetingLink}"${p2}`;
        }
      );

      // Auto-detección y reemplazo inteligente de enlaces existentes de WhatsApp
      finalFullHtml = finalFullHtml.replace(
        /href=["']https?:\/\/(?:wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\/[^"']*["']/gi,
        `href="${whatsappTrackingLink}"`
      );

      finalFullHtml = finalFullHtml.replace(
        /href=["'](#whatsapp|#chat|#whatsapp-demo)["']/gi,
        `href="${whatsappTrackingLink}"`
      );

      finalFullHtml = finalFullHtml.replace(
        /<a\s+([^>]*?)href=["'][^"']*["']([^>]*?>\s*(?:<[^>]+>\s*)*(?:Chat|WhatsApp|Especialistas)[^<]*?<\/a>)/gi,
        (match, p1, p2) => {
          if (match.includes(whatsappTrackingLink)) return match;
          return `<a ${p1}href="${whatsappTrackingLink}"${p2}`;
        }
      );



      // Si el diseño contiene marcadores explícitos de botones
      if (finalFullHtml.includes('[CONFIRMAR_CITA]')) {
        finalFullHtml = finalFullHtml.replace('[CONFIRMAR_CITA]', actionButtonsHtml);
      } else if (finalFullHtml.includes('[AGENDAR_LLAMADA]')) {
        finalFullHtml = finalFullHtml.replace('[AGENDAR_LLAMADA]', actionButtonsHtml);
      } else if (finalFullHtml.includes('[BOTONES_ACCION]')) {
        finalFullHtml = finalFullHtml.replace('[BOTONES_ACCION]', actionButtonsHtml);
      } else if (!finalFullHtml.includes(whatsappTrackingLink) && !finalFullHtml.includes(confirmMeetingLink)) {
        // Auto-Inyección Inteligente: Si el HTML no tiene ningún botón de conversión, inyectarlo al pie antes de </body>
        if (finalFullHtml.includes('</body>')) {
          finalFullHtml = finalFullHtml.replace('</body>', `${actionButtonsHtml}</body>`);
        } else {
          finalFullHtml = finalFullHtml + actionButtonsHtml;
        }
      }

      return {
        subject: processedSubject,
        html: finalFullHtml,
      };
    }

    // 2. MODO: STANDARD WRAPPER INSTITUCIONAL (Plantilla Afinitive Clásica)
    // Formatear saltos de línea si viene texto plano
    if (!processedContent.includes('<p>') && !processedContent.includes('<div>') && !processedContent.includes('<br')) {
      processedContent = processedContent.replace(/\n/g, '<br />');
    }

    // Marcadores de acción
    if (processedContent.includes('[CONFIRMAR_CITA]')) {
      processedContent = processedContent.replace('[CONFIRMAR_CITA]', actionButtonsHtml);
    } else if (processedContent.includes('[AGENDAR_LLAMADA]')) {
      processedContent = processedContent.replace('[AGENDAR_LLAMADA]', actionButtonsHtml);
    } else {
      processedContent = processedContent + actionButtonsHtml;
    }

    const activeSignatureHtml = SIGNATURES.ricardo;
    const logoUrl = 'https://links.afinitive.com.pe/img/afinitive_logo.png';

    const finalWrappedHtml = `
      <div style="background-color: #F0F4F8; padding: 40px 20px; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #E2E8F0;">
          
          <!-- Cabecera Premium en Fondo Blanco -->
          <div style="padding: 30px 40px 25px 40px; border-bottom: 1px solid #F1F5F9; background-color: #FFFFFF;">
            <table cellpadding="0" cellspacing="0" border="0" style="background-color: #FFFFFF;">
              <tr>
                <td valign="middle" style="padding-right: 15px; line-height: 0;">
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

          <!-- Cuerpo del Correo Justificado -->
          <div style="padding: 30px 40px 20px 40px; font-size: 15px; line-height: 1.6; color: #334155; min-height: 100px; text-align: justify;">
            ${processedContent}
          </div>
          
          <!-- Firma del Operador -->
          <div style="background-color: #ffffff; padding: 20px 40px 30px 40px; border-top: 1px solid #F1F5F9;">
            ${activeSignatureHtml}
          </div>
          
          <!-- Pie de Monitoreo -->
          <div style="background-color: #F8FAFC; padding: 15px; text-align: center; font-size: 10px; color: #64748B; border-top: 1px solid #E2E8F0;">
            Este correo de invitación contiene elementos de monitoreo de recepción. Afinitive Inc.
          </div>
        </div>
      </div>
    `;

    return {
      subject: processedSubject,
      html: finalWrappedHtml,
    };
  }

  private formatDate(dateStr?: string): string {
    if (!dateStr) return 'miércoles, 3 de septiembre a las 10:00';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('es-ES', {
        timeZone: 'America/Lima',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr || 'miércoles, 3 de septiembre a las 10:00';
    }
  }

  private getGreeting(name: string): string {
    const clean = (name || '').trim().toLowerCase();
    if (clean.endsWith('a') || clean.includes('mari') || clean.includes('ana') || clean.includes('patricia') || clean.includes('claudia') || clean.includes('carolina')) {
      return 'Estimada';
    }
    return 'Estimado';
  }
}
