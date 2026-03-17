import { ApiProperty } from '@nestjs/swagger';
import { ResponseProductDto } from './response-product.dto';

export class CreateProductResponseDto {
  @ApiProperty({
    description: 'Mensagem de sucesso da operação.',
    example: 'Produto cadastrado com sucesso.',
    type: String,
  })
  message: string;

  @ApiProperty({
    description: 'Dados completos do produto criado ou atualizado após a operação.',
    type: ResponseProductDto,
  })
  product: ResponseProductDto;
}
