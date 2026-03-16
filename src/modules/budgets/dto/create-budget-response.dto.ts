import { ApiProperty } from '@nestjs/swagger';
import { ResponseBudgetDto } from './response-budget.dto';

export class CreateBudgetResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso da operação.',
    example: 'Orçamento cadastrado com sucesso.',
  })
  message: string;

  @ApiProperty({ type: ResponseBudgetDto })
  budget: ResponseBudgetDto;
}
