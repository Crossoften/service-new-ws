import { Module } from '@nestjs/common';

import { PrismaService } from '@database/PrismaService';

@Module({
  controllers: [],
  providers: [PrismaService],
})
export class MobileModule {}
