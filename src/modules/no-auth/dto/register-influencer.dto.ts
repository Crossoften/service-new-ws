import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { RegisterBaseDto } from './register-base.dto';

export class RegisterInfluencerDto extends RegisterBaseDto {
  @ApiPropertyOptional({
    description:
      'Código de referência exclusivo do influencer. Gerado automaticamente se não informado.',
    example: 'joaosilva',
  })
  @IsString()
  @MaxLength(80)
  @IsOptional()
  referralCode?: string;
}
