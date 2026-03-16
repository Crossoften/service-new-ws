import { ApiProperty } from '@nestjs/swagger';
import { ResponseWorkDto } from './response-work.dto';

export class CreateWorkResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso da operação.',
    example: 'Trabalho cadastrado com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Dados completos do trabalho criado ou atualizado após a operação.',
    type: ResponseWorkDto,
  })
  work: ResponseWorkDto;
}
