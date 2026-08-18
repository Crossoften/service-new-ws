import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { MercadoPagoModule } from '../mercado-pago/mercado-pago.module';
import { FoodOrdersController } from './food-orders.controller';
import { FoodOrdersService } from './food-orders.service';

@Module({
  imports: [WhatsappModule, MercadoPagoModule],
  controllers: [FoodOrdersController],
  providers: [FoodOrdersService, PrismaService],
  exports: [FoodOrdersService],
})
export class FoodOrdersModule {}
