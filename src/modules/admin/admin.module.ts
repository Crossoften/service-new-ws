import { Module } from '@nestjs/common';

import { PrismaService } from '@database/PrismaService';
import { AdminUsersController } from './admin-users/admin-users.controller';
import { AdminUsersService } from './admin-users/admin-users.service';
import { AdminSettingsController } from './admin-settings/admin-settings.controller';
import { AdminSettingsService } from './admin-settings/admin-settings.service';

@Module({
  controllers: [AdminSettingsController, AdminUsersController],
  providers: [PrismaService, AdminSettingsService, AdminUsersService],
})
export class AdminModule {}
