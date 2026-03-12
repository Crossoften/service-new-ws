import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class VerifyCodeDto {
  @ApiProperty({ maxLength: 4 })
  @IsString()
  @MaxLength(4)
  code: string;
}
