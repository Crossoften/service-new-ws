import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';

@Module({
  imports: [SubscriptionGuardModule],
  controllers: [BookingsController],
  providers: [BookingsService, PrismaService],
})
export class BookingsModule {}
