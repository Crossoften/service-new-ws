import { Module } from '@nestjs/common';
import { LoginService } from './login.service';
import { PrismaService } from '@database/PrismaService';

@Module({
  providers: [LoginService, PrismaService],
  exports: [LoginService],
})
export class LoginModule {}
