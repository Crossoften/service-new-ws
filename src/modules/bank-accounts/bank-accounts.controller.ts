import { Body, Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { BankAccountsService } from './bank-accounts.service';
import { CreateBankAccountResponseDto } from './dto/create-bank-account-response.dto';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { ResponseBankAccountDto } from './dto/response-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@ApiTags('Dados Bancários')
@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly bankAccountsService: BankAccountsService) {}

  @Post()
  @ApiOperation({
    summary: 'Rota para cadastrar dados bancários do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateBankAccountResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateBankAccountDto,
  ): Promise<CreateBankAccountResponseDto> {
    return this.bankAccountsService.create(user, payload);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Rota para recuperar os dados bancários do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBankAccountDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMine(@CurrentUser() user: User): Promise<ResponseBankAccountDto> {
    return this.bankAccountsService.findMine(user);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Rota para editar os dados bancários do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseBankAccountDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async updateMine(
    @CurrentUser() user: User,
    @Body() payload: UpdateBankAccountDto,
  ): Promise<ResponseBankAccountDto> {
    return this.bankAccountsService.updateMine(user, payload);
  }

  @Delete('me')
  @ApiOperation({
    summary: 'Rota para deletar os dados bancários do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async deleteMine(@CurrentUser() user: User): Promise<ImessageEntity> {
    return this.bankAccountsService.deleteMine(user);
  }
}
