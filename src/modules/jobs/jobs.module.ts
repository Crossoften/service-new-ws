import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';

@Module({
  imports: [SubscriptionGuardModule],
  controllers: [JobsController],
  providers: [JobsService, PrismaService],
})
export class JobsModule {}
