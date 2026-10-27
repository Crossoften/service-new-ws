import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { NotificationsModule } from '../notifications/notifications.module';
import { MercadoPagoModule } from '../mercado-pago/mercado-pago.module';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';
import { CouponsModule } from '../coupons/coupons.module';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { FoodOrdersController } from './food-orders.controller';
import { FoodOrdersService } from './food-orders.service';

@Module({
  imports: [
    NotificationsModule,
    MercadoPagoModule,
    SubscriptionGuardModule,
    CouponsModule,
    PlatformSettingsModule,
  ],
  controllers: [FoodOrdersController],
  providers: [FoodOrdersService, PrismaService],
  exports: [FoodOrdersService],
})
export class FoodOrdersModule {}
