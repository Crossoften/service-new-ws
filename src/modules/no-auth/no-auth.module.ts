import { Module } from '@nestjs/common';
import { NoAuthService } from './no-auth.service';
import { NoAuthController } from './no-auth.controller';
import { PrismaService } from '@database/PrismaService';
import { MailService } from '../mail/mail.service';
import { SmsService } from '../sms/sms.service';

@Module({
  controllers: [NoAuthController],
  providers: [NoAuthService, PrismaService, MailService, SmsService],
})
export class NoAuthModule {}
