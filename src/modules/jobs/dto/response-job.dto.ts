import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobTypeEnum } from '@prisma/client';

class ResponseJobEmployerDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  fileUrl?: string;
}

export class ResponseJobDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ enum: JobTypeEnum })
  type: JobTypeEnum;

  @ApiPropertyOptional()
  value?: string;

  @ApiPropertyOptional()
  requirements?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: ResponseJobEmployerDto })
  employer: ResponseJobEmployerDto;

  @ApiPropertyOptional({ description: 'Quantidade de candidaturas recebidas para a vaga.' })
  applicationsCount?: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateJobResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ResponseJobDto })
  job: ResponseJobDto;
}

export class ResponseFindAllJobDto {
  @ApiProperty({ type: [ResponseJobDto] })
  jobs: ResponseJobDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalRecords: number;
}
