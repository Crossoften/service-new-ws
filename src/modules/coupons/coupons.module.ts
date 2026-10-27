import { PrismaService } from '@database/PrismaService';
import { Module } from '@nestjs/common';

import { AdminCouponsController } from './admin-coupons.controller';
import { AdminCouponsService } from './admin-coupons.service';
import { CouponsController } from './coupons.controller';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { CouponsService } from './coupons.service';

@Module({
  imports: [PlatformSettingsModule],
  controllers: [CouponsController, AdminCouponsController],
  providers: [CouponsService, AdminCouponsService, PrismaService],
  exports: [CouponsService],
})
export class CouponsModule {}
