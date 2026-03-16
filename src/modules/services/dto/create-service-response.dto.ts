import { ApiProperty } from '@nestjs/swagger';
import { ResponseServiceDto } from './response-service.dto';

export class CreateServiceResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso da operação.',
    example: 'Serviço cadastrado com sucesso.',
  })
  message: string;

  @ApiProperty({ type: ResponseServiceDto })
  service: ResponseServiceDto;
}
