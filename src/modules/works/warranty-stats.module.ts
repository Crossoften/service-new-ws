import { PrismaService } from '@database/PrismaService';
import { Module } from '@nestjs/common';

import { WarrantyStatsService } from './warranty-stats.service';

/**
 * Módulo próprio, e não parte do `WorksModule`, para que perfil e serviços
 * possam ler o contador sem arrastar o módulo de trabalhos inteiro junto — e
 * sem o risco de ciclo de importação que isso traria.
 */
@Module({
  providers: [WarrantyStatsService, PrismaService],
  exports: [WarrantyStatsService],
})
export class WarrantyStatsModule {}
