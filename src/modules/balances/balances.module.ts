import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { BalancesController } from './balances.controller';
import { BalancesService } from './balances.service';

@Module({
  controllers: [BalancesController],
  providers: [BalancesService, PrismaService],
})
export class BalancesModule {}
