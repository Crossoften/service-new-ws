import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RentalStatusEnum } from '@prisma/client';

class ResponseRentalUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  fileUrl?: string;
}

class ResponseRentalProductDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class ResponseRentalDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: RentalStatusEnum })
  status: RentalStatusEnum;

  @ApiProperty()
  startDate: Date;

  @ApiProperty()
  endDate: Date;

  @ApiProperty()
  price: string;

  @ApiPropertyOptional()
  conditions?: string;

  @ApiPropertyOptional()
  cancelReason?: string;

  @ApiProperty()
  chatRoomId: number;

  @ApiProperty({ type: ResponseRentalProductDto })
  product: ResponseRentalProductDto;

  @ApiProperty({ type: ResponseRentalUserDto })
  requester: ResponseRentalUserDto;

  @ApiProperty({ type: ResponseRentalUserDto })
  provider: ResponseRentalUserDto;

  @ApiPropertyOptional()
  acceptedAt?: Date;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  returnedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateRentalResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ResponseRentalDto })
  rental: ResponseRentalDto;
}

export class ResponseFindAllRentalDto {
  @ApiProperty({ type: [ResponseRentalDto] })
  rentals: ResponseRentalDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalRecords: number;
}
