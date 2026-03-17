import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import { CreateBankAccountResponseDto } from './dto/create-bank-account-response.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { ResponseBankAccountDto } from './dto/response-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccountAlreadyExistsException } from './exceptions/bank-account-already-exists.exception';
import { BankAccountNotFoundException } from './exceptions/bank-account-not-found.exception';
import { BankAccountPersistenceException } from './exceptions/bank-account-persistence.exception';
import { BankAccountType } from './enums/bank-account-type.enum';

@Injectable()
export class BankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: User, payload: CreateBankAccountDto): Promise<CreateBankAccountResponseDto> {
    const existingAccount = await this.prisma.bankAccount.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (existingAccount) {
      throw new BankAccountAlreadyExistsException();
    }

    try {
      const bankAccount = await this.prisma.bankAccount.create({
        data: {
          bankName: payload.bankName.trim(),
          accountType: payload.accountType,
          agency: payload.agency.trim(),
          account: payload.account.trim(),
          cpf: payload.cpf.trim(),
          userId: user.id,
        },
      });

      return {
        message: 'Dados bancários cadastrados com sucesso.',
        bankAccount: {
          id: bankAccount.id,
          bankName: bankAccount.bankName,
          accountType: bankAccount.accountType as BankAccountType,
          agency: bankAccount.agency,
          account: bankAccount.account,
          cpf: bankAccount.cpf,
          userId: bankAccount.userId,
          createdAt: bankAccount.createdAt,
          updatedAt: bankAccount.updatedAt,
        },
      };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new BankAccountPersistenceException();
      }

      throw error;
    }
  }

  async findMine(user: User): Promise<ResponseBankAccountDto> {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { userId: user.id },
    });

    if (!bankAccount) {
      throw new BankAccountNotFoundException();
    }

    return {
      id: bankAccount.id,
      bankName: bankAccount.bankName,
      accountType: bankAccount.accountType as BankAccountType,
      agency: bankAccount.agency,
      account: bankAccount.account,
      cpf: bankAccount.cpf,
      userId: bankAccount.userId,
      createdAt: bankAccount.createdAt,
      updatedAt: bankAccount.updatedAt,
    };
  }

  async updateMine(user: User, payload: UpdateBankAccountDto): Promise<ResponseBankAccountDto> {
    const existingAccount = await this.prisma.bankAccount.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!existingAccount) {
      throw new BankAccountNotFoundException();
    }

    try {
      const bankAccount = await this.prisma.bankAccount.update({
        where: { userId: user.id },
        data: {
          bankName: payload.bankName ? payload.bankName.trim() : undefined,
          accountType: payload.accountType,
          agency: payload.agency ? payload.agency.trim() : undefined,
          account: payload.account ? payload.account.trim() : undefined,
          cpf: payload.cpf ? payload.cpf.trim() : undefined,
        },
      });

      return {
        id: bankAccount.id,
        bankName: bankAccount.bankName,
        accountType: bankAccount.accountType as BankAccountType,
        agency: bankAccount.agency,
        account: bankAccount.account,
        cpf: bankAccount.cpf,
        userId: bankAccount.userId,
        createdAt: bankAccount.createdAt,
        updatedAt: bankAccount.updatedAt,
      };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        throw new BankAccountPersistenceException();
      }

      throw error;
    }
  }

  async deleteMine(user: User): Promise<ImessageEntity> {
    const existingAccount = await this.prisma.bankAccount.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!existingAccount) {
      throw new BankAccountNotFoundException();
    }

    await this.prisma.bankAccount.delete({ where: { userId: user.id } });

    return { message: 'Dados bancários deletados com sucesso.' };
  }
}
