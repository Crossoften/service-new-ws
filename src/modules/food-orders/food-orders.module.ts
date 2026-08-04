import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { FoodOrdersController } from './food-orders.controller';
import { FoodOrdersService } from './food-orders.service';

@Module({
  imports: [WhatsappModule],
  controllers: [FoodOrdersController],
  providers: [FoodOrdersService, PrismaService],
  exports: [FoodOrdersService],
})
export class FoodOrdersModule {}
