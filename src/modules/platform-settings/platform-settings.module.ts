import { PrismaService } from '@database/PrismaService';
import { Module } from '@nestjs/common';

import { PlatformSettingsService } from './platform-settings.service';

@Module({
  providers: [PlatformSettingsService, PrismaService],
  exports: [PlatformSettingsService],
})
export class PlatformSettingsModule {}
