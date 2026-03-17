import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ReviewType } from '../enums/service-review-type.enum';

export class CreateServiceReviewDto {
  @ApiProperty({
    description:
      'Tipo da avaliação do serviço. Use `Positive` para avaliação positiva e `Negative` para avaliação negativa.',
    enum: ReviewType,
    enumName: 'ReviewType',
    example: ReviewType.Positive,
  })
  @IsEnum(ReviewType)
  type: ReviewType;

  @ApiProperty({
    description: 'Comentário opcional da avaliação do serviço.',
    required: false,
    nullable: true,
    example: 'Atendimento excelente e serviço entregue no prazo.',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;
}
