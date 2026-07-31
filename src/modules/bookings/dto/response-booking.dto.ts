import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatusEnum } from '@prisma/client';

class ResponseBookingUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  fileUrl?: string;
}

class ResponseBookingAccommodationDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional()
  imageUrl?: string;
}

export class ResponseBookingDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ enum: BookingStatusEnum })
  status: BookingStatusEnum;

  @ApiProperty()
  checkIn: Date;

  @ApiProperty()
  checkOut: Date;

  @ApiProperty()
  guests: number;

  @ApiProperty()
  totalValue: string;

  @ApiPropertyOptional()
  cancelReason?: string;

  @ApiProperty()
  chatRoomId: number;

  @ApiProperty({ type: ResponseBookingAccommodationDto })
  accommodation: ResponseBookingAccommodationDto;

  @ApiProperty({ type: ResponseBookingUserDto })
  requester: ResponseBookingUserDto;

  @ApiProperty({ type: ResponseBookingUserDto })
  provider: ResponseBookingUserDto;

  @ApiPropertyOptional()
  confirmedAt?: Date;

  @ApiPropertyOptional()
  rejectedAt?: Date;

  @ApiPropertyOptional()
  checkedInAt?: Date;

  @ApiPropertyOptional()
  completedAt?: Date;

  @ApiPropertyOptional()
  cancelledAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class CreateBookingResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ResponseBookingDto })
  booking: ResponseBookingDto;
}

export class ResponseFindAllBookingDto {
  @ApiProperty({ type: [ResponseBookingDto] })
  bookings: ResponseBookingDto[];

  @ApiProperty()
  currentPage: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  totalRecords: number;
}
