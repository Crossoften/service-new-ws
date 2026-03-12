import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class NewContactDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiProperty({ maxLength: 1500 })
  @IsString()
  text: string;
}
