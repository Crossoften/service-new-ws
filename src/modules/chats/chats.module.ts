import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { JwtModule } from '@nestjs/jwt';
import { ChatsController } from './chats.controller';
import { ChatsGateway } from './chats.gateway';
import { ChatsService } from './chats.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '360d' },
    }),
  ],
  controllers: [ChatsController],
  providers: [ChatsService, ChatsGateway, PrismaService],
  exports: [ChatsService],
})
export class ChatsModule {}
