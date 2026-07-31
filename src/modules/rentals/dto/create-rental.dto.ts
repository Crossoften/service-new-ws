import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateRentalDto {
  @ApiProperty({ description: 'Id do produto a ser alugado.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id do produto deve ser um número inteiro.' })
  @Min(1)
  productId: number;

  @ApiProperty({ description: 'Data de início do aluguel.', example: '2026-08-01T00:00:00.000Z' })
  @IsDateString({}, { message: 'A data de início deve ser uma data válida.' })
  startDate: string;

  @ApiProperty({ description: 'Data de término do aluguel.', example: '2026-08-05T00:00:00.000Z' })
  @IsDateString({}, { message: 'A data de término deve ser uma data válida.' })
  endDate: string;

  @ApiProperty({ description: 'Valor total proposto para o período do aluguel.', example: 500.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ser um número válido.' })
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Condições combinadas para o aluguel.',
    example: 'Retirada e devolução no endereço do locador.',
  })
  @IsOptional()
  @IsString({ message: 'As condições devem ser um texto.' })
  conditions?: string;
}
