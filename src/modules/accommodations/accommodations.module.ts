import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { AccommodationsController } from './accommodations.controller';
import { AccommodationsService } from './accommodations.service';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';

@Module({
  imports: [SubscriptionGuardModule],
  controllers: [AccommodationsController],
  providers: [AccommodationsService, PrismaService],
})
export class AccommodationsModule {}
