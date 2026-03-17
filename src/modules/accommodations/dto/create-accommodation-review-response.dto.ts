import { ApiProperty } from '@nestjs/swagger';
import { ResponseAccommodationDto } from './response-accommodation.dto';

export class CreateAccommodationReviewResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso da operação.',
    example: 'Avaliação da hospedagem registrada com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Dados atualizados da hospedagem após o registro da avaliação.',
    type: ResponseAccommodationDto,
  })
  accommodation: ResponseAccommodationDto;
}
