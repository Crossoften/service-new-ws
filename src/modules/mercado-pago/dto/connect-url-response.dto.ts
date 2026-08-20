import { ApiProperty } from '@nestjs/swagger';

export class ConnectUrlResponseDto {
  @ApiProperty({
    description: 'URL de autorização do Mercado Pago OAuth para conectar a conta do vendedor',
    example:
      'https://auth.mercadopago.com.br/authorization?client_id=123456&response_type=code&platform_id=mp&redirect_uri=https%3A%2F%2Fmeusite.com%2Fcallback',
  })
  url: string;
}
