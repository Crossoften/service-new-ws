import { BadRequestException } from '@nestjs/common';

export class SellerNotLinkedMercadoPagoException extends BadRequestException {
  constructor(
    message = 'O prestador/vendedor precisa conectar sua conta do Mercado Pago para receber pagamentos via split automático.',
  ) {
    super(message);
  }
}
