import { ApiProperty } from '@nestjs/swagger';
import { ResponseTransportationDto } from './response-transportation.dto';

export class CreateTransportationReviewResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso da operação.',
    example: 'Avaliação do transporte registrada com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Dados atualizados do transporte após o registro da avaliação.',
    type: ResponseTransportationDto,
  })
  transportation: ResponseTransportationDto;
}
