import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Max, Min, ValidateNested } from 'class-validator';
import { RestaurantAddressDto } from './restaurant-address.dto';

export class UpdateRestaurantDto {
  @ApiPropertyOptional({ description: 'Nome do restaurante.' })
  @IsOptional()
  @IsString({ message: 'O nome deve ser um texto.' })
  name?: string;

  @ApiPropertyOptional({ description: 'Descrição do restaurante.' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;

  @ApiPropertyOptional({ description: 'URL da imagem do restaurante.' })
  @IsOptional()
  @IsString({ message: 'A URL da imagem deve ser um texto.' })
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Chave da imagem do restaurante no storage.' })
  @IsOptional()
  @IsString({ message: 'A chave da imagem deve ser um texto.' })
  imageKey?: string;

  @ApiPropertyOptional({ description: 'Id da categoria do restaurante.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O id da categoria deve ser um número inteiro.' })
  @Min(1)
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Define se o restaurante está aberto para pedidos.' })
  @IsOptional()
  @IsBoolean({ message: 'O campo isOpen deve ser um booleano.' })
  isOpen?: boolean;

  @ApiPropertyOptional({ description: 'Define se o restaurante está ativo na plataforma.' })
  @IsOptional()
  @IsBoolean({ message: 'O campo isActive deve ser um booleano.' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description:
      'Endereço do restaurante. É a origem do frete por distância e o ponto de coleta do ' +
      'entregador — próprio do estabelecimento, não o endereço do perfil do dono.',
    type: RestaurantAddressDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RestaurantAddressDto)
  address?: RestaurantAddressDto;

  @ApiPropertyOptional({
    description:
      'Tempo mínimo estimado de entrega, em minutos. Com o máximo, forma a faixa exibida ' +
      'na vitrine ("30-45 min"). Ausente significa não informado: a tela deve omitir o ' +
      'tempo, não mostrar zero.',
    example: 30,
    minimum: 1,
    maximum: 480,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O tempo mínimo de entrega deve ser um número inteiro de minutos.' })
  @Min(1, { message: 'O tempo mínimo de entrega deve ser de ao menos 1 minuto.' })
  @Max(480, { message: 'O tempo mínimo de entrega deve ser de no máximo 480 minutos.' })
  deliveryTimeMinMinutes?: number;

  @ApiPropertyOptional({
    description: 'Tempo máximo estimado de entrega, em minutos. Não pode ser menor que o mínimo.',
    example: 45,
    minimum: 1,
    maximum: 480,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O tempo máximo de entrega deve ser um número inteiro de minutos.' })
  @Min(1, { message: 'O tempo máximo de entrega deve ser de ao menos 1 minuto.' })
  @Max(480, { message: 'O tempo máximo de entrega deve ser de no máximo 480 minutos.' })
  deliveryTimeMaxMinutes?: number;
}
