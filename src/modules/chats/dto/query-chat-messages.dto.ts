import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryChatMessagesDto {
  @ApiProperty({
    description: 'Busca textual aplicada sobre o conteúdo da mensagem e nome do remetente.',
    required: false,
    example: 'cheguei',
    type: String,
  })
  @IsString({ message: 'O campo search deve ser um texto.' })
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Quantidade de mensagens por página.',
    required: false,
    example: '20',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo take deve conter apenas números.' })
  @IsOptional()
  take?: number;

  @ApiProperty({
    description: 'Página atual para cálculo de paginação.',
    required: false,
    example: '1',
    type: String,
  })
  @IsNumberString({}, { message: 'O campo skip deve conter apenas números.' })
  @IsOptional()
  skip?: number;
}
