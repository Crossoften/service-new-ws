import { ApiProperty } from '@nestjs/swagger';

export class ResponseBalanceServiceDto {
  @ApiProperty({
    description: 'Identificador do serviço relacionado ao item exibido no saldo.',
    example: 18,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Nome do serviço relacionado ao orçamento ou recebimento.',
    example: 'Pedreiro',
    type: String,
  })
  name: string;
}
