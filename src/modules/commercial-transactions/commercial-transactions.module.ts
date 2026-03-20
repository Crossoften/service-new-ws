import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { CommercialTransactionsController } from './commercial-transactions.controller';
import { CommercialTransactionsService } from './commercial-transactions.service';

@Module({
  controllers: [CommercialTransactionsController],
  providers: [CommercialTransactionsService, PrismaService],
})
export class CommercialTransactionsModule {}
