import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';

import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import { User, UserProfileType } from '@prisma/client';
import { ResponseAllUserDto } from '../admin/admin-settings/dto/response-all-user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { NewContactDto } from '../mail/dto/new-contact.dto';
import { ForgotDto } from './dto/forgot.dto';
import { ForgotChannelEnum } from './enums/forgot-channel.enum';
import { RegisterBaseDto } from './dto/register-base.dto';
import { RegisterInfluencerDto } from './dto/register-influencer.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterUserResponseDto } from './dto/response-register-user.dto';
import { ResponseTextDto } from './dto/response-text.dto';
import { TextQueriesDto } from './dto/text-queries.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { VerifyAccountDto } from './dto/verify-account.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { NoAuthService } from './no-auth.service';

@Controller()
export class NoAuthController {
  constructor(private readonly noAuthService: NoAuthService) {}

  @IsPublic()
  @Post('no-auth/register/client')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Cadastro de cliente.' })
  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiConflictResponse({ description: 'Usuário já cadastrado com os dados informados.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async registerClient(@Body() body: RegisterBaseDto): Promise<RegisterUserResponseDto> {
    return this.noAuthService.register(body, UserProfileType.Client, body.referralCode);
  }

  @IsPublic()
  @Post('no-auth/register/supplier')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Cadastro de fornecedor.' })
  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiConflictResponse({ description: 'Usuário já cadastrado com os dados informados.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async registerSupplier(@Body() body: RegisterBaseDto): Promise<RegisterUserResponseDto> {
    return this.noAuthService.register(body, UserProfileType.Supplier, body.referralCode);
  }

  @IsPublic()
  @Post('no-auth/register/delivery')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Cadastro de entregador.' })
  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiConflictResponse({ description: 'Usuário já cadastrado com os dados informados.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async registerDelivery(@Body() body: RegisterBaseDto): Promise<RegisterUserResponseDto> {
    return this.noAuthService.register(body, UserProfileType.Delivery, body.referralCode);
  }

  @IsPublic()
  @Post('no-auth/register/influencer')
  @ApiTags('Sem autenticação')
  @ApiOperation({
    summary: 'Cadastro de influencer.',
    description:
      'O campo referralCode é opcional. Se não informado, pode ser definido posteriormente pelo perfil.',
  })
  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiConflictResponse({ description: 'Usuário já cadastrado com os dados informados.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async registerInfluencer(@Body() body: RegisterInfluencerDto): Promise<RegisterUserResponseDto> {
    return this.noAuthService.register(body, UserProfileType.Influencer, body.referralCode);
  }

  @IsPublic()
  @Post('no-auth/forgot')
  @HttpCode(200)
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Rota para envio de código de recuperação de senha por email ou sms.' })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiBadRequestResponse({ description: 'Requisição inválida' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async forgotNoAuth(@Body() body: ForgotDto): Promise<ImessageEntity> {
    await this.handleForgot(body);
    return this.getForgotSuccessMessage(body.channel);
  }

  @IsPublic()
  @Post('forgot')
  @HttpCode(200)
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Rota para envio de código de recuperação de senha por email ou sms.' })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiBadRequestResponse({ description: 'Requisição inválida' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async forgot(@Body() body: ForgotDto): Promise<ImessageEntity> {
    await this.handleForgot(body);
    return this.getForgotSuccessMessage(body.channel);
  }

  private async handleForgot(body: ForgotDto): Promise<void> {
    const { channel, identifier } = body;
    await this.noAuthService.forgot(channel, identifier);
  }

  private getForgotSuccessMessage(channel: ForgotChannelEnum): ImessageEntity {
    return {
      message:
        channel === ForgotChannelEnum.Email
          ? 'Email enviado com sucesso!'
          : 'SMS enviado com sucesso!',
    };
  }

  @IsPublic()
  @Post('no-auth/verify-account')
  @HttpCode(200)
  @ApiTags('Sem autenticação')
  @ApiOperation({
    summary: 'Confirma o cadastro com o código recebido por SMS e libera o acesso.',
    description:
      'A conta nasce com status Pending e não consegue autenticar até ser verificada. ' +
      'Em caso de falha a mensagem é sempre a mesma, para não revelar quais telefones ' +
      'estão cadastrados.',
  })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiBadRequestResponse({ description: 'Requisição inválida' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async verifyAccount(@Body() body: VerifyAccountDto): Promise<ImessageEntity> {
    await this.noAuthService.verifyAccount(body);
    return { message: 'Conta verificada com sucesso!' };
  }

  @IsPublic()
  @Post('no-auth/resend-verification')
  @HttpCode(200)
  @ApiTags('Sem autenticação')
  @ApiOperation({
    summary: 'Reenvia por SMS o código de verificação do cadastro.',
    description:
      'Responde sucesso mesmo quando a conta não existe ou já está verificada — ' +
      'distinguir os casos revelaria quais telefones estão na base.',
  })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiBadRequestResponse({ description: 'Requisição inválida' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async resendVerification(@Body() body: ResendVerificationDto): Promise<ImessageEntity> {
    await this.noAuthService.resendVerification(body);
    return { message: 'SMS enviado com sucesso!' };
  }

  @IsPublic()
  @Post('no-auth/verify-code')
  @ApiTags('Sem autenticação')
  @ApiOperation({
    summary:
      'Rota para verificação do código (somente para mobile, web não precisa consumir essa rota!).',
  })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiBadRequestResponse({ description: 'Requisição inválida' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async verifyCode(@Body() body: VerifyCodeDto): Promise<ImessageEntity> {
    await this.noAuthService.verifyCode(body);
    return { message: 'Código verificado com sucesso!' };
  }

  @IsPublic()
  @Post('no-auth/reset')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Rota para redefinir senha.' })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiBadRequestResponse({ description: 'Requisição inválida' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async reset(@Body() body: ResetPasswordDto): Promise<ImessageEntity> {
    await this.noAuthService.reset(body);
    return { message: 'Senha resetada com sucesso.' };
  }

  @IsPublic()
  @Post('no-auth/contact-us')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Rota para fale conosco.' })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiBadRequestResponse({ description: 'Requisição inválida' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async contactUs(@Body() body: NewContactDto): Promise<ImessageEntity> {
    await this.noAuthService.contactUs(body);
    return { message: 'Contato enviado com sucesso, em breve retornaremos.' };
  }

  @IsPublic()
  @Get('no-auth/texts')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Rota para recuperar textos.' })
  @ApiOkResponse({ type: ResponseTextDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  texts(@Query() query: TextQueriesDto): Promise<ResponseTextDto> {
    return this.noAuthService.texts(query);
  }

  @IsPublic()
  @Get('no-auth/health-check')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Rota para verificar status do servidor.' })
  @ApiOkResponse({ description: 'Servidor UP' })
  async healthCheck() {
    // Antes respondia "UP" mesmo com o banco fora do ar — um health-check que
    // não verifica dependência não serve para orquestrador nem para alerta.
    return this.noAuthService.healthCheck();
  }

  @Get('my-self')
  @ApiTags('My Self')
  @ApiOperation({
    summary: 'Rota para recuperar informações do usuário.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseAllUserDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  mySelf(@CurrentUser() user: User) {
    return this.noAuthService.mySelf(user.id);
  }
}
