import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { BankAccountType } from '../enums/bank-account-type.enum';

export class CreateBankAccountDto {
  @ApiProperty({
    description: 'Nome do banco informado pelo usuário.',
    example: 'Caixa Econômica Federal',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  bankName: string;

  @ApiProperty({
    description: 'Tipo da conta bancária.',
    enum: BankAccountType,
    enumName: 'BankAccountType',
    example: BankAccountType.Checking,
  })
  @IsEnum(BankAccountType)
  accountType: BankAccountType;

  @ApiProperty({
    description: 'Número da agência bancária.',
    example: '00000',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  agency: string;

  @ApiProperty({
    description: 'Número da conta bancária.',
    example: '00000',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  account: string;

  @ApiProperty({
    description: 'CPF vinculado à conta bancária.',
    example: '12345678901',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(14)
  cpf: string;
}
