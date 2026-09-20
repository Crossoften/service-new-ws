import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { MercadoPagoModule } from '../mercado-pago/mercado-pago.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

@Module({
  imports: [MercadoPagoModule, NotificationsModule],
  controllers: [WebhooksController],
  providers: [WebhooksService, PrismaService],
})
export class WebhooksModule {}
