import { ApiProperty } from '@nestjs/swagger';
import { ReviewTypeEnum, WorkStatusEnum } from '@prisma/client';

class ServiceClientItemDto {
  @ApiProperty({ example: 1, type: Number })
  workId: number;

  @ApiProperty({
    required: false,
    nullable: true,
    example: '2026-03-16T10:00:00.000Z',
    type: String,
  })
  serviceDate?: Date;

  @ApiProperty({ example: '2026-01-10T08:00:00.000Z', type: String })
  createdAt: Date;

  @ApiProperty({ description: 'Nome do cliente.', example: 'Ana Clara', type: String })
  clientName: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/photo.png',
    type: String,
  })
  clientFileUrl?: string;

  @ApiProperty({ required: false, nullable: true, example: 250.0, type: Number })
  totalValue?: number;

  @ApiProperty({ enum: WorkStatusEnum, enumName: 'WorkStatusEnum' })
  status: WorkStatusEnum;

  @ApiProperty({
    description: 'Tipo da avaliação deixada pelo cliente, ou null caso não tenha avaliado.',
    required: false,
    nullable: true,
    enum: ReviewTypeEnum,
    enumName: 'ReviewTypeEnum',
  })
  reviewType: ReviewTypeEnum | null;
}

export class ResponseAdminServiceClientsDto {
  @ApiProperty({ type: [ServiceClientItemDto] })
  clients: ServiceClientItemDto[];

  @ApiProperty({ example: 1, type: Number })
  currentPage: number;

  @ApiProperty({ example: 3, type: Number })
  totalPages: number;

  @ApiProperty({ example: 25, type: Number })
  totalRecords: number;
}
