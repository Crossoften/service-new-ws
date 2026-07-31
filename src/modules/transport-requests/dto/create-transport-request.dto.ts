import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransportRequestDto {
  @ApiProperty({ description: 'Id da transportadora/veículo.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id da transportadora deve ser um número inteiro.' })
  @Min(1)
  transportationId: number;

  @ApiProperty({ description: 'Local de origem da carga.', example: 'Uberlândia - MG' })
  @IsString({ message: 'A origem deve ser um texto.' })
  origin: string;

  @ApiProperty({ description: 'Local de destino da carga.', example: 'Belo Horizonte - MG' })
  @IsString({ message: 'O destino deve ser um texto.' })
  destination: string;

  @ApiPropertyOptional({
    description: 'Descrição da carga a ser transportada.',
    example: 'Móveis de sala, aproximadamente 200kg.',
  })
  @IsOptional()
  @IsString({ message: 'A descrição da carga deve ser um texto.' })
  cargoDescription?: string;
}
