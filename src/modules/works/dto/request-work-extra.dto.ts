import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString, Min } from 'class-validator';

export class RequestWorkExtraDto {
  @ApiProperty({
    description: 'Justificativa do acréscimo no serviço.',
    example: 'Foi identificado um reparo adicional não previsto inicialmente.',
  })
  @IsString({ message: 'A descrição do acréscimo deve ser um texto.' })
  @IsNotEmpty({ message: 'A descrição do acréscimo é obrigatória.' })
  description: string;

  @ApiProperty({ description: 'Valor adicional solicitado.', example: 80.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor adicional deve ser um número válido.' })
  @Min(0)
  value: number;
}
