import { ApiPropertyOptional } from '@nestjs/swagger';
import { BillingTypeEnum } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class UpdateBillingTypeDto {
    @ApiPropertyOptional({
        description:
            'Modelo de cobrança do usuário. Envie null para remover (não se aplica).',
        enum: BillingTypeEnum,
        enumName: 'BillingTypeEnum',
        example: BillingTypeEnum.Subscription,
        nullable: true,
    })
    @IsOptional()
    @IsEnum(BillingTypeEnum, {
        message: 'O tipo de cobrança selecionado é inválido.',
    })
    billingType?: BillingTypeEnum | null;
}