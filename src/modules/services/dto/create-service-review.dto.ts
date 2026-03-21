import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewTypeEnum } from '../enums/service-review-type.enum';

export class CreateServiceReviewDto {
  @ApiProperty({
    description:
      'Tipo da avaliação do serviço. Use `Positive` para avaliação positiva e `Negative` para avaliação negativa.',
    enum: ReviewTypeEnum,
    enumName: 'ReviewTypeEnum',
    example: ReviewTypeEnum.Positive,
  })
  @IsEnum(ReviewTypeEnum, { message: 'O tipo de avaliação informado é inválido.' })
  type: ReviewTypeEnum;

  @ApiProperty({
    description: 'Comentário opcional da avaliação do serviço.',
    required: false,
    nullable: true,
    example: 'Atendimento excelente e serviço entregue no prazo.',
    type: String,
  })
  @IsString({ message: 'O comentário da avaliação deve ser um texto.' })
  @IsOptional()
  @MaxLength(2000, { message: 'O comentário deve ter no máximo 2000 caracteres.' })
  comment?: string;
}
