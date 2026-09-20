import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Endereço de entrega informado no pedido.
 *
 * Existe porque o usuário tem **um** endereço no cadastro (`User.addressId` é
 * único), e o pedido sempre usava esse. Quem quisesse receber no trabalho, na
 * casa da mãe ou em qualquer outro lugar precisava editar o perfil antes e
 * desfazer depois.
 *
 * Informado, o endereço é gravado no pedido e não altera o cadastro. Omitido, o
 * pedido continua usando o endereço do perfil, como sempre fez.
 */
export class DeliveryAddressDto {
  @ApiProperty({ description: 'Logradouro.', example: 'Rua das Palmeiras' })
  @IsString({ message: 'A rua deve ser um texto.' })
  @MaxLength(160, { message: 'A rua não pode ter mais que 160 caracteres.' })
  street: string;

  @ApiPropertyOptional({ description: 'Número.', example: '458' })
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

  @ApiPropertyOptional({
    description:
      'Latitude do destino. Sem ela o frete cai na faixa padrão e o app do entregador ' +
      'não tem para onde traçar a rota.',
    example: -18.9186,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({ message: 'A latitude informada é inválida.' })
  latitude?: number;

  @ApiPropertyOptional({ description: 'Longitude do destino.', example: -48.2772 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude({ message: 'A longitude informada é inválida.' })
  longitude?: number;
}

export class ResponseFoodOrderAddressDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiPropertyOptional({ example: 'Rua das Palmeiras', type: String })
  street?: string;

  @ApiPropertyOptional({ example: '458', type: String })
  number?: string;

  @ApiPropertyOptional({ example: 'Centro', type: String })
  neighborhood?: string;

  @ApiPropertyOptional({ example: 'Uberlândia', type: String })
  city?: string;

  @ApiPropertyOptional({ example: 'Minas Gerais', type: String })
  state?: string;

  @ApiPropertyOptional({ example: '38400-000', type: String })
  zipCode?: string;

  @ApiPropertyOptional({ example: '-18.9186000', type: String })
  latitude?: string;

  @ApiPropertyOptional({ example: '-48.2772000', type: String })
  longitude?: string;
}
