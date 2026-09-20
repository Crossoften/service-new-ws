import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import handleAccessControl from '@utils/HandleAccessControl';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AdminCouponsService } from './admin-coupons.service';
import { CreateCouponDto, ResponseCouponDto, UpdateCouponDto } from './dto/create-coupon.dto';

@ApiTags('Cupons - Portal Gerencial')
@Controller('admin-coupons')
export class AdminCouponsController {
  constructor(private readonly adminCouponsService: AdminCouponsService) {}

  @Post()
  @ApiOperation({
    summary: 'Cria um cupom de desconto.',
    description:
      'O desconto é custeado pela PLATAFORMA: o restaurante recebe os itens integrais e o ' +
      'entregador recebe frete e gorjeta normalmente. Por isso o desconto de um pedido ' +
      'nunca passa da comissão dele — use `minOrderValue` e `maxDiscountValue` para manter ' +
      'o cupom dentro desse limite, senão ele será recusado nos pedidos menores.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: ResponseCouponDto })
  @ApiBadRequestResponse({ description: 'Código repetido, ou tipo e valor incoerentes.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateCouponDto,
  ): Promise<ResponseCouponDto> {
    handleAccessControl.verifyAdminRole(user);
    return this.adminCouponsService.create(user.id, payload);
  }

  @Get()
  @ApiOperation({
    summary: 'Lista os cupons, com a contagem de resgates.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: [ResponseCouponDto] })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async findAll(@CurrentUser() user: User): Promise<ResponseCouponDto[]> {
    handleAccessControl.verifyAdminRole(user);
    return this.adminCouponsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalha um cupom.', security: [{ bearerAuth: [] }] })
  @ApiOkResponse({ type: ResponseCouponDto })
  @ApiNotFoundResponse({ description: 'Cupom não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseCouponDto> {
    handleAccessControl.verifyAdminRole(user);
    return this.adminCouponsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Edita um cupom.',
    description:
      'A coerência entre tipo e valor é conferida sobre como o cupom FICARÁ, não só sobre ' +
      'o que veio no corpo — mandar só o tipo não deixa um percentual sem percentual.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseCouponDto })
  @ApiBadRequestResponse({ description: 'Tipo e valor incoerentes, ou vigência invertida.' })
  @ApiNotFoundResponse({ description: 'Cupom não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateCouponDto,
  ): Promise<ResponseCouponDto> {
    handleAccessControl.verifyAdminRole(user);
    return this.adminCouponsService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Desativa um cupom.',
    description:
      'Desativa, não apaga: cupom já resgatado tem pedidos apontando para ele, e remover a ' +
      'linha quebraria o histórico de quem usou o desconto.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseCouponDto })
  @ApiNotFoundResponse({ description: 'Cupom não encontrado.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async deactivate(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponseCouponDto> {
    handleAccessControl.verifyAdminRole(user);
    return this.adminCouponsService.deactivate(id);
  }
}
