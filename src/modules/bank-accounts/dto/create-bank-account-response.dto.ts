import { ApiProperty } from '@nestjs/swagger';
import { ResponseBankAccountDto } from './response-bank-account.dto';

export class CreateBankAccountResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso do cadastro bancário.',
    example: 'Dados bancários cadastrados com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Dados bancários cadastrados.',
    type: ResponseBankAccountDto,
  })
  bankAccount: ResponseBankAccountDto;
}
