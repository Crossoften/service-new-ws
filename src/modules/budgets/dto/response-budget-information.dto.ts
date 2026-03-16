import { ApiProperty } from '@nestjs/swagger';
import { ResponseBudgetFileDto } from './response-budget-file.dto';

export class ResponseBudgetInformationDto {
  @ApiProperty({ description: 'Identificador do pedido de informação.', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Mensagem enviada ao cliente pedindo mais informações.',
    example: 'Preciso de mais detalhes sobre o local.',
  })
  message: string;

  @ApiProperty({ type: [ResponseBudgetFileDto] })
  files: ResponseBudgetFileDto[];

  @ApiProperty({ description: 'Data de criação do pedido.', example: '2026-03-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do pedido.',
    example: '2026-03-15T10:00:00.000Z',
  })
  updatedAt: Date;
}
