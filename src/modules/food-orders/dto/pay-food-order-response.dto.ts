import { ApiProperty } from '@nestjs/swagger';
import { ResponseFoodOrderDto } from './response-food-order.dto';

export class PayFoodOrderResponseDto {
  @ApiProperty({
    description: 'Mensagem de confirmação da geração do checkout de pagamento.',
    example: 'Checkout de pagamento gerado com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'URL do checkout do Mercado Pago para o cliente concluir o pagamento.',
    example: 'https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=123456789',
    type: String,
  })
  checkoutUrl: string;

  @ApiProperty({
    description: 'Dados completos do pedido após a geração do checkout.',
    type: ResponseFoodOrderDto,
  })
  foodOrder: ResponseFoodOrderDto;
}
