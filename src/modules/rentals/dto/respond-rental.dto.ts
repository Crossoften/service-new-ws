import { ApiProperty } from '@nestjs/swagger';
import { RentalStatusEnum } from '@prisma/client';
import { IsIn } from 'class-validator';

export class RespondRentalDto {
  @ApiProperty({
    description: 'Resposta do locador à solicitação de aluguel.',
    enum: [RentalStatusEnum.Accepted, RentalStatusEnum.Rejected],
    example: RentalStatusEnum.Accepted,
  })
  @IsIn([RentalStatusEnum.Accepted, RentalStatusEnum.Rejected], {
    message: 'A resposta deve ser Accepted ou Rejected.',
  })
  status: typeof RentalStatusEnum.Accepted | typeof RentalStatusEnum.Rejected;
}
