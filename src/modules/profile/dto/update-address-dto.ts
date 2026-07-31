import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAddressDto {
  @ApiPropertyOptional({
    description: 'Logradouro e número.',
    example: 'Rua das Palmeiras, 120',
  })
  @IsOptional()
  @IsString({ message: 'A rua deve ser um texto.' })
  @MaxLength(160, { message: 'A rua não pode ter mais que 160 caracteres.' })
  street?: string;

  @ApiPropertyOptional({ description: 'Número da residência.', example: '458' })
  @IsOptional()
  @IsString({ message: 'O número deve ser um texto.' })
  @MaxLength(20, { message: 'O número não pode ter mais que 20 caracteres.' })
  number?: string;

  @ApiPropertyOptional({ description: 'Bairro.', example: 'Centro' })
  @IsOptional()
  @IsString({ message: 'O bairro deve ser um texto.' })
  @MaxLength(120, { message: 'O bairro não pode ter mais que 120 caracteres.' })
  neighborhood?: string;

  @ApiPropertyOptional({ description: 'Cidade.', example: 'Uberlândia' })
  @IsOptional()
  @IsString({ message: 'A cidade deve ser um texto.' })
  @MaxLength(120, { message: 'A cidade não pode ter mais que 120 caracteres.' })
  city?: string;

  @ApiPropertyOptional({ description: 'Estado.', example: 'Minas Gerais' })
  @IsOptional()
  @IsString({ message: 'O estado deve ser um texto.' })
  @MaxLength(120, { message: 'O estado não pode ter mais que 120 caracteres.' })
  state?: string;

  @ApiPropertyOptional({ description: 'CEP.', example: '38400-000' })
  @IsOptional()
  @IsString({ message: 'O CEP deve ser um texto.' })
  @MaxLength(20, { message: 'O CEP não pode ter mais que 20 caracteres.' })
  zipCode?: string;
}
