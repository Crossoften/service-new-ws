import { ApiProperty } from '@nestjs/swagger';
import { SocialNetworkEnum } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateUserSocialMediaDto {
  @ApiProperty({
    description: 'Rede social.',
    enum: SocialNetworkEnum,
    enumName: 'SocialNetworkEnum',
    example: SocialNetworkEnum.Instagram,
  })
  @IsEnum(SocialNetworkEnum)
  network: SocialNetworkEnum;

  @ApiProperty({
    description: 'URL do perfil na rede social.',
    example: 'https://instagram.com/joaosilva',
  })
  @IsString()
  @MaxLength(500)
  url: string;

  @ApiProperty({
    description: 'Total de seguidores nessa rede.',
    required: false,
    example: 15000,
  })
  @IsInt()
  @Min(0)
  @IsOptional()
  followers?: number;
}
