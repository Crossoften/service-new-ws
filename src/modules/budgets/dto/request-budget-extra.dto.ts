import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class RequestBudgetExtraDto {
  @ApiProperty({
    description: 'Justificativa do acréscimo no orçamento.',
    example: 'Será necessário material adicional para concluir o atendimento.',
  })
  @IsString({ message: 'A descrição do acréscimo deve ser um texto.' })
  @IsNotEmpty({ message: 'A descrição do acréscimo é obrigatória.' })
  description: string;

  @ApiProperty({ description: 'Valor adicional solicitado.', example: 50.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor adicional deve ser um número válido.' })
  @Min(0)
  value: number;
}
