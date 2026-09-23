import { Module } from '@nestjs/common';
import { WarrantyStatsModule } from '../works/warranty-stats.module';
import { PrismaService } from '@database/PrismaService';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [WarrantyStatsModule],
  controllers: [ProfileController],
  providers: [ProfileService, PrismaService],
})
export class ProfileModule {}
