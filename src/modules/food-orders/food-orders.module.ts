import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { FoodOrdersController } from './food-orders.controller';
import { FoodOrdersService } from './food-orders.service';

@Module({
  controllers: [FoodOrdersController],
  providers: [FoodOrdersService, PrismaService],
  exports: [FoodOrdersService],
})
export class FoodOrdersModule {}
