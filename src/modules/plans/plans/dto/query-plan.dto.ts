import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBooleanString, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryPlanDto {
  @ApiPropertyOptional({
    description: 'Texto usado para buscar por nome ou descrição do plano.',
    example: 'mensal',
  })
  @IsOptional()
  @IsString({ message: 'O termo de busca deve ser um texto.' })
  search?: string;

  @ApiPropertyOptional({
    description: 'Filtra planos ativos ou inativos.',
    example: 'true',
    type: String,
  })
  @IsOptional()
  @IsBooleanString({ message: 'O campo isActive deve ser true ou false.' })
  isActive?: string;

  @ApiPropertyOptional({
    description: 'Quantidade de registros por página.',
    example: '10',
    type: String,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'O campo take deve conter apenas números.' })
  take?: string;

  @ApiPropertyOptional({
    description: 'Página atual da listagem.',
    example: '1',
    type: String,
  })
  @IsOptional()
  @IsNumberString({}, { message: 'O campo skip deve conter apenas números.' })
  skip?: string;
}
