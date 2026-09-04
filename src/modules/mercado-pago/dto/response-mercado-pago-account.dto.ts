import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResponseConnectUrlDto {
  @ApiProperty({
    description: 'Endereço do Mercado Pago para onde o vendedor deve ser levado.',
    example: 'https://auth.mercadopago.com.br/authorization?client_id=...',
  })
  url: string;
}

export class ResponseMercadoPagoStatusDto {
  @ApiProperty({ description: 'Se a conta do vendedor está vinculada.', example: true })
  isLinked: boolean;

  @ApiPropertyOptional({
    description: 'Identificador do vendedor no Mercado Pago. Ausente quando não vinculado.',
    example: '123456789',
  })
  mpUserId?: string;

  @ApiPropertyOptional({ description: 'Quando o vínculo foi feito.' })
  linkedAt?: Date;
}

export class ResponseOAuthCallbackDto {
  @ApiProperty({ example: 'Conta do Mercado Pago vinculada com sucesso.' })
  message: string;

  @ApiProperty({ example: '123456789' })
  mpUserId: string;
}
