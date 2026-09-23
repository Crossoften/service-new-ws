import { ApiProperty } from '@nestjs/swagger';

export class ResponseUnreadCountDto {
  @ApiProperty({
    description:
      'Total de mensagens não lidas do usuário, somando todas as conversas. ' +
      'Mensagens enviadas por ele mesmo nunca contam.',
    example: 3,
  })
  total: number;
}
