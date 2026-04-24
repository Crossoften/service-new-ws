import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class ResponseAdminProviderDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'Marina Silva', type: String })
  name: string;

  @ApiProperty({ example: 'marina@email.com', type: String })
  email: string;

  @ApiProperty({ required: false, nullable: true, example: '(34) 9 9290-0000', type: String })
  phone?: string;

  @ApiProperty({ required: false, nullable: true, example: '123.456.789-10', type: String })
  document?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/photo.png',
    type: String,
  })
  fileUrl?: string;

  @ApiProperty({ enum: Status, enumName: 'Status', example: Status.Active })
  status: Status;

  @ApiProperty({
    description: 'Total de serviços ativos do fornecedor.',
    example: 12,
    type: Number,
  })
  openServices: number;

  @ApiProperty({
    description: 'Total de avaliações positivas nos serviços do fornecedor.',
    example: 5,
    type: Number,
  })
  positiveReviews: number;

  @ApiProperty({
    description: 'Total de avaliações negativas nos serviços do fornecedor.',
    example: 1,
    type: Number,
  })
  negativeReviews: number;

  @ApiProperty({
    description: 'Total de avaliações nos serviços do fornecedor.',
    example: 6,
    type: Number,
  })
  totalReviews: number;

  @ApiProperty({ example: '2026-03-16T10:00:00.000Z', type: String })
  createdAt: Date;

  @ApiProperty({ example: '2026-03-16T10:00:00.000Z', type: String })
  updatedAt: Date;
}
