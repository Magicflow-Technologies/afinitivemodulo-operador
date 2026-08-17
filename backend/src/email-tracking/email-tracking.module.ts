import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailTrackingController } from './email-tracking.controller';
import { EmailTrackingService } from './email-tracking.service';

@Module({
  imports: [ConfigModule],
  controllers: [EmailTrackingController],
  providers: [EmailTrackingService],
})
export class EmailTrackingModule {}
