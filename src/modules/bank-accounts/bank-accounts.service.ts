import { PrismaService } from '@database/PrismaService';
import { Injectable } from '@nestjs/common';
import { PixKeyTypeEnum, User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import { CreateBankAccountResponseDto } from './dto/create-bank-account-response.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { ResponseBankAccountDto } from './dto/response-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { BankAccountAlreadyExistsException } from './exceptions/bank-account-already-exists.exception';
import { BankAccountInvalidPixKeyException } from './exceptions/bank-account-invalid-pix-key.exception';
import { BankAccountNotFoundException } from './exceptions/bank-account-not-found.exception';
import { BankAccountPersistenceException } from './exceptions/bank-account-persistence.exception';
import { BankAccountTypeEnum } from './enums/bank-account-type.enum';
import { normalizePixKey } from './pix-key';

@Injectable()
export class BankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve o par tipo + chave Pix a partir do que veio na requisição.
   *
   * Os dois andam juntos: chave sem tipo não dá para normalizar, e tipo sem
   * chave não paga ninguém. `undefined` no retorno significa "não mexer",
   * que é o que o Prisma entende num update parcial; `null` é apagar.
   *
   * No update, `ausentes` recebe o que já está gravado, para que mandar só a
   * chave — mantendo o tipo de antes — continue funcionando.
   */
  private resolvePixKey(
    payload: CreateBankAccountDto | UpdateBankAccountDto,
    atual?: { pixKey: string | null; pixKeyType: PixKeyTypeEnum | null },
  ): { pixKey?: string | null; pixKeyType?: PixKeyTypeEnum | null } {
    const tipoInformado = payload.pixKeyType !== undefined;
    const chaveInformada = payload.pixKey !== undefined;

    if (!tipoInformado && !chaveInformada) return {};

    const tipo = payload.pixKeyType ?? atual?.pixKeyType ?? null;
    const chave = payload.pixKey ?? atual?.pixKey ?? null;

    // Limpar a chave é explícito: mandar os dois vazios apaga o cadastro Pix.
    if (!tipo && !chave) return { pixKey: null, pixKeyType: null };

    if (!chave) throw BankAccountInvalidPixKeyException.tipoSemChave();
    if (!tipo) throw BankAccountInvalidPixKeyException.chaveSemTipo();

    const normalizada = normalizePixKey(tipo, chave);

    if (!normalizada) throw BankAccountInvalidPixKeyException.formatoInvalido();

    return { pixKey: normalizada, pixKeyType: tipo };
  }

  async create(user: User, payload: CreateBankAccountDto): Promise<CreateBankAccountResponseDto> {
    const existingAccount = await this.prisma.bankAccount.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (existingAccount) {
      throw new BankAccountAlreadyExistsException();
    }

    try {
      const pix = this.resolvePixKey(payload);

      const bankAccount = await this.prisma.bankAccount.create({
        data: {
          bankName: payload.bankName.trim(),
          accountType: payload.accountType,
          agency: payload.agency.trim(),
          account: payload.account.trim(),
          cpf: payload.cpf.trim(),
          pixKey: pix.pixKey ?? null,
          pixKeyType: pix.pixKeyType ?? null,
          userId: user.id,
        },
      });

      return {
        message: 'Dados bancários cadastrados com sucesso.',
        bankAccount: {
          id: bankAccount.id,
          bankName: bankAccount.bankName,
          accountType: bankAccount.accountType as BankAccountTypeEnum,
          agency: bankAccount.agency,
          account: bankAccount.account,
          cpf: bankAccount.cpf,
          pixKey: bankAccount.pixKey ?? undefined,
          pixKeyType: bankAccount.pixKeyType ?? undefined,
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
      accountType: bankAccount.accountType as BankAccountTypeEnum,
      agency: bankAccount.agency,
      account: bankAccount.account,
      cpf: bankAccount.cpf,
      pixKey: bankAccount.pixKey ?? undefined,
      pixKeyType: bankAccount.pixKeyType ?? undefined,
      userId: bankAccount.userId,
      createdAt: bankAccount.createdAt,
      updatedAt: bankAccount.updatedAt,
    };
  }

  async updateMine(user: User, payload: UpdateBankAccountDto): Promise<ResponseBankAccountDto> {
    const existingAccount = await this.prisma.bankAccount.findUnique({
      where: { userId: user.id },
      select: { id: true, pixKey: true, pixKeyType: true },
    });

    if (!existingAccount) {
      throw new BankAccountNotFoundException();
    }

    // Fora do try: erro de chave Pix é 400 de validação e não pode ser
    // convertido no 500 genérico de persistência do catch abaixo.
    const pix = this.resolvePixKey(payload, existingAccount);

    try {
      const bankAccount = await this.prisma.bankAccount.update({
        where: { userId: user.id },
        data: {
          bankName: payload.bankName ? payload.bankName.trim() : undefined,
          accountType: payload.accountType,
          agency: payload.agency ? payload.agency.trim() : undefined,
          account: payload.account ? payload.account.trim() : undefined,
          cpf: payload.cpf ? payload.cpf.trim() : undefined,
          pixKey: pix.pixKey,
          pixKeyType: pix.pixKeyType,
        },
      });

      return {
        id: bankAccount.id,
        bankName: bankAccount.bankName,
        accountType: bankAccount.accountType as BankAccountTypeEnum,
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
