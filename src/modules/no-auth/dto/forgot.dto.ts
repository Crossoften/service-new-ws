import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotDto {
  @ApiProperty({
    description: 'Email usado para recuperar a senha.',
    example: 'joao@email.com',
  })
  @IsEmail({}, { message: 'Informe um email válido.' })
  email: string;
}
