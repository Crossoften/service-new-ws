import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { MercadoPagoModule } from '../mercado-pago/mercado-pago.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { PlansController } from './plans/plans.controller';
import { PlansService } from './plans/plans.service';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { SubscriptionsService } from './subscriptions/subscriptions.service';

@Module({
  imports: [MercadoPagoModule, WhatsappModule],
  controllers: [PlansController, SubscriptionsController],
  providers: [PlansService, SubscriptionsService, PrismaService],
})
export class PlansModule {}
