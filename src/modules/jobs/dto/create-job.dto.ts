import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { JobTypeEnum } from '@prisma/client';

export class CreateJobDto {
  @ApiProperty({ description: 'Título da vaga.', example: 'Desenvolvedor(a) Back-end' })
  @IsString({ message: 'O título deve ser um texto.' })
  title: string;

  @ApiProperty({ description: 'Tipo de contratação da vaga.', enum: JobTypeEnum })
  @IsEnum(JobTypeEnum, { message: 'O tipo da vaga é inválido.' })
  type: JobTypeEnum;

  @ApiPropertyOptional({ description: 'Remuneração oferecida para a vaga.', example: 3500.0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O valor deve ser um número válido.' })
  @Min(0)
  value?: number;

  @ApiPropertyOptional({
    description: 'Requisitos para a vaga.',
    example: 'Experiência com NestJS e Prisma.',
  })
  @IsOptional()
  @IsString({ message: 'Os requisitos devem ser um texto.' })
  requirements?: string;

  @ApiPropertyOptional({
    description: 'Descrição detalhada da vaga.',
    example: 'Vaga remota, contrato PJ, jornada de 40h semanais.',
  })
  @IsOptional()
  @IsString({ message: 'A descrição deve ser um texto.' })
  description?: string;
}
