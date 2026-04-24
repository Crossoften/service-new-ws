import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class ResponseAdminProviderListItemDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'Marina Silva', type: String })
  name: string;

  @ApiProperty({ example: 'marina@email.com', type: String })
  email: string;

  @ApiProperty({ required: false, nullable: true, example: '(34) 9 9290-0000', type: String })
  phone?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'https://cdn.example.com/photo.png',
    type: String,
  })
  fileUrl?: string;

  @ApiProperty({
    description: 'Posição no ranking baseada no total de serviços ativos.',
    example: 1,
    type: Number,
  })
  ranking: number;

  @ApiProperty({
    description: 'Total de serviços ativos do fornecedor.',
    example: 1200,
    type: Number,
  })
  totalServices: number;

  @ApiProperty({ enum: Status, enumName: 'Status', example: Status.Active })
  status: Status;
}

export class ResponseFindAllAdminProviderDto {
  @ApiProperty({ type: [ResponseAdminProviderListItemDto] })
  providers: ResponseAdminProviderListItemDto[];

  @ApiProperty({ example: 1, type: Number })
  currentPage: number;

  @ApiProperty({ example: 5, type: Number })
  totalPages: number;

  @ApiProperty({ example: 48, type: Number })
  totalRecords: number;
}
