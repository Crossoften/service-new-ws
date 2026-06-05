import { PrismaService } from '@database/PrismaService';
import { BadRequestException, Body, ConflictException, Get, Injectable, NotFoundException, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { ApiForbiddenResponse, ApiInternalServerErrorResponse, ApiOkResponse, ApiOperation, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { PaymentStatusEnum, Role } from '@prisma/client';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import handleAccessControl from '@utils/HandleAccessControl';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class AdminCategoriesService {
    constructor(private readonly _prisma: PrismaService) { }

    private getDelegate(context: string) {
        const delegates: Record<string, any> = {
            services: this._prisma.serviceCategory,
            products: this._prisma.productCategory,
            accommodations: this._prisma.accommodationCategory,
            transportations: this._prisma.transportationCategory,
        };

        const delegate = delegates[context];
        if (!delegate) {
            throw new BadRequestException(
                'Contexto inválido. Use: services, products, accommodations ou transportations.'
            );
        }
        return delegate;
    }

    async update(context: string, id: number, data: UpdateCategoryDto) {
        const delegate = this.getDelegate(context);

        const categoryExists = await delegate.findUnique({
            where: { id },
        });

        if (!categoryExists) {
            throw new NotFoundException(`Categoria não encontrada no contexto '${context}'.`);
        }

        const updatedCategory = await delegate.update({
            where: { id },
            data,
        });

        return updatedCategory;
    }

    async create(context: string, data: CreateCategoryDto) {
        const delegate = this.getDelegate(context);

        const categoryExists = await delegate.findFirst({
            where: {
                OR: [
                    { name: data.name },
                    { slug: data.slug }
                ]
            }
        });

        if (categoryExists) {
            throw new ConflictException(
                `Já existe uma categoria com o nome '${data.name}' ou slug '${data.slug}' no módulo de ${context}.`
            );
        }

        const newCategory = await delegate.create({
            data: {
                name: data.name,
                slug: data.slug,
                iconUrl: data.iconUrl,
                iconKey: data.iconKey,
                isActive: data.isActive ?? true,
                sortOrder: data.sortOrder ? data.sortOrder : 0
            },
        });

        return newCategory;
    }

    async findAll(context: string) {
        const delegate = this.getDelegate(context);
        return delegate.findMany({
            orderBy: { sortOrder: 'asc' },
        });
    }

    async findOne(context: string, id: number) {
        const delegate = this.getDelegate(context);
        const category = await delegate.findUnique({
            where: { id },
        });

        if (!category) {
            throw new NotFoundException(
                `Categoria com ID ${id} não foi encontrada no contexto de ${context}.`
            );
        }

        return category;
    }

    async inactivate(context: string, id: number) {
        const delegate = this.getDelegate(context);

        await this.findOne(context, id);

        const inactiveCategory = await delegate.update({
            where: { id },
            data: { isActive: false },
        });

        return inactiveCategory;
    }
}
