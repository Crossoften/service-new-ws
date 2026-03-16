import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateBudgetFileDto {
  @ApiProperty({
    description: 'Nome original do arquivo anexado.',
    example: 'arquivo.pdf',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(191)
  fileName: string;

  @ApiProperty({
    description: 'URL pública do arquivo anexado.',
    example: 'https://cdn.seudominio.com/budgets/arquivo.pdf',
    type: String,
  })
  @IsUrl()
  @MaxLength(1500)
  fileUrl: string;

  @ApiProperty({
    description: 'Chave do arquivo no storage.',
    example: 'budgets/arquivo.pdf',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1500)
  fileKey: string;
}
