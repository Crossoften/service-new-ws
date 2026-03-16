import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CancelWorkDto {
  @ApiProperty({
    description: 'Motivo do cancelamento do trabalho.',
    example: 'Cliente desistiu do serviço.',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  cancelReason: string;
}
