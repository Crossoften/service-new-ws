import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import handleAccessControl from '@utils/HandleAccessControl';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AdminDeliveryFeesService } from './admin-delivery-fees.service';
import { UpsertDeliveryFeeRuleDto } from './dto/upsert-delivery-fee-rule.dto';
import { ResponseDeliveryFeeRuleDto } from './dto/response-delivery-fee-rule.dto';

@ApiTags('Taxas de entrega')
@Controller('admin-delivery-fees')
export class AdminDeliveryFeesController {
  constructor(private readonly _adminDeliveryFeesService: AdminDeliveryFeesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lista as faixas de distância que determinam a taxa de entrega.',
    description:
      'Ordenadas por distância inicial. O servidor aplica a faixa mais específica que contém ' +
      'a distância entre restaurante e cliente.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: [ResponseDeliveryFeeRuleDto] })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(@CurrentUser() user: User): Promise<ResponseDeliveryFeeRuleDto[]> {
    handleAccessControl.verifyAdminRole(user);
    return this._adminDeliveryFeesService.findAll();
  }

  @Post()
  @ApiOperation({
    summary: 'Cria uma faixa de taxa de entrega.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: ResponseDeliveryFeeRuleDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: UpsertDeliveryFeeRuleDto,
  ): Promise<ResponseDeliveryFeeRuleDto> {
    handleAccessControl.verifyAdminRole(user);
    return this._adminDeliveryFeesService.create(payload);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualiza uma faixa de taxa de entrega.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseDeliveryFeeRuleDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpsertDeliveryFeeRuleDto,
  ): Promise<ResponseDeliveryFeeRuleDto> {
    handleAccessControl.verifyAdminRole(user);
    return this._adminDeliveryFeesService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remove uma faixa de taxa de entrega.',
    description:
      'Sem nenhuma faixa cadastrada, os pedidos passam a usar a taxa padrão do servidor. ' +
      'Para tirar uma faixa de circulação temporariamente, prefira desativá-la.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ description: 'Faixa removida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async remove(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    handleAccessControl.verifyAdminRole(user);
    return this._adminDeliveryFeesService.remove(id);
  }
}
