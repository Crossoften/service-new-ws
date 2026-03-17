import { ApiProperty } from '@nestjs/swagger';
import { ResponseAccommodationDto } from './response-accommodation.dto';

export class CreateAccommodationResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso do cadastro da hospedagem.',
    example: 'Hospedagem cadastrada com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Dados completos da hospedagem cadastrada.',
    type: ResponseAccommodationDto,
  })
  accommodation: ResponseAccommodationDto;
}
