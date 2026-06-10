import { ApiPropertyOptional } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { CreateUserDto } from './create-user.dto';

export class RegisterBaseDto extends OmitType(CreateUserDto, ['profileType'] as const) {
  @ApiPropertyOptional({
    description: 'Código de convite do influencer que indicou este usuário.',
    example: 'joaosilva',
  })
  @IsOptional()
  @IsString({ message: 'O código de convite deve ser um texto.' })
  @MaxLength(80)
  inviteCode?: string;

  @ApiPropertyOptional({
    description: 'Código de indicação que o usuário pode compartilhar',
    example: 'joaosilva',
  })
  @IsOptional()
  @IsString({ message: 'O código de convite deve ser um texto.' })
  @MaxLength(80)
  referralCode?: string;
}
