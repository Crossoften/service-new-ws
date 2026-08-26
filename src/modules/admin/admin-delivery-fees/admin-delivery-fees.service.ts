import { PrismaService } from '@database/PrismaService';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DeliveryFeeRule, Prisma } from '@prisma/client';
import { UpsertDeliveryFeeRuleDto } from './dto/upsert-delivery-fee-rule.dto';
import { ResponseDeliveryFeeRuleDto } from './dto/response-delivery-fee-rule.dto';

@Injectable()
export class AdminDeliveryFeesService {
  constructor(private readonly _prisma: PrismaService) {}

  async findAll(): Promise<ResponseDeliveryFeeRuleDto[]> {
    const rules = await this._prisma.deliveryFeeRule.findMany({
      orderBy: [{ minKm: 'asc' }],
    });

    return rules.map((rule) => this.toResponseDto(rule));
  }

  async create(payload: UpsertDeliveryFeeRuleDto): Promise<ResponseDeliveryFeeRuleDto> {
    this.assertValidRange(payload);

    const rule = await this._prisma.deliveryFeeRule.create({
      data: {
        minKm: new Prisma.Decimal(payload.minKm),
        maxKm: payload.maxKm !== undefined ? new Prisma.Decimal(payload.maxKm) : null,
        type: payload.type,
        value: new Prisma.Decimal(payload.value),
        isActive: payload.isActive ?? true,
      },
    });

    return this.toResponseDto(rule);
  }

  async update(id: number, payload: UpsertDeliveryFeeRuleDto): Promise<ResponseDeliveryFeeRuleDto> {
    this.assertValidRange(payload);
    await this.findRawById(id);

    const rule = await this._prisma.deliveryFeeRule.update({
      where: { id },
      data: {
        minKm: new Prisma.Decimal(payload.minKm),
        maxKm: payload.maxKm !== undefined ? new Prisma.Decimal(payload.maxKm) : null,
        type: payload.type,
        value: new Prisma.Decimal(payload.value),
        isActive: payload.isActive ?? true,
      },
    });

    return this.toResponseDto(rule);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findRawById(id);
    await this._prisma.deliveryFeeRule.delete({ where: { id } });

    return { message: 'Faixa removida com sucesso.' };
  }

  /**
   * Faixa sem largura ou invertida não pega pedido nenhum, e o admin não teria
   * como perceber: a taxa simplesmente cairia na faixa seguinte.
   */
  private assertValidRange(payload: UpsertDeliveryFeeRuleDto): void {
    if (payload.maxKm !== undefined && payload.maxKm <= payload.minKm) {
      throw new BadRequestException('A distância máxima da faixa precisa ser maior que a mínima.');
    }
  }

  private async findRawById(id: number): Promise<DeliveryFeeRule> {
    const rule = await this._prisma.deliveryFeeRule.findUnique({ where: { id } });
    if (!rule) throw new NotFoundException('Faixa de entrega não encontrada.');
    return rule;
  }

  private toResponseDto(rule: DeliveryFeeRule): ResponseDeliveryFeeRuleDto {
    return {
      id: rule.id,
      minKm: rule.minKm.toFixed(2),
      maxKm: rule.maxKm ? rule.maxKm.toFixed(2) : undefined,
      type: rule.type,
      value: rule.value.toFixed(2),
      isActive: rule.isActive,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    };
  }
}
