import { ApiProperty } from '@nestjs/swagger';
import { WorkStatusEnum } from '@prisma/client';

export class ProviderServiceHistoryItemDto {
  @ApiProperty({ example: 1, type: Number })
  workId: number;

  @ApiProperty({ example: 'Instalação Hidráulica', type: String })
  serviceName: string;

  @ApiProperty({ example: 'Ana Clara', type: String })
  requesterName: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/photo.png',
    type: String,
  })
  requesterFileUrl?: string;

  @ApiProperty({ required: false, nullable: true, example: 250.0, type: Number })
  totalValue?: number;

  @ApiProperty({ enum: WorkStatusEnum, enumName: 'WorkStatusEnum' })
  status: WorkStatusEnum;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  serviceDate?: Date;

  @ApiProperty({ example: '2026-01-10T08:00:00.000Z', type: String })
  createdAt: Date;
}

export class ResponseAdminProviderHistoryDto {
  @ApiProperty({ type: [ProviderServiceHistoryItemDto] })
  history: ProviderServiceHistoryItemDto[];

  @ApiProperty({ example: 1, type: Number })
  currentPage: number;

  @ApiProperty({ example: 3, type: Number })
  totalPages: number;

  @ApiProperty({ example: 25, type: Number })
  totalRecords: number;
}
