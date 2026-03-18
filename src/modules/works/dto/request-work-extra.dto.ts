import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumberString, IsString } from 'class-validator';

export class RequestWorkExtraDto {
  @ApiProperty({
    description: 'Justificativa do acréscimo no serviço.',
    example: 'Foi identificado um reparo adicional não previsto inicialmente.',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    description: 'Valor adicional solicitado.',
    example: '80.00',
    type: String,
  })
  @IsNumberString()
  value: string;
}
