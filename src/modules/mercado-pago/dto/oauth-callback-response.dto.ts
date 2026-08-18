import { ApiProperty } from '@nestjs/swagger';

export class OAuthCallbackResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação da vinculação da conta',
    example: 'Conta do Mercado Pago conectada com sucesso.',
  })
  message: string;

  @ApiProperty({
    description: 'Identificador do usuário no Mercado Pago',
    example: '123456789',
  })
  mpUserId: string;
}
