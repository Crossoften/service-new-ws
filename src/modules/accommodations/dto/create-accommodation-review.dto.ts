import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewTypeEnum } from 'src/modules/services/enums/service-review-type.enum';

export class CreateAccommodationReviewDto {
  @ApiProperty({
    description:
      'Tipo da avaliação da hospedagem. Use `Positive` para avaliação positiva e `Negative` para avaliação negativa.',
    enum: ReviewTypeEnum,
    enumName: 'ReviewTypeEnum',
    example: ReviewTypeEnum.Positive,
  })
  @IsEnum(ReviewTypeEnum, { message: 'O tipo de avaliação informado é inválido.' })
  type: ReviewTypeEnum;

  @ApiProperty({
    description: 'Comentário opcional da avaliação da hospedagem.',
    required: false,
    nullable: true,
    example: 'Hospedagem limpa, organizada e com ótimo atendimento.',
    type: String,
  })
  @IsString({ message: 'O comentário da avaliação deve ser um texto.' })
  @IsOptional()
  @MaxLength(2000, { message: 'O comentário deve ter no máximo 2000 caracteres.' })
  comment?: string;
}
