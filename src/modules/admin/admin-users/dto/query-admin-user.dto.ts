import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryAdminUserDto {
  @ApiProperty({
    description: 'Filtro textual aplicado sobre nome, email, telefone ou documento do usuário.',
    required: false,
    example: 'Marina',
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filtro opcional pelo status do usuário.',
    enum: Status,
    enumName: 'Status',
    required: false,
    example: Status.Active,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @ApiProperty({ description: 'Quantidade de registros por página.', required: false, example: 10 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  take?: number;

  @ApiProperty({ description: 'Página atual da listagem.', required: false, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  skip?: number;
}
