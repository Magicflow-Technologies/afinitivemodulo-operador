import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { EmailTrackingService } from './email-tracking.service';

@Controller('api/test-email')
export class EmailTrackingController {
  constructor(private readonly emailTrackingService: EmailTrackingService) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendEmail(
    @Body() body: { recipientEmail: string; senderEmail?: string; subject?: string; body?: string; signatureId?: string }
  ) {
    return await this.emailTrackingService.sendEmail(
      body.recipientEmail,
      body.senderEmail,
      body.subject,
      body.body,
      body.signatureId
    );
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() payload: any) {
    return await this.emailTrackingService.handleWebhook(payload);
  }
}
