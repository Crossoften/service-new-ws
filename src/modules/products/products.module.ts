import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';

@Module({
  imports: [SubscriptionGuardModule],
  controllers: [ProductsController],
  providers: [ProductsService, PrismaService],
})
export class ProductsModule {}
