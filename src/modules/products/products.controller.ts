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
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ImessageEntity } from '@interfaces/entities/Imessage.entity';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { IsPublic } from '../auth/decorators/is-public.decorator';
import { CreateProductResponseDto } from './dto/create-product-response.dto';
import { CreateProductReviewResponseDto } from './dto/create-product-review-response.dto';
import { CreateProductReviewDto } from './dto/create-product-review.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { ResponseFindAllProductDto } from './dto/response-find-all-product.dto';
import { ResponseProductCategoryDto } from './dto/response-product-category.dto';
import { ResponseProductDto } from './dto/response-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@ApiTags('Produtos')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @ApiOperation({
    summary: 'Rota para cadastrar um novo produto.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateProductResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async create(
    @CurrentUser() user: User,
    @Body() payload: CreateProductDto,
  ): Promise<CreateProductResponseDto> {
    return this.productsService.create(user, payload);
  }

  @IsPublic()
  @Get('categories')
  @ApiOperation({ summary: 'Rota para listar categorias de produtos ativas.' })
  @ApiOkResponse({ type: [ResponseProductCategoryDto] })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAllCategories(): Promise<ResponseProductCategoryDto[]> {
    return this.productsService.findAllCategories();
  }

  @IsPublic()
  @Get()
  @ApiOperation({ summary: 'Rota para listar produtos ativos.' })
  @ApiOkResponse({ type: ResponseFindAllProductDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findAll(@Query() query: QueryProductDto): Promise<ResponseFindAllProductDto> {
    return this.productsService.findAll(query);
  }

  @Get('my-products')
  @ApiOperation({
    summary: 'Rota para listar os produtos do usuário autenticado.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseFindAllProductDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findMyProducts(
    @CurrentUser() user: User,
    @Query() query: QueryProductDto,
  ): Promise<ResponseFindAllProductDto> {
    return this.productsService.findMyProducts(user, query);
  }

  @IsPublic()
  @Get(':id')
  @ApiOperation({ summary: 'Rota para recuperar um produto ativo pelo id.' })
  @ApiOkResponse({ type: ResponseProductDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async findById(@Param('id', ParseIntPipe) id: number): Promise<ResponseProductDto> {
    return this.productsService.findPublicById(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Rota para editar um produto pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ResponseProductDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async update(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: UpdateProductDto,
  ): Promise<ResponseProductDto> {
    return this.productsService.update(user, id, payload);
  }

  @Post(':id/reviews')
  @ApiOperation({
    summary: 'Rota para registrar ou atualizar a avaliação de um produto.',
    security: [{ bearerAuth: [] }],
  })
  @ApiCreatedResponse({ type: CreateProductReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async review(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
    @Body() payload: CreateProductReviewDto,
  ): Promise<CreateProductReviewResponseDto> {
    return this.productsService.review(user, id, payload);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Rota para deletar um produto pelo id.',
    security: [{ bearerAuth: [] }],
  })
  @ApiOkResponse({ type: ImessageEntity })
  @ApiBadRequestResponse({ description: 'Requisição inválida.' })
  @ApiUnauthorizedResponse({ description: 'Token inválido.' })
  @ApiForbiddenResponse({ description: 'Acesso não autorizado.' })
  @ApiInternalServerErrorResponse({ description: 'Erro interno no servidor.' })
  async delete(
    @CurrentUser() user: User,
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ImessageEntity> {
    return this.productsService.delete(user, id);
  }
}
