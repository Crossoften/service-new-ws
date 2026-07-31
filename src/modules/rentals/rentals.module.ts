import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';

@Module({
  controllers: [RentalsController],
  providers: [RentalsService, PrismaService],
})
export class RentalsModule {}
