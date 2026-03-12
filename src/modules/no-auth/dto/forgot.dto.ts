import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class ForgotDto {
  @ApiProperty()
  @IsEmail()
  email: string;
}
