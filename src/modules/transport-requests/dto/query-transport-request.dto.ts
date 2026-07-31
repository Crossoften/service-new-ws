import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { TransportRequestStatusEnum } from '@prisma/client';

export class QueryTransportRequestDto {
  @ApiPropertyOptional({
    description: 'Filtro por status do pedido de transporte.',
    enum: TransportRequestStatusEnum,
  })
  @IsOptional()
  @IsEnum(TransportRequestStatusEnum, { message: 'O status do pedido é inválido.' })
  status?: TransportRequestStatusEnum;

  @ApiPropertyOptional({
    description: 'Filtra pedidos como solicitante, transportador ou ambos.',
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
