import { ApiPropertyOptional } from '@nestjs/swagger';
import { OmitType } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminPermissions } from '@prisma/client';
import { CreateUserDto } from './create-user.dto';

export class RegisterAdminDto extends OmitType(CreateUserDto, ['profileType'] as const) {
  @ApiPropertyOptional({
    description: 'Código de convite do influencer que indicou este usuário.',
    example: 'joaosilva',
  })
  @IsOptional()
  @IsString({ message: 'O código de convite deve ser um texto.' })
  @MaxLength(80)
  inviteCode?: string;

  @ApiPropertyOptional({
    description: 'Permissões do admin no portal gerencial.',
    enum: AdminPermissions,
    isArray: true,
    example: ['Dashboard', 'Settings', 'Services', 'Financial', 'Users'],
  })
  @IsArray({ message: 'As permissões devem ser uma lista.' })
  @IsEnum(AdminPermissions, { each: true, message: 'Permissão inválida.' })
  @IsOptional()
  adminPermissions?: AdminPermissions[];
}