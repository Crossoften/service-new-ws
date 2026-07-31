import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, Min } from 'class-validator';

export class QuoteTransportRequestDto {
  @ApiProperty({ description: 'Valor cotado para o transporte.', example: 350.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor cotado deve ser um número válido.' })
  @Min(0)
  quotedValue: number;
}
