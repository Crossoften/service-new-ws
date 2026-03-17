import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { TransportationsController } from './transportations.controller';
import { TransportationsService } from './transportations.service';

@Module({
  controllers: [TransportationsController],
  providers: [TransportationsService, PrismaService],
})
export class TransportationsModule {}
