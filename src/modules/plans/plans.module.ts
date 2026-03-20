import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { PlansController } from './plans/plans.controller';
import { PlansService } from './plans/plans.service';
import { SubscriptionsController } from './subscriptions/subscriptions.controller';
import { SubscriptionsService } from './subscriptions/subscriptions.service';

@Module({
  controllers: [PlansController, SubscriptionsController],
  providers: [PlansService, SubscriptionsService, PrismaService],
})
export class PlansModule {}
