import { ApiProperty } from '@nestjs/swagger';

export class ResponseProviderPercentageDto {
  @ApiProperty({ example: 'Limpeza' })
  name: string;

  @ApiProperty({
    example: 100,
    description:
      'Percentual do valor do serviço repassado ao fornecedor (%). Sempre 100: serviço não tem retenção.',
  })
  providerRate: number;
}
