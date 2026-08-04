import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { MercadoPagoModule } from '../mercado-pago/mercado-pago.module';
import { CommercialTransactionsController } from './commercial-transactions.controller';
import { CommercialTransactionsService } from './commercial-transactions.service';

@Module({
  imports: [MercadoPagoModule],
  controllers: [CommercialTransactionsController],
  providers: [CommercialTransactionsService, PrismaService],
})
export class CommercialTransactionsModule {}
