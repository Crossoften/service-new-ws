import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ResponseProfileDto } from './dto/response-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileService } from './profile.service';
import { ResponseAddressDto } from './dto/response-address-dto';
import { UpdateAddressDto } from './dto/update-address-dto';
import { UpdateBillingTypeDto } from './dto/update-billing-type.dto';

@ApiTags('Perfil')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) { }

  @Get('me')
  @ApiOperation({
    summary: 'Rota para recuperar o perfil do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseProfileDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMine(@CurrentUser() user: User): Promise<ResponseProfileDto> {
    return this.profileService.findMine(user);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Rota para editar o perfil do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseProfileDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async updateMine(
    @CurrentUser() user: User,
    @Body() payload: UpdateProfileDto,
  ): Promise<ResponseProfileDto> {
    return this.profileService.updateMine(user, payload);
  }

  @Patch('me/address')
  @ApiOperation({
    summary: 'Rota para criar ou atualizar o endereço do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseAddressDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async updateMyAddress(
    @CurrentUser() user: User,
    @Body() payload: UpdateAddressDto,
  ): Promise<ResponseAddressDto> {
    return this.profileService.updateMyAddress(user, payload);
  }

  @Patch('me/billing-type')
  @ApiOperation({
    summary: 'Rota para atualizar o modelo de cobrança do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseProfileDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async updateMyBillingType(
    @CurrentUser() user: User,
    @Body() payload: UpdateBillingTypeDto,
  ): Promise<ResponseProfileDto> {
    return this.profileService.updateMyBillingType(user, payload);
  }
}
