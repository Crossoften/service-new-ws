import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { SubscriptionGuardService } from './subscription-guard.service';

@Module({
  providers: [SubscriptionGuardService, PrismaService],
  exports: [SubscriptionGuardService],
})
export class SubscriptionGuardModule {}
