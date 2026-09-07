import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';

@Module({
  imports: [SubscriptionGuardModule],
  controllers: [BudgetsController],
  providers: [BudgetsService, PrismaService],
})
export class BudgetsModule {}
