import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { RentalStatusEnum } from '@prisma/client';

export class QueryRentalDto {
  @ApiPropertyOptional({ description: 'Filtro por status do aluguel.', enum: RentalStatusEnum })
  @IsOptional()
  @IsEnum(RentalStatusEnum, { message: 'O status do aluguel é inválido.' })
  status?: RentalStatusEnum;

  @ApiPropertyOptional({
    description: 'Filtra alugueis como locatário, locador ou ambos.',
    enum: ['Requester', 'Provider', 'All'],
    example: 'All',
  })
  @IsOptional()
  @IsIn(['Requester', 'Provider', 'All'])
  participantRole?: 'Requester' | 'Provider' | 'All';

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
