import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { JobTypeEnum } from '@prisma/client';

export class UpdateJobDto {
  @ApiPropertyOptional({ description: 'Título da vaga.' })
  @IsOptional()
  @IsString({ message: 'O título deve ser um texto.' })
  title?: string;

  @ApiPropertyOptional({ description: 'Tipo de contratação da vaga.', enum: JobTypeEnum })
  @IsOptional()
  @IsEnum(JobTypeEnum, { message: 'O tipo da vaga é inválido.' })
  type?: JobTypeEnum;

  @ApiPropertyOptional({ description: 'Remuneração oferecida para a vaga.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ser um número válido.' })
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ description: 'Requisitos para a vaga.' })
  @IsOptional()
  @IsString({ message: 'Os requisitos devem ser um texto.' })
  requirements?: string;

  @ApiPropertyOptional({ description: 'Descrição detalhada da vaga.' })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;

  @ApiPropertyOptional({ description: 'Define se a vaga está ativa (visível para candidaturas).' })
  @IsOptional()
  @IsBoolean({ message: 'O campo isActive deve ser um booleano.' })
  isActive?: boolean;
}
