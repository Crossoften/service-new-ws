import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { TransportRequestsController } from './transport-requests.controller';
import { TransportRequestsService } from './transport-requests.service';

@Module({
  controllers: [TransportRequestsController],
  providers: [TransportRequestsService, PrismaService],
})
export class TransportRequestsModule {}
