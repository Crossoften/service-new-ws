import { Module } from '@nestjs/common';
import { NoAuthService } from './no-auth.service';
import { NoAuthController } from './no-auth.controller';
import { PrismaService } from '@database/PrismaService';
import { MailService } from '../mail/mail.service';

@Module({
  controllers: [NoAuthController],
  providers: [NoAuthService, PrismaService, MailService],
})
export class NoAuthModule {}
