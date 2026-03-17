import { ApiProperty } from '@nestjs/swagger';
import { ResponseProductDto } from './response-product.dto';

export class CreateProductReviewResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso da operação.',
    example: 'Avaliação do produto registrada com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Dados atualizados do produto após o registro da avaliação.',
    type: ResponseProductDto,
  })
  product: ResponseProductDto;
}
