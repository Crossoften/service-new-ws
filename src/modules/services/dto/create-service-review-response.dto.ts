import { ApiProperty } from '@nestjs/swagger';
import { ResponseServiceDto } from './response-service.dto';

export class CreateServiceReviewResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso da operação.',
    example: 'Avaliação do serviço registrada com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Dados atualizados do serviço após o registro da avaliação.',
    type: ResponseServiceDto,
  })
  service: ResponseServiceDto;
}
