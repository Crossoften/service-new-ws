import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class OAuthCallbackDto {
  @ApiProperty({
    description: 'Código devolvido pelo Mercado Pago no retorno da autorização.',
    example: 'TG-66f0a1b2c3d4e5f6a7b8c9d0-123456789',
  })
  @IsString({ message: 'O código deve ser um texto.' })
  @MinLength(1, { message: 'O código é obrigatório.' })
  @MaxLength(255)
  code: string;

  @ApiPropertyOptional({
    description:
      'URI de retorno usada na autorização. Precisa ser exatamente a mesma enviada ' +
      'em connect-url, senão o Mercado Pago recusa a troca do código.',
    example: 'https://app.exemplo.com.br/mercado-pago/callback',
  })
  @IsOptional()
  @IsString({ message: 'A URI de retorno deve ser um texto.' })
  @MaxLength(500)
  redirectUri?: string;
}
