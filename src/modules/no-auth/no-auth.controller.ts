import { Body, Controller, Get, Post, Query } from '@nestjs/common';

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
import { CreateUserDto } from './dto/create-user.dto';
import { ForgotDto } from './dto/forgot.dto';
import { RegisterBaseDto } from './dto/register-base.dto';
import { RegisterInfluencerDto } from './dto/register-influencer.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RegisterUserResponseDto } from './dto/response-register-user.dto';
import { ResponseTextDto } from './dto/response-text.dto';
import { TextQueriesDto } from './dto/text-queries.dto';
import { VerifyCodeDto } from './dto/verify-code.dto';
import { NoAuthService } from './no-auth.service';

@Controller()
export class NoAuthController {
  constructor(private readonly noAuthService: NoAuthService) {}

  @IsPublic()
  @Post('no-auth/register')
  @ApiTags('Sem autenticação')
  @ApiOperation({
    summary: 'Cadastro genérico (profileType no body). Mantido para compatibilidade.',
    deprecated: true,
  })
  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiConflictResponse({ description: 'Usuário já cadastrado com os dados informados.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async register(@Body() body: CreateUserDto): Promise<RegisterUserResponseDto> {
    return this.noAuthService.register(body, body.profileType);
  }

 

  @IsPublic()
  @Post('no-auth/register/client')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Cadastro de cliente.' })
  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiConflictResponse({ description: 'Usuário já cadastrado com os dados informados.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async registerClient(@Body() body: RegisterBaseDto): Promise<RegisterUserResponseDto> {
    return this.noAuthService.register(body, UserProfileType.Client);
  }

  @IsPublic()
  @Post('no-auth/register/adm')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Cadastro de fornecedor.' })
  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiConflictResponse({ description: 'Usuário já cadastrado com os dados informados.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async registerAdmin(@Body() body: RegisterBaseDto): Promise<RegisterUserResponseDto> {
    return this.noAuthService.registerAdmin(body, UserProfileType.Client);
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
    return this.noAuthService.register(body, UserProfileType.Supplier);
  }

  @IsPublic()
  @Post('no-auth/register/partner')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Cadastro de parceiro.' })
  @ApiCreatedResponse({ type: RegisterUserResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiConflictResponse({ description: 'Usuário já cadastrado com os dados informados.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async registerPartner(@Body() body: RegisterBaseDto): Promise<RegisterUserResponseDto> {
    return this.noAuthService.register(body, UserProfileType.Partner);
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
    return this.noAuthService.register(body, UserProfileType.Delivery);
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
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Rota para envio de código ao email.' })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiBadRequestResponse({ description: 'Requisição inválida' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async forgot(@Body() body: ForgotDto): Promise<ImessageEntity> {
    const { email } = body;
    await this.noAuthService.forgot(email);
    return { message: 'Email enviado com sucesso!' };
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
    const { code } = body;
    await this.noAuthService.verifyCode(code);
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

  /*
  @IsPublic()
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Rota para listar todos os usuários (durante desenvolvimento).' })
  @ApiOkResponse({ type: [ResponseAllUserDto] })
  @Get('no-auth/users')
  users() {
    return this.noAuthService.users();
  }
  */

  @IsPublic()
  @Get('no-auth/health-check')
  @ApiTags('Sem autenticação')
  @ApiOperation({ summary: 'Rota para verificar status do servidor.' })
  @ApiOkResponse({ description: 'Servidor UP' })
  healthCheck() {
    return { message: 'Servidor UP' };
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
