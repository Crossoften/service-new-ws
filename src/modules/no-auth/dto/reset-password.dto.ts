import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ maxLength: 4 })
  @IsString()
  @MaxLength(4)
  code: string;

  @ApiProperty({ maxLength: 8 })
  @IsString()
  @MaxLength(8)
  password: string;

  @ApiProperty({ maxLength: 8 })
  @IsString()
  @MaxLength(8)
  confirmPassword: string;
}
