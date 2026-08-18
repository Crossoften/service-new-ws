import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OAuthCallbackDto {
  @ApiProperty({ description: 'Código de autorização retornado pelo Mercado Pago' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Redirect URI opcional utilizado na autorização', required: false })
  @IsString()
  @IsOptional()
  redirectUri?: string;
}
