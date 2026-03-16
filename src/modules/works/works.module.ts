import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { WorksController } from './works.controller';
import { WorksService } from './works.service';

@Module({
  controllers: [WorksController],
  providers: [WorksService, PrismaService],
})
export class WorksModule {}
