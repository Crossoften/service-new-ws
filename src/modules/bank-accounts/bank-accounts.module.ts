import { Module } from '@nestjs/common';
import { PrismaService } from '@database/PrismaService';
import { BankAccountsController } from './bank-accounts.controller';
import { BankAccountsService } from './bank-accounts.service';

@Module({
  controllers: [BankAccountsController],
  providers: [BankAccountsService, PrismaService],
})
export class BankAccountsModule {}
