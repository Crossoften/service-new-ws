import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '@database/PrismaService';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { DeliveriesController } from './deliveries.controller';
import { DeliveriesGateway } from './deliveries.gateway';
import { DeliveriesService } from './deliveries.service';

@Module({
  imports: [
    // registerAsync + ConfigService: com register() síncrono, `process.env.JWT_SECRET`
    // é lido quando este arquivo é importado — antes de ConfigModule.forRoot() ler o
    // .env — e o JwtModule recebia `undefined`. Assinar token estourava 500 em todo
    // ambiente que não exporta a variável no processo.
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '360d' },
      }),
    }),
    WhatsappModule,
  ],
  controllers: [DeliveriesController],
  providers: [DeliveriesService, DeliveriesGateway, PrismaService],
  exports: [DeliveriesService],
})
export class DeliveriesModule {}
