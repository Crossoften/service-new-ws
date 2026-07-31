import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TransportRequestStatusEnum } from '@prisma/client';

class ResponseTransportRequestUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  fileUrl?: string;
}

class ResponseTransportRequestTransportationDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class ResponseTransportRequestDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: TransportRequestStatusEnum })
  status: TransportRequestStatusEnum;

  @ApiProperty()
  origin: string;

  @ApiProperty()
  destination: string;

  @ApiPropertyOptional()
  cargoDescription?: string;

  @ApiPropertyOptional()
  quotedValue?: string;

  @ApiPropertyOptional()
  cancelReason?: string;

  @ApiProperty()
  chatRoomId: number;

  @ApiProperty({ type: ResponseTransportRequestTransportationDto })
  transportation: ResponseTransportRequestTransportationDto;

  @ApiProperty({ type: ResponseTransportRequestUserDto })
  requester: ResponseTransportRequestUserDto;

  @ApiProperty({ type: ResponseTransportRequestUserDto })
  provider: ResponseTransportRequestUserDto;

  @ApiPropertyOptional()
  quotedAt?: Date;

  @ApiPropertyOptional()
  acceptedAt?: Date;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  deliveredAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateTransportRequestResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ResponseTransportRequestDto })
  transportRequest: ResponseTransportRequestDto;
}

export class ResponseFindAllTransportRequestDto {
  @ApiProperty({ type: [ResponseTransportRequestDto] })
  transportRequests: ResponseTransportRequestDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalRecords: number;
}
