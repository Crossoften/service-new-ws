import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewType } from 'src/modules/services/enums/service-review-type.enum';

export class CreateTransportationReviewDto {
  @ApiProperty({
    description:
      'Tipo da avaliação do transporte. Use `Positive` para avaliação positiva e `Negative` para avaliação negativa.',
    enum: ReviewType,
    enumName: 'ReviewType',
    example: ReviewType.Positive,
  })
  @IsEnum(ReviewType)
  type: ReviewType;

  @ApiProperty({
    description: 'Comentário opcional da avaliação do transporte.',
    required: false,
    nullable: true,
    example: 'Transporte conservado, limpo e entregue conforme combinado.',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;
}
