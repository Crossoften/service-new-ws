import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';

export class ResponseAdminInfluencerListItemDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'João Carlos', type: String })
  name: string;

  @ApiProperty({ example: 'joao@email.com', type: String })
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
    description: 'Posição no ranking baseada no total de indicações.',
    example: 1,
    type: Number,
  })
  ranking: number;

  @ApiProperty({
    description: 'Total de usuários indicados (downloads).',
    example: 100,
    type: Number,
  })
  totalReferrals: number;

  @ApiProperty({ enum: Status, enumName: 'Status', example: Status.Active })
  status: Status;
}

export class ResponseFindAllAdminInfluencerDto {
  @ApiProperty({ type: [ResponseAdminInfluencerListItemDto] })
  influencers: ResponseAdminInfluencerListItemDto[];

  @ApiProperty({ example: 1, type: Number })
  currentPage: number;

  @ApiProperty({ example: 5, type: Number })
  totalPages: number;

  @ApiProperty({ example: 48, type: Number })
  totalRecords: number;
}
