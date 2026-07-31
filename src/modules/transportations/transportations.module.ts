import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { TransportationsController } from './transportations.controller';
import { TransportationsService } from './transportations.service';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';

@Module({
  imports: [SubscriptionGuardModule],
  controllers: [TransportationsController],
  providers: [TransportationsService, PrismaService],
})
export class TransportationsModule {}
