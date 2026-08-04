import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '@database/PrismaService';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesGateway } from './deliveries.gateway';
import { DeliveriesService } from './deliveries.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '360d' },
    }),
    WhatsappModule,
  ],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, DeliveriesGateway, PrismaService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
