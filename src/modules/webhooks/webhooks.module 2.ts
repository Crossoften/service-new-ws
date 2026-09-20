import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { MercadoPagoModule } from '../mercado-pago/mercado-pago.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [MercadoPagoModule, WhatsappModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, PrismaService],
})
export class WebhooksModule {}
