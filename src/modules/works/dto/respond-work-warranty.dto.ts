import { ApiProperty } from '@nestjs/swagger';
import { WarrantyRequestStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class RespondWorkWarrantyDto {
  @ApiProperty({
    description: 'Decisão do fornecedor sobre a solicitação de garantia.',
    enum: WarrantyRequestStatus,
    enumName: 'WarrantyRequestStatus',
    example: WarrantyRequestStatus.Approved,
  })
  @IsEnum(WarrantyRequestStatus, { message: 'O status da garantia é inválido.' })
  status: WarrantyRequestStatus;

  @ApiProperty({
    description: 'Justificativa da resposta da garantia.',
    required: false,
    nullable: true,
    example: 'Solicitação aprovada. Vamos realizar o ajuste sem custo adicional.',
    type: String,
  })
  @IsString({ message: 'A descrição da resposta da garantia deve ser um texto.' })
  @IsOptional()
  description?: string;
}
