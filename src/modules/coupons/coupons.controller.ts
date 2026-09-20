import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Prisma, User, UserProfileType } from '@prisma/client';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ProfileTypes } from '../auth/decorators/profile-types.decorator';
import { CouponsService } from './coupons.service';
import { ResponseValidateCouponDto, ValidateCouponDto } from './dto/validate-coupon.dto';

@ApiTags('Cupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @ProfileTypes(UserProfileType.Client)
  @ApiOperation({
    summary: 'Confere se um cupom vale para a sacola atual e devolve o desconto.',
    description:
      'PRÉ-VISUALIZAÇÃO para a tela da sacola: o valor definitivo é recalculado na criação ' +
      'do pedido, a partir dos preços reais do cardápio. Mandar um `itemsValue` maior aqui ' +
      'não aumenta desconto nenhum — só faz a tela mostrar um número que o pedido depois ' +
      'corrige.\n\n' +
      'Responde 400 com a razão em `message` quando o cupom não vale: expirado, esgotado, ' +
      'de outro restaurante, abaixo do mínimo, ou grande demais para o pedido.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseValidateCouponDto })
  @ApiBadRequestResponse({ description: 'O cupom não vale para este pedido; veja `message`.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  async validate(
    @CurrentUser() user: User,
    @Body() payload: ValidateCouponDto,
  ): Promise<ResponseValidateCouponDto> {
    const itemsValue = new Prisma.Decimal(payload.itemsValue);

    // Na pré-visualização o frete e a comissão reais ainda não são conhecidos —
    // dependem do endereço e do `billingType`, que só a criação do pedido
    // resolve. Usamos a comissão que o restaurante aplicaria sobre estes itens,
    // e o frete só importa para cupom de frete grátis.
    const { coupon, discount } = await this.couponsService.resolveForPreview({
      code: payload.code,
      user,
      restaurantId: payload.restaurantId,
      itemsValue,
    });

    return {
      code: coupon.code,
      type: coupon.type,
      discount: discount.toFixed(2),
      description: coupon.description ?? undefined,
    };
  }
}
