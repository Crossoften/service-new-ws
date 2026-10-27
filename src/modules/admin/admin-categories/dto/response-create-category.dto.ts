import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResponseCategoryDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Limpeza' })
  name: string;

  @ApiProperty({ example: 'limpeza' })
  slug: string;

  @ApiPropertyOptional({ nullable: true, example: 'https://...' })
  iconUrl: string | null;

  @ApiPropertyOptional({ nullable: true, example: 'icones/limpeza.png' })
  iconKey: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: 1 })
  sortOrder: number;

  @ApiPropertyOptional({
    example: 10,
    description:
      'Taxa da plataforma sobre o valor do serviço (%). Presente apenas nas categorias ' +
      'de services — é o único contexto que tem a coluna.',
  })
  platformFeeRate?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
