import { ApiProperty } from '@nestjs/swagger';

export class ResponseServiceCategoryDto {
  @ApiProperty({ description: 'Identificador da categoria.', example: 1, type: Number })
  id: number;

  @ApiProperty({ description: 'Nome exibido da categoria.', example: 'Dentista', type: String })
  name: string;

  @ApiProperty({ description: 'Slug único da categoria.', example: 'dentista', type: String })
  slug: string;

  @ApiProperty({
    description: 'URL pública do ícone da categoria.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/service-categories/dentista.png',
    type: String,
  })
  iconUrl?: string;

  @ApiProperty({
    description: 'Chave do ícone da categoria no storage.',
    required: false,
    nullable: true,
    example: 'service-categories/dentista.png',
    type: String,
  })
  iconKey?: string;

  @ApiProperty({ description: 'Indica se a categoria está ativa.', example: true, type: Boolean })
  isActive: boolean;

  @ApiProperty({ description: 'Ordem de exibição da categoria.', example: 4, type: Number })
  sortOrder: number;

  @ApiProperty({ description: 'Data de criação do registro.', example: '2026-03-14T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do registro.',
    example: '2026-03-14T10:00:00.000Z',
  })
  updatedAt: Date;
}
