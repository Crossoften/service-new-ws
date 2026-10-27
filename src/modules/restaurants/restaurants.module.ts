import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';

@Module({
  imports: [SubscriptionGuardModule, PlatformSettingsModule],
  controllers: [RestaurantsController],
  providers: [RestaurantsService, PrismaService],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
