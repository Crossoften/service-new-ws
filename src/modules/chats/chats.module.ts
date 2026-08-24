import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ChatsController } from './chats.controller';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';

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
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway, PrismaService],
  exports: [ChatsService],
})
export class ChatsModule {}
