import { ApiProperty } from '@nestjs/swagger';
import { BankAccountTypeEnum } from '../enums/bank-account-type.enum';

export class ResponseBankAccountDto {
  @ApiProperty({ description: 'Identificador do cadastro bancário.', example: 1, type: Number })
  id: number;

  @ApiProperty({
    description: 'Nome do banco informado pelo usuário.',
    example: 'Caixa Econômica Federal',
    type: String,
  })
  bankName: string;

  @ApiProperty({
    description: 'Tipo da conta bancária.',
    enum: BankAccountTypeEnum,
    enumName: 'BankAccountTypeEnum',
    example: BankAccountTypeEnum.Checking,
  })
  accountType: BankAccountTypeEnum;

  @ApiProperty({
    description: 'Número da agência bancária.',
    example: '00000',
    type: String,
  })
  agency: string;

  @ApiProperty({
    description: 'Número da conta bancária.',
    example: '00000',
    type: String,
  })
  account: string;

  @ApiProperty({
    description: 'CPF vinculado à conta bancária.',
    example: '12345678901',
    type: String,
  })
  cpf: string;

  @ApiProperty({ description: 'Id do usuário dono da conta.', example: 15, type: Number })
  userId: number;

  @ApiProperty({
    description: 'Data de criação do cadastro bancário em formato ISO 8601.',
    example: '2026-03-17T10:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do cadastro bancário em formato ISO 8601.',
    example: '2026-03-17T10:00:00.000Z',
    type: String,
  })
  updatedAt: Date;
}
