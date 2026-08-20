import { ApiPropertyOptional } from '@nestjs/swagger';

export class MercadoPagoWebhookDataDto {
  @ApiPropertyOptional({
    description: 'Identificador do pagamento no Mercado Pago.',
    example: '123456789',
  })
  id?: string;
}
