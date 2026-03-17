import { ApiProperty } from '@nestjs/swagger';

export class ResponseBalanceUserDto {
  @ApiProperty({
    description: 'Identificador do usuário relacionado ao item exibido no saldo.',
    example: 27,
    type: Number,
  })
  id: number;

  @ApiProperty({
    description: 'Nome do usuário relacionado ao item exibido no saldo.',
    example: 'Joelson Silva',
    type: String,
  })
  name: string;

  @ApiProperty({
    description: 'Url pública da foto do usuário, quando houver.',
    example: 'https://cdn.service.com/users/joelson.png',
    type: String,
    nullable: true,
  })
  fileUrl?: string;
}
