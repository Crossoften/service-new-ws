import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewType } from 'src/modules/services/enums/service-review-type.enum';

export class CreateProductReviewDto {
  @ApiProperty({
    description:
      'Tipo da avaliação do produto. Use `Positive` para avaliação positiva e `Negative` para avaliação negativa.',
    enum: ReviewType,
    enumName: 'ReviewType',
    example: ReviewType.Positive,
  })
  @IsEnum(ReviewType, { message: 'O tipo de avaliação informado é inválido.' })
  type: ReviewType;

  @ApiProperty({
    description: 'Comentário opcional da avaliação do produto.',
    required: false,
    nullable: true,
    example: 'Produto exatamente como anunciado e em ótimo estado.',
    type: String,
  })
  @IsString({ message: 'O comentário da avaliação deve ser um texto.' })
  @IsOptional()
  @MaxLength(2000, { message: 'O comentário deve ter no máximo 2000 caracteres.' })
  comment?: string;
}
