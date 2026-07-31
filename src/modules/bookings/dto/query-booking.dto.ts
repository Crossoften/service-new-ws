import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { BookingStatusEnum } from '@prisma/client';

export class QueryBookingDto {
  @ApiPropertyOptional({ description: 'Filtro por status da reserva.', enum: BookingStatusEnum })
  @IsOptional()
  @IsEnum(BookingStatusEnum, { message: 'O status da reserva é inválido.' })
  status?: BookingStatusEnum;

  @ApiPropertyOptional({
    description: 'Filtra reservas como hóspede, anfitrião ou ambos.',
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
