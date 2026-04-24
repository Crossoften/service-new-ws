import { ApiProperty } from '@nestjs/swagger';
import { WorkStatusEnum } from '@prisma/client';

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
    description: 'Indica se o cliente deixou avaliação para este serviço.',
    example: true,
    type: Boolean,
  })
  hasReview: boolean;
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
