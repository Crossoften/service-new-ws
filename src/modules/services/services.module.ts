import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';

@Module({
  imports: [SubscriptionGuardModule],
  controllers: [ServicesController],
  providers: [ServicesService, PrismaService],
})
export class ServicesModule {}
