import { PrismaService } from '@database/PrismaService';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MarketplaceFeeService } from './marketplace-fee.service';
import { MercadoPagoAccountsService } from './mercado-pago-accounts.service';
import { MercadoPagoController } from './mercado-pago.controller';
import { MercadoPagoService } from './mercado-pago.service';

@Module({
  imports: [ConfigModule],
  controllers: [MercadoPagoController],
  providers: [MercadoPagoService, MercadoPagoAccountsService, MarketplaceFeeService, PrismaService],
  exports: [MercadoPagoService, MercadoPagoAccountsService, MarketplaceFeeService],
})
export class MercadoPagoModule {}
