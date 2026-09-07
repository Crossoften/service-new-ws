import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Endereço do restaurante — próprio, não herdado do perfil do dono.
 *
 * A distinção importa: o fornecedor pode morar longe da cozinha, e é da cozinha
 * que a entrega sai. É este endereço que serve de origem no cálculo do frete por
 * distância e de ponto de coleta para o entregador.
 */
export class RestaurantAddressDto {
  @ApiPropertyOptional({ description: 'Logradouro.', example: 'Avenida Rondon Pacheco' })
  @IsOptional()
  @IsString({ message: 'A rua deve ser um texto.' })
  @MaxLength(160, { message: 'A rua não pode ter mais que 160 caracteres.' })
  street?: string;

  @ApiPropertyOptional({ description: 'Número.', example: '1200' })
  @IsOptional()
  @IsString({ message: 'O número deve ser um texto.' })
  @MaxLength(20, { message: 'O número não pode ter mais que 20 caracteres.' })
  number?: string;

  @ApiPropertyOptional({ description: 'Bairro.', example: 'Tibery' })
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

  @ApiPropertyOptional({
    description:
      'Latitude do restaurante, obtida pela geocodificação no app. É a origem do cálculo ' +
      'do frete por distância: sem ela, o pedido cai na faixa padrão.',
    example: -18.9146,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'A latitude informada é inválida.' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude do restaurante.', example: -48.2754 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'A longitude informada é inválida.' })
  longitude?: number;
}

export class ResponseRestaurantAddressDto {
  @ApiPropertyOptional({ example: 1, type: Number })
  id: number;

  @ApiPropertyOptional({ example: 'Avenida Rondon Pacheco', type: String })
  street?: string;

  @ApiPropertyOptional({ example: '1200', type: String })
  number?: string;

  @ApiPropertyOptional({ example: 'Tibery', type: String })
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'Uberlândia', type: String })
  city?: string;

  @ApiPropertyOptional({ example: 'Minas Gerais', type: String })
  state?: string;

  @ApiPropertyOptional({ example: '38400-000', type: String })
  zipCode?: string;

  @ApiPropertyOptional({ example: '-18.9146000', type: String })
  latitude?: string;

  @ApiPropertyOptional({ example: '-48.2754000', type: String })
  longitude?: string;
}
