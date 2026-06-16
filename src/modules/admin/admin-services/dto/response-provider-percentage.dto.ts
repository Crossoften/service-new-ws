import { ApiProperty } from '@nestjs/swagger';

export class ResponseProviderPercentageDto {
    @ApiProperty({ example: 'Limpeza' })
    name: string;

    @ApiProperty({
        example: 90,
        description: 'Percentual do valor do serviço repassado ao fornecedor (%)',
    })
    providerRate: number;
}