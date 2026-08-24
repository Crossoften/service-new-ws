import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LocalStrategy } from './strategies/local.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { LoginModule } from '../login/login.module';
import { JwtStrategy } from './strategies/jwt.strategies';
import { PrismaService } from '@database/PrismaService';

@Module({
  imports: [
    LoginModule,
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
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, PrismaService],
})
export class AuthModule {}
