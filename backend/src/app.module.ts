import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailTrackingModule } from './email-tracking/email-tracking.module';
import { TemplatesModule } from './templates/templates.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TemplatesModule,
    EmailTrackingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

