import { PrismaService } from '@database/PrismaService';
import { Module } from '@nestjs/common';

import { AdminCouponsController } from './admin-coupons.controller';
import { AdminCouponsService } from './admin-coupons.service';
import { CouponsController } from './coupons.controller';
import { CouponsService } from './coupons.service';

@Module({
  controllers: [CouponsController, AdminCouponsController],
  providers: [CouponsService, AdminCouponsService, PrismaService],
  exports: [CouponsService],
})
export class CouponsModule {}
