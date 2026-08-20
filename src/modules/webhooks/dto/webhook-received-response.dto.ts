import { ApiProperty } from '@nestjs/swagger';

export class WebhookReceivedResponseDto {
  @ApiProperty({ description: 'Indica que a notificação foi recebida.', example: true })
  received: boolean;
}
