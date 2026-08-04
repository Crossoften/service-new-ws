import { ApiProperty } from '@nestjs/swagger';
import { ResponseWorkDto } from './response-work.dto';

export class PayWorkResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação da geração do checkout de pagamento.',
    example: 'Checkout de pagamento gerado com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'URL do checkout do Mercado Pago para o pagador concluir o pagamento.',
    example: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789',
    type: String,
  })
  checkoutUrl: string;

  @ApiProperty({
    description: 'Dados completos do trabalho após a criação do pedido de pagamento.',
    type: ResponseWorkDto,
  })
  work: ResponseWorkDto;
}
