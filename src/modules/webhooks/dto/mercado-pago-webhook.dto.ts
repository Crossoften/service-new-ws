import { ApiPropertyOptional } from '@nestjs/swagger';
import { MercadoPagoWebhookDataDto } from './mercado-pago-webhook-data.dto';

export class MercadoPagoWebhookDto {
  @ApiPropertyOptional({
    description: 'Tipo da notificação recebida.',
    example: 'payment',
  })
  type?: string;

  @ApiPropertyOptional({
    description: 'Ação associada à notificação.',
    example: 'payment.created',
  })
  action?: string;

  @ApiPropertyOptional({ type: MercadoPagoWebhookDataDto })
  data?: MercadoPagoWebhookDataDto;
}
