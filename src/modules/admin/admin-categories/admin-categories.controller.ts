import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import {
    ApiForbiddenResponse,
    ApiInternalServerErrorResponse,
    ApiOkResponse,
    ApiOperation,
    ApiQuery,
    ApiTags,
    ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import handleAccessControl from '@utils/HandleAccessControl';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import { AdminCategoriesService } from './admin-categories.service';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@ApiTags('Edição de categorias')
@Controller('admin-categories')
export class AdminCategoriesController {
    constructor(private readonly _adminCategoriesService: AdminCategoriesService) { }

    @Post(':context')
    async create(
        @Param('context') context: string,
        @Body() createCategoryDto: CreateCategoryDto,
    ) {
        return this._adminCategoriesService.create(context, createCategoryDto);
    }

    @Patch(':context/:id')
    async update(
        @Param('context') context: string,
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCategoryDto: UpdateCategoryDto,
    ) {
        return this._adminCategoriesService.update(context, id, updateCategoryDto);
    }

    @Get(':context')
    async findAll(@Param('context') context: string) {
        return this._adminCategoriesService.findAll(context);
    }

    @Get(':context/:id')
    async findOne(
        @Param('context') context: string,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this._adminCategoriesService.findOne(context, id);
    }

    @Patch(':context/:id/inactivate')
    async inactivate(
        @Param('context') context: string,
        @Param('id', ParseIntPipe) id: number,
    ) {
        return this._adminCategoriesService.inactivate(context, id);
    }

}
