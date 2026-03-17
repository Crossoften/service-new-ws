import { ApiProperty } from '@nestjs/swagger';
import { ResponseTransportationDto } from './response-transportation.dto';

export class CreateTransportationResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso do cadastro do transporte.',
    example: 'Transporte cadastrado com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Dados completos do transporte cadastrado.',
    type: ResponseTransportationDto,
  })
  transportation: ResponseTransportationDto;
}
