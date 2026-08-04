import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { MercadoPagoModule } from '../mercado-pago/mercado-pago.module';
import { WorksController } from './works.controller';
import { WorksService } from './works.service';

@Module({
  imports: [MercadoPagoModule],
  controllers: [WorksController],
  providers: [WorksService, PrismaService],
})
export class WorksModule {}
