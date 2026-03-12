import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class IfileEntity {
  @ApiProperty({ example: 'https://example.com/file1.jpg' })
  @IsString()
  @MaxLength(1500)
  fileUrl?: string;

  @ApiProperty({ example: 'unique-file-key-1.jpg' })
  @IsString()
  @MaxLength(1500)
  fileKey?: string;
}
