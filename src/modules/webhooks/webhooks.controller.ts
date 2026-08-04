import { Body, Controller, Headers, HttpCode, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @IsPublic()
  @Post('mercado-pago')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'Rota pública para receber notificações assíncronas de pagamento do Mercado Pago (Checkout Pro).',
    description:
      'Recebe notificações do tipo "payment" enviadas pelo Mercado Pago (via body ou query string), busca o pagamento oficial na API do Mercado Pago e confirma/cancela o pagamento local correspondente. Sempre responde 200 para evitar reenvios em loop, mesmo em casos de referência desconhecida ou credenciais não configuradas. Ao confirmar ou cancelar o pagamento, notifica as partes envolvidas via WhatsApp.',
  })
  @ApiBody({
    description: 'Formato padrão de notificação do Mercado Pago.',
    schema: {
      example: { type: 'payment', data: { id: '123456789' } },
    },
  })
  @ApiOkResponse({ description: 'Notificação recebida e processada (ou ignorada) com sucesso.' })
  async mercadoPago(
    @Body() body: Record<string, any>,
    @Query() query: Record<string, any>,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ): Promise<{ received: boolean }> {
    await this.webhooksService.handleMercadoPagoNotification(body, query, xSignature, xRequestId);
    return { received: true };
  }
}
