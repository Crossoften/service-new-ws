import { PrismaService } from '@database/PrismaService';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PushController } from './push.controller';
import { PushService } from './push.service';

@Module({
  imports: [ConfigModule],
  controllers: [PushController],
  providers: [PushService, PrismaService],
  exports: [PushService],
})
export class PushModule {}
