import { ApiProperty } from '@nestjs/swagger';
import { JobApplicationStatusEnum } from '@prisma/client';
import { IsIn } from 'class-validator';

export class RespondJobApplicationDto {
  @ApiProperty({
    description: 'Resposta do empregador à candidatura.',
    enum: [JobApplicationStatusEnum.Accepted, JobApplicationStatusEnum.Rejected],
    example: JobApplicationStatusEnum.Accepted,
  })
  @IsIn([JobApplicationStatusEnum.Accepted, JobApplicationStatusEnum.Rejected], {
    message: 'A resposta deve ser Accepted ou Rejected.',
  })
  status: typeof JobApplicationStatusEnum.Accepted | typeof JobApplicationStatusEnum.Rejected;
}
