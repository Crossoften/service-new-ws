import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import handleAccessControl from '@utils/HandleAccessControl';
import { User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { IsPublic } from '../../auth/decorators/is-public.decorator';
import { CreatePlanDto } from './dto/create-plan.dto';
import { QueryPlanDto } from './dto/query-plan.dto';
import { ResponseFindAllPlansDto, ResponsePlanDto } from './dto/response-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { PlansService } from './plans.service';

@ApiTags('Planos')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  @ApiOperation({ summary: 'Rota para cadastrar um plano.', security: [{ bearerAuth: [] }] })
  @ApiCreatedResponse({ type: ResponsePlanDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreatePlanDto,
  ): Promise<ResponsePlanDto> {
    handleAccessControl.verifyAdminRole(user);
    return this.plansService.create(payload);
  }

  @IsPublic()
  @Get('active')
  @ApiOperation({ summary: 'Rota para listar planos ativos.' })
  @ApiOkResponse({ type: ResponseFindAllPlansDto })
  async findActive(@Query() query: QueryPlanDto): Promise<ResponseFindAllPlansDto> {
    return this.plansService.findAll(query, true);
  }

  @Get()
  @ApiOperation({ summary: 'Rota para listar todos os planos.', security: [{ bearerAuth: [] }] })
  @ApiOkResponse({ type: ResponseFindAllPlansDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async findAll(
    @CurrentUser() user: User,
    @Query() query: QueryPlanDto,
  ): Promise<ResponseFindAllPlansDto> {
    handleAccessControl.verifyAdminRole(user);
    return this.plansService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Rota para recuperar um plano por id.', security: [{ bearerAuth: [] }] })
  @ApiOkResponse({ type: ResponsePlanDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async findById(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ResponsePlanDto> {
    handleAccessControl.verifyAdminRole(user);
    return this.plansService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Rota para editar um plano.', security: [{ bearerAuth: [] }] })
  @ApiOkResponse({ type: ResponsePlanDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdatePlanDto,
  ): Promise<ResponsePlanDto> {
    handleAccessControl.verifyAdminRole(user);
    return this.plansService.update(id, payload);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Rota para remover um plano.', security: [{ bearerAuth: [] }] })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ImessageEntity> {
    handleAccessControl.verifyAdminRole(user);
    return this.plansService.delete(id);
  }
}
