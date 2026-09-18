import { Controller, Post, Get, Put, Body, Query, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { EmailTrackingService } from './email-tracking.service';

@Controller('api/test-email')
export class EmailTrackingController {
  constructor(private readonly emailTrackingService: EmailTrackingService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendEmail(
    @Body() body: { 
      recipientEmail: string; 
      senderEmail?: string; 
      subject?: string; 
      body?: string; 
      signatureId?: string;
      attachment?: { filename: string; content: string };
      proposedTime?: string;
      recipientName?: string;
      templateId?: string;
      templateType?: string;
      tag?: string;
      etiqueta?: string;
    }
  ) {
    return await this.emailTrackingService.sendEmail(
      body.recipientEmail,
      body.senderEmail,
      body.subject,
      body.body,
      body.signatureId,
      body.attachment,
      body.proposedTime,
      body.recipientName,
      body.templateId,
      body.templateType,
      body.tag || body.etiqueta
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    return await this.emailTrackingService.handleWebhook(payload);
  }

  @Get('test-calendar')
  async testCalendar(@Query('calendarId') calendarId?: string) {
    return await this.emailTrackingService.testGoogleCalendarConnection(calendarId);
  }

  // --- Endpoints de Configuración de Agenda y Envíos ---
  @Get('settings')
  async getSettings() {
    return await this.emailTrackingService.getCalendarSettings();
  }

  @Post('settings')
  async saveSettings(
    @Body() body: {
      slot_duration: number;
      morning_start: string;
      morning_end: string;
      afternoon_start: string;
      afternoon_end: string;
      send_interval: number;
      send_interval_unit: string;
      whatsapp_number?: string;
    }
  ) {
    return await this.emailTrackingService.saveCalendarSettings(body);
  }

  // --- Endpoints de Gestión de la Cola ---
  @Post('queue/load')
  async loadQueue(
    @Body() body: { 
      contacts: { name: string; email: string; phone?: string; tag?: string }[]; 
      tag?: string; 
      etiqueta?: string;
      mode?: 'lead_generation' | 'calendar_booking' | string;
    }
  ) {
    return await this.emailTrackingService.loadContactsIntoQueue(
      body.contacts, 
      body.tag || body.etiqueta,
      body.mode
    );
  }

  // --- Endpoints AI-Ready para Control Autónomo de Campañas por Agentes de IA ---
  @Get('campaign/schema')
  async getCampaignSchema() {
    return await this.emailTrackingService.getCampaignSchema();
  }

  @Post('campaign/dispatch')
  @HttpCode(HttpStatus.OK)
  async dispatchCampaign(
    @Body() body: {
      contacts: { name: string; email: string; phone?: string; tag?: string }[];
      templateId?: string;
      tag?: string;
      mode?: 'lead_generation' | 'calendar_booking';
      customSubject?: string;
      customBody?: string;
      sendInterval?: number;
      sendIntervalUnit?: string;
    }
  ) {
    return await this.emailTrackingService.dispatchCampaignFromAgent(body);
  }

  @Get('queue/pending')
  async getPending() {
    return await this.emailTrackingService.getPendingQueue();
  }

  @Put('queue/:id')
  async updateItem(
    @Param('id') id: string,
    @Body() body: { proposedTime?: string; status?: string; tag?: string }
  ) {
    return await this.emailTrackingService.updateQueueItem(id, body.proposedTime, body.status, body.tag);
  }

  @Post('queue/process')
  async processQueue(
    @Body() body: { 
      signatureId?: string; 
      attachment?: { filename: string; content: string };
      sendInterval?: number;
      sendIntervalUnit?: string;
      templateId?: string;
      customSubject?: string;
      customBody?: string;
      customTemplateType?: string;
      tag?: string;
    }
  ) {
    return await this.emailTrackingService.processEmailQueue(
      body.signatureId, 
      body.attachment,
      body.sendInterval,
      body.sendIntervalUnit,
      body.templateId,
      body.customSubject,
      body.customBody,
      body.customTemplateType,
      body.tag
    );
  }

  @Get('queue/status')
  async getStatus() {
    return this.emailTrackingService.getQueueStatus();
  }

  @Post('queue/stop')
  async stop() {
    return await this.emailTrackingService.stopEmailQueue();
  }

  @Post('queue/clear')
  async clear() {
    return await this.emailTrackingService.clearQueue();
  }

  // --- Endpoint Público para Confirmación de Reuniones (Redirección HTML) ---
  @Get('confirm-meeting')
  async confirmMeeting(
    @Query('calendarId') calendarId: string,
    @Query('time') time: string,
    @Query('email') email: string,
    @Query('name') name: string
  ) {
    return await this.emailTrackingService.confirmMeeting(calendarId, time, email, name);
  }

  // --- Endpoint Público para Rastreo de Clic en WhatsApp (Redirección HTML) ---
  @Get('whatsapp-click')
  async handleWhatsAppClick(
    @Query('email') email: string,
    @Query('name') name: string,
    @Query('signatureId') signatureId: string
  ) {
    return await this.emailTrackingService.trackWhatsAppClick(email, name, signatureId);
  }

  @Get('free-slots')
  async getFreeSlots(@Query('signatureId') signatureId?: string) {
    return await this.emailTrackingService.getAvailableSlots(signatureId);
  }

  // --- Endpoint Público para Agendamiento Directo (JSON API) ---
  @Post('book-appointment')
  @HttpCode(HttpStatus.OK)
  async bookAppointment(
    @Body() body: {
      name: string;
      email: string;
      phone: string;
      time: string;
      investmentRange?: string;
      consentPromo?: boolean;
      consentPrivacy?: boolean;
      consentDemand?: boolean;
      notes?: string;
      calendarId?: string;
    }
  ) {
    return await this.emailTrackingService.bookAppointmentPublic(body);
  }
}
