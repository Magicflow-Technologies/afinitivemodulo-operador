import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailTrackingController } from './email-tracking.controller';
import { EmailTrackingService } from './email-tracking.service';

import { TemplatesModule } from '../templates/templates.module';

@Module({
  imports: [ConfigModule, TemplatesModule],
  controllers: [EmailTrackingController],
  providers: [EmailTrackingService],
})
export class EmailTrackingModule {}
