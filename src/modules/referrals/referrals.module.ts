import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';

@Module({
  controllers: [ReferralsController],
  providers: [ReferralsService, PrismaService],
})
export class ReferralsModule {}
