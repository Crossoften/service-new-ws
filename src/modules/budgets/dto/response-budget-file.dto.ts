import { ApiProperty } from '@nestjs/swagger';
import { BudgetFileTypeEnum } from '../enums/budget-file-type.enum';

export class ResponseBudgetFileDto {
  @ApiProperty({ description: 'Identificador do arquivo.', example: 1 })
  id: number;

  @ApiProperty({ description: 'Nome do arquivo.', example: 'arquivo.pdf' })
  fileName: string;

  @ApiProperty({
    description: 'URL pública do arquivo.',
    example: 'https://cdn.seudominio.com/budgets/arquivo.pdf',
  })
  fileUrl: string;

  @ApiProperty({ description: 'Chave do arquivo no storage.', example: 'budgets/arquivo.pdf' })
  fileKey: string;

  @ApiProperty({
    description: 'Tipo do arquivo no fluxo do orçamento.',
    enum: BudgetFileTypeEnum,
    enumName: 'BudgetFileTypeEnum',
    example: BudgetFileTypeEnum.Request,
  })
  type: BudgetFileTypeEnum;

  @ApiProperty({ description: 'Data de criação do arquivo.', example: '2026-03-15T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do arquivo.',
    example: '2026-03-15T10:00:00.000Z',
  })
  updatedAt: Date;
}
