import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { JobTypeEnum } from '@prisma/client';

export class QueryJobDto {
  @ApiPropertyOptional({ description: 'Filtro por tipo de vaga.', enum: JobTypeEnum })
  @IsOptional()
  @IsEnum(JobTypeEnum, { message: 'O tipo da vaga é inválido.' })
  type?: JobTypeEnum;

  @ApiPropertyOptional({ description: 'Filtro por vagas ativas ou inativas.' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'O campo isActive deve ser um booleano.' })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Filtra vagas publicadas pelo empregador autenticado ou todas as vagas ativas.',
    enum: ['Mine', 'All'],
    example: 'All',
  })
  @IsOptional()
  @IsIn(['Mine', 'All'])
  scope?: 'Mine' | 'All';

  @ApiPropertyOptional({ description: 'Quantidade de registros por página.', example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O campo take deve ser um número inteiro.' })
  @Min(1)
  take?: number;

  @ApiPropertyOptional({ description: 'Página atual da listagem.', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'O campo skip deve ser um número inteiro.' })
  @Min(1)
  skip?: number;
}
