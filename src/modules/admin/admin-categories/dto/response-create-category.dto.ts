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

  @ApiProperty({ example: 10, description: 'Taxa da plataforma sobre o valor do serviço (%)' })
  platformFeeRate: number | undefined;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
