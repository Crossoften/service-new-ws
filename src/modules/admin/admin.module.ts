import { Module } from '@nestjs/common';

import { PrismaService } from '@database/PrismaService';
import { AdminSettingsController } from './admin-settings/admin-settings.controller';
import { AdminSettingsService } from './admin-settings/admin-settings.service';

@Module({
  controllers: [AdminSettingsController],
  providers: [PrismaService, AdminSettingsService],
})
export class AdminModule {}
