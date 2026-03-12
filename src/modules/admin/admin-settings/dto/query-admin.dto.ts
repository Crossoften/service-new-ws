import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryAdminDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ enum: Status, required: false })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @ApiProperty({ required: false })
  @IsNumberString()
  @IsOptional()
  take?: number;

  @ApiProperty({ required: false })
  @IsNumberString()
  @IsOptional()
  skip?: number;
}
