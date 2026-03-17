import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewType } from 'src/modules/services/enums/service-review-type.enum';

export class CreateAccommodationReviewDto {
  @ApiProperty({
    description:
      'Tipo da avaliação da hospedagem. Use `Positive` para avaliação positiva e `Negative` para avaliação negativa.',
    enum: ReviewType,
    enumName: 'ReviewType',
    example: ReviewType.Positive,
  })
  @IsEnum(ReviewType)
  type: ReviewType;

  @ApiProperty({
    description: 'Comentário opcional da avaliação da hospedagem.',
    required: false,
    nullable: true,
    example: 'Hospedagem limpa, organizada e com ótimo atendimento.',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;
}
