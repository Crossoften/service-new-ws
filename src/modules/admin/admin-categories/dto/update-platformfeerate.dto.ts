import { ApiProperty } from '@nestjs/swagger';
import {
    IsNumber,
    Min,
    Max
} from 'class-validator';

export class UpdatePlatformFeeRateDto {
    @ApiProperty({ description: 'Taxa da plataforma sobre o valor do serviço (%)', example: 10 })
    @IsNumber()
    @Min(0)
    @Max(100)
    platformFeeRate?: number;
}