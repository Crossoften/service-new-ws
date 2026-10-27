import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCourierAvailabilityDto {
  @ApiProperty({
    description:
      'Disponibilidade do entregador. `false` tira ele da fila de corridas e o impede de ' +
      'aceitar qualquer entrega; `true` devolve ele à operação.',
    example: true,
    type: Boolean,
  })
  @IsBoolean({ message: 'A disponibilidade deve ser verdadeiro ou falso.' })
  isAvailable: boolean;
}

export class ResponseCourierAvailabilityDto {
  @ApiProperty({
    description: 'Estado atual, depois da alteração.',
    example: true,
    type: Boolean,
  })
  isAvailable: boolean;
}
