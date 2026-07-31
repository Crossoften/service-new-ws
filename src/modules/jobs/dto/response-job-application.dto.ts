import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobApplicationStatusEnum } from '@prisma/client';

class ResponseJobApplicationUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  fileUrl?: string;
}

class ResponseJobApplicationJobDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;
}

export class ResponseJobApplicationDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: JobApplicationStatusEnum })
  status: JobApplicationStatusEnum;

  @ApiPropertyOptional()
  message?: string;

  @ApiProperty()
  chatRoomId: number;

  @ApiProperty({ type: ResponseJobApplicationJobDto })
  job: ResponseJobApplicationJobDto;

  @ApiProperty({ type: ResponseJobApplicationUserDto })
  applicant: ResponseJobApplicationUserDto;

  @ApiPropertyOptional()
  respondedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateJobApplicationResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ResponseJobApplicationDto })
  application: ResponseJobApplicationDto;
}

export class ResponseFindAllJobApplicationDto {
  @ApiProperty({ type: [ResponseJobApplicationDto] })
  applications: ResponseJobApplicationDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalRecords: number;
}
