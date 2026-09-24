import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class QueryCurrentSubscriptionDto {
  @ApiPropertyOptional({
    description:
      'Restringe a busca a uma categoria de atuação. Sem ele, devolve a ' +
      'assinatura mais recente — que, com várias categorias, pode não ser a ' +
      'que a tela está mostrando.',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O id da categoria deve ser um número inteiro.' })
  @Min(1)
  categoryId?: number;
}
