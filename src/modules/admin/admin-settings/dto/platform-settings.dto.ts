import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, Max, Min } from 'class-validator';

/**
 * Percentuais do painel: aceitam número ou texto numérico, de 0 a 100, com até
 * duas casas.
 *
 * Trocaram `@IsDecimal()` por isto porque o `@IsDecimal` do class-validator
 * delega ao `validator.js`, que **só valida string** — `{ "rate": 10 }` em JSON
 * era recusado com "is not a valid decimal number", e o painel manda número.
 * Na outra ponta, `"500"` passava: não havia faixa nenhuma, e 500% podia ser
 * gravado em campo de dinheiro.
 *
 * O `@Type` converte o texto antes de validar — o `ValidationPipe` global roda
 * com `transform: true` —, então as duas formas servem.
 */
function Percentual(): PropertyDecorator {
  return function aplicar(target: object, chave: string | symbol): void {
    Type(() => Number)(target, chave);
    IsNumber({ maxDecimalPlaces: 2 })(target, chave);
    Min(0)(target, chave);
    Max(100)(target, chave);
    IsOptional()(target, chave);
  };
}

export class ResponsePlatformSettingsDto {
  @ApiProperty({
    description: 'Taxa global de comissão paga aos influencers sobre a primeira adesão paga (%).',
    example: 10.0,
    type: Number,
  })
  influencerCommissionRate: number;

  @ApiProperty({
    description:
      'Percentual retido pela plataforma no split do Mercado Pago (%). Vale quando a ' +
      'categoria do serviço não define taxa própria.',
    example: 10.0,
    type: Number,
  })
  marketplaceFeeRate: number;

  @ApiProperty({
    description:
      'Percentual retido pela plataforma sobre os itens de cada pedido do delivery (%). ' +
      'Vale quando o fornecedor não tem taxa própria.',
    example: 20.0,
    type: Number,
  })
  deliveryCommissionRate: number;

  @ApiProperty({ example: '2026-05-01T10:00:00.000Z', type: String })
  updatedAt: Date;
}

export class UpdatePlatformSettingsDto {
  @ApiProperty({
    description:
      'Taxa global de comissão para influencers (0–100). Aplicada quando o influencer não tem taxa customizada.',
    required: false,
    example: 12.5,
    type: Number,
  })
  @Percentual()
  influencerCommissionRate?: number;

  @ApiProperty({
    description:
      'Percentual retido pela plataforma no split do Mercado Pago (0–100). Aplicado quando ' +
      'a categoria do serviço não define taxa própria. Mudar aqui vale para as próximas ' +
      'cobranças; as já geradas mantêm a taxa do momento em que foram criadas.',
    required: false,
    example: 10.0,
    type: Number,
  })
  @Percentual()
  marketplaceFeeRate?: number;

  @ApiProperty({
    description:
      'Percentual retido pela plataforma sobre os itens de cada pedido do delivery (0–100). ' +
      'Aplicado quando o fornecedor não tem taxa própria cadastrada. Mudar aqui vale para os ' +
      'próximos pedidos; os já criados mantêm a taxa do momento em que foram feitos.',
    required: false,
    example: 20.0,
    type: Number,
  })
  @Percentual()
  deliveryCommissionRate?: number;
}
