import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateBudgetFileDto {
  @ApiProperty({
    description: 'Nome original do arquivo anexado.',
    example: 'arquivo.pdf',
    type: String,
  })
  @IsString({ message: 'O nome do arquivo deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do arquivo é obrigatório.' })
  @MaxLength(191, { message: 'O nome do arquivo deve ter no máximo 191 caracteres.' })
  fileName: string;

  @ApiProperty({
    description: 'URL pública do arquivo anexado.',
    example: 'https://cdn.seudominio.com/budgets/arquivo.pdf',
    type: String,
  })
  @IsUrl({}, { message: 'A URL do arquivo é inválida.' })
  @MaxLength(1500, { message: 'A URL do arquivo deve ter no máximo 1500 caracteres.' })
  fileUrl: string;

  @ApiProperty({
    description: 'Chave do arquivo no storage.',
    example: 'budgets/arquivo.pdf',
    type: String,
  })
  @IsString({ message: 'A chave do arquivo deve ser um texto.' })
  @IsNotEmpty({ message: 'A chave do arquivo é obrigatória.' })
  @MaxLength(1500, { message: 'A chave do arquivo deve ter no máximo 1500 caracteres.' })
  fileKey: string;
}
