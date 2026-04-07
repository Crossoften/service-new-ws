import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryChatMessagesDto {
  @ApiProperty({
    description: 'Busca textual aplicada sobre o conteúdo da mensagem e nome do remetente.',
    required: false,
    example: 'cheguei',
  })
  @IsString({ message: 'O campo search deve ser um texto.' })
  @IsOptional()
  search?: string;

  @ApiProperty({ description: 'Quantidade de mensagens por página.', required: false, example: 20 })
  @Type(() => Number)
  @IsInt({ message: 'O campo take deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  take?: number;

  @ApiProperty({
    description: 'Página atual para cálculo de paginação.',
    required: false,
    example: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'O campo skip deve ser um número inteiro.' })
  @Min(1)
  @IsOptional()
  skip?: number;
}
