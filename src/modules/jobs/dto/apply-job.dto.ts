import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApplyJobDto {
  @ApiPropertyOptional({
    description: 'Mensagem de apresentação do candidato.',
    example: 'Tenho 5 anos de experiência na área e gostaria de me candidatar.',
  })
  @IsOptional()
  @IsString({ message: 'A mensagem deve ser um texto.' })
  message?: string;
}
