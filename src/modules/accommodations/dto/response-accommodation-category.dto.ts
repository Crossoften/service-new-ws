import { ApiProperty } from '@nestjs/swagger';

export class ResponseAccommodationCategoryDto {
  @ApiProperty({ description: 'Identificador da categoria.', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome da categoria.', example: 'Hotel', type: String })
  name: string;

  @ApiProperty({
    description: 'Slug estável usado para identificar a categoria.',
    example: 'hotel',
    type: String,
  })
  slug: string;

  @ApiProperty({
    description: 'URL pública do ícone da categoria.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/accommodation-categories/hotel.png',
    type: String,
  })
  iconUrl?: string;

  @ApiProperty({
    description: 'Chave do ícone da categoria no storage.',
    required: false,
    nullable: true,
    example: 'accommodation-categories/hotel.png',
    type: String,
  })
  iconKey?: string;

  @ApiProperty({ description: 'Indica se a categoria está ativa.', example: true, type: Boolean })
  isActive: boolean;

  @ApiProperty({ description: 'Ordem de exibição da categoria.', example: 1, type: Number })
  sortOrder: number;

  @ApiProperty({
    description: 'Data de criação da categoria em formato ISO 8601.',
    example: '2026-03-17T10:00:00.000Z',
    type: String,
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização da categoria em formato ISO 8601.',
    example: '2026-03-17T10:00:00.000Z',
    type: String,
  })
  updatedAt: Date;
}
