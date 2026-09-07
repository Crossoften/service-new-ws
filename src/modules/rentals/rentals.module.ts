import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';

@Module({
  imports: [SubscriptionGuardModule],
  controllers: [RentalsController],
  providers: [RentalsService, PrismaService],
})
export class RentalsModule {}
