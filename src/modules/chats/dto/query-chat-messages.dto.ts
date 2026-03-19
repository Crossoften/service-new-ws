import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional } from 'class-validator';

export class QueryChatMessagesDto {
  @ApiProperty({
    description: 'Quantidade de mensagens por página.',
    required: false,
    example: '20',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  take?: number;

  @ApiProperty({
    description: 'Página atual para cálculo de paginação.',
    required: false,
    example: '1',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  skip?: number;
}
