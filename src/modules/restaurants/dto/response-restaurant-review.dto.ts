import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResponseRestaurantReviewDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ description: 'Nota de 1 a 5.' })
  rating: number;

  @ApiPropertyOptional()
  comment?: string;

  @ApiProperty()
  requesterId: number;

  @ApiProperty()
  createdAt: Date;
}

export class CreateRestaurantReviewResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty({ type: ResponseRestaurantReviewDto })
  review: ResponseRestaurantReviewDto;
}
