import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class RequestBudgetExtraDto {
  @ApiProperty({
    description: 'Justificativa do acréscimo no orçamento.',
    example: 'Será necessário material adicional para concluir o atendimento.',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Valor adicional solicitado.',
    example: '50.00',
    type: String,
  })
  @IsNumberString()
  value: string;
}
