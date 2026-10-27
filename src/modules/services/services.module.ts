import { Module } from '@nestjs/common';
import { WarrantyStatsModule } from '../works/warranty-stats.module';
import { PrismaService } from '@database/PrismaService';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { SubscriptionGuardModule } from '../subscription-guard/subscription-guard.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [SubscriptionGuardModule, WarrantyStatsModule, UploadModule],
  controllers: [ServicesController],
  providers: [ServicesService, PrismaService],
})
export class ServicesModule {}
