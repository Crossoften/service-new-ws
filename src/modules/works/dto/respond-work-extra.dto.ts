import { ApiProperty } from '@nestjs/swagger';
import { ExtraRequestStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class RespondWorkExtraDto {
  @ApiProperty({
    description: 'Decisão do cliente sobre o acréscimo solicitado.',
    enum: ExtraRequestStatus,
    enumName: 'ExtraRequestStatus',
    example: ExtraRequestStatus.Approved,
  })
  @IsEnum(ExtraRequestStatus)
  status: ExtraRequestStatus;
}
