import { ApiProperty } from '@nestjs/swagger';
import { TransportRequestStatusEnum } from '@prisma/client';
import { IsIn } from 'class-validator';

export class RespondTransportRequestDto {
  @ApiProperty({
    description: 'Resposta do solicitante à cotação de transporte.',
    enum: [TransportRequestStatusEnum.Accepted, TransportRequestStatusEnum.Rejected],
    example: TransportRequestStatusEnum.Accepted,
  })
  @IsIn([TransportRequestStatusEnum.Accepted, TransportRequestStatusEnum.Rejected], {
    message: 'A resposta deve ser Accepted ou Rejected.',
  })
  status: typeof TransportRequestStatusEnum.Accepted | typeof TransportRequestStatusEnum.Rejected;
}
