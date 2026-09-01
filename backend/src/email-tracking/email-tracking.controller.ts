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
      body.recipientName
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
    }
  ) {
    return await this.emailTrackingService.saveCalendarSettings(body);
  }

  // --- Endpoints de Gestión de la Cola ---
  @Post('queue/load')
  async loadQueue(@Body() body: { contacts: { name: string; email: string; phone?: string }[] }) {
    return await this.emailTrackingService.loadContactsIntoQueue(body.contacts);
  }

  @Get('queue/pending')
  async getPending() {
    return await this.emailTrackingService.getPendingQueue();
  }

  @Put('queue/:id')
  async updateItem(
    @Param('id') id: string,
    @Body() body: { proposedTime?: string; status?: string }
  ) {
    return await this.emailTrackingService.updateQueueItem(id, body.proposedTime, body.status);
  }

  @Post('queue/process')
  async processQueue(
    @Body() body: { 
      signatureId?: string; 
      attachment?: { filename: string; content: string } 
    }
  ) {
    return await this.emailTrackingService.processEmailQueue(body.signatureId, body.attachment);
  }

  @Get('queue/status')
  async getStatus() {
    return this.emailTrackingService.getQueueStatus();
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

  @Get('free-slots')
  async getFreeSlots(@Query('signatureId') signatureId?: string) {
    return await this.emailTrackingService.getAvailableSlots(signatureId);
  }
}
