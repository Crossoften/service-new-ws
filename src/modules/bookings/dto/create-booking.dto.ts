import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, Min } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ description: 'Id da hospedagem.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id da hospedagem deve ser um número inteiro.' })
  @Min(1)
  accommodationId: number;

  @ApiProperty({ description: 'Data de check-in.', example: '2026-08-10T00:00:00.000Z' })
  @IsDateString({}, { message: 'A data de check-in deve ser uma data válida.' })
  checkIn: string;

  @ApiProperty({ description: 'Data de check-out.', example: '2026-08-15T00:00:00.000Z' })
  @IsDateString({}, { message: 'A data de check-out deve ser uma data válida.' })
  checkOut: string;

  @ApiProperty({ description: 'Número de hóspedes.', example: 2 })
  @Type(() => Number)
  @IsInt({ message: 'O número de hóspedes deve ser um número inteiro.' })
  @Min(1)
  guests: number;

  @ApiProperty({ description: 'Valor total proposto para a reserva.', example: 1200.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor total deve ser um número válido.' })
  @Min(0)
  totalValue: number;
}
