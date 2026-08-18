import { ApiProperty } from '@nestjs/swagger';

export class MercadoPagoStatusResponseDto {
  @ApiProperty({
    description: 'Indica se o usuário logado possui conta do Mercado Pago vinculada',
    example: true,
  })
  isLinked: boolean;

  @ApiProperty({
    description: 'Identificador do usuário no Mercado Pago (null caso não esteja vinculado)',
    example: '123456789',
    nullable: true,
  })
  mpUserId: string | null;
}
