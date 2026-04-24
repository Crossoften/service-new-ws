import { Module } from '@nestjs/common';

import { PrismaService } from '@database/PrismaService';
import { AdminDashboardController } from './admin-dashboard/admin-dashboard.controller';
import { AdminDashboardService } from './admin-dashboard/admin-dashboard.service';
import { AdminInfluencersController } from './admin-influencers/admin-influencers.controller';
import { AdminInfluencersService } from './admin-influencers/admin-influencers.service';
import { AdminProvidersController } from './admin-providers/admin-providers.controller';
import { AdminProvidersService } from './admin-providers/admin-providers.service';
import { AdminServicesController } from './admin-services/admin-services.controller';
import { AdminServicesService } from './admin-services/admin-services.service';
import { AdminSettingsController } from './admin-settings/admin-settings.controller';
import { AdminSettingsService } from './admin-settings/admin-settings.service';
import { AdminUsersController } from './admin-users/admin-users.controller';
import { AdminUsersService } from './admin-users/admin-users.service';

@Module({
  controllers: [AdminSettingsController, AdminUsersController, AdminDashboardController, AdminServicesController, AdminProvidersController, AdminInfluencersController],
  providers: [PrismaService, AdminSettingsService, AdminUsersService, AdminDashboardService, AdminServicesService, AdminProvidersService, AdminInfluencersService],
})
export class AdminModule {}
