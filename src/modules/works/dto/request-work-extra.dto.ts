import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class RequestWorkExtraDto {
  @ApiProperty({
    description: 'Justificativa do acréscimo no serviço.',
    example: 'Foi identificado um reparo adicional não previsto inicialmente.',
    type: String,
  })
  @IsString({ message: 'A descrição do acréscimo deve ser um texto.' })
  @IsNotEmpty({ message: 'A descrição do acréscimo é obrigatória.' })
  description: string;

  @ApiProperty({
    description: 'Valor adicional solicitado.',
    example: '80.00',
    type: String,
  })
  @IsNumberString({}, { message: 'O valor adicional deve conter apenas números.' })
  value: string;
}
