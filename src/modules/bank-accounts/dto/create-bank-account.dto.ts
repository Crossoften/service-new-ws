import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { BankAccountTypeEnum } from '../enums/bank-account-type.enum';

export class CreateBankAccountDto {
  @ApiProperty({
    description: 'Nome do banco informado pelo usuário.',
    example: 'Caixa Econômica Federal',
    type: String,
  })
  @IsString({ message: 'O nome do banco deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do banco é obrigatório.' })
  @MaxLength(120, { message: 'O nome do banco deve ter no máximo 120 caracteres.' })
  bankName: string;

  @ApiProperty({
    description: 'Tipo da conta bancária.',
    enum: BankAccountTypeEnum,
    enumName: 'BankAccountTypeEnum',
    example: BankAccountTypeEnum.Checking,
  })
  @IsEnum(BankAccountTypeEnum, { message: 'O tipo de conta bancária informado é inválido.' })
  accountType: BankAccountTypeEnum;

  @ApiProperty({
    description: 'Número da agência bancária.',
    example: '00000',
    type: String,
  })
  @IsString({ message: 'A agência deve ser um texto.' })
  @IsNotEmpty({ message: 'A agência é obrigatória.' })
  @MaxLength(30, { message: 'A agência deve ter no máximo 30 caracteres.' })
  agency: string;

  @ApiProperty({
    description: 'Número da conta bancária.',
    example: '00000',
    type: String,
  })
  @IsString({ message: 'A conta deve ser um texto.' })
  @IsNotEmpty({ message: 'A conta é obrigatória.' })
  @MaxLength(30, { message: 'A conta deve ter no máximo 30 caracteres.' })
  account: string;

  @ApiProperty({
    description: 'CPF vinculado à conta bancária.',
    example: '12345678901',
    type: String,
  })
  @IsString({ message: 'O CPF deve ser um texto.' })
  @IsNotEmpty({ message: 'O CPF é obrigatório.' })
  @MaxLength(14, { message: 'O CPF deve ter no máximo 14 caracteres.' })
  cpf: string;
}
