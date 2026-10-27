import { Module } from '@nestjs/common';
import { PlatformSettingsModule } from '../platform-settings/platform-settings.module';
import { WarrantyStatsModule } from '../works/warranty-stats.module';
import { PrismaService } from '@database/PrismaService';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

@Module({
  imports: [WarrantyStatsModule, PlatformSettingsModule],
  controllers: [ProfileController],
  providers: [ProfileService, PrismaService],
})
export class ProfileModule {}
