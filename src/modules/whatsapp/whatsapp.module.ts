import { PrismaService } from '@database/PrismaService';
import { Module } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';

@Module({
  providers: [WhatsappService, PrismaService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
