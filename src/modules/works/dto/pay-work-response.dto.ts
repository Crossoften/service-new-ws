import { ApiProperty } from '@nestjs/swagger';
import { ResponseWorkDto } from './response-work.dto';

export class PayWorkResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso do pagamento lógico do trabalho.',
    example: 'Pagamento registrado com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Dados completos do trabalho após o registro do pagamento.',
    type: ResponseWorkDto,
  })
  work: ResponseWorkDto;
}
