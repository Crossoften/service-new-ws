import { ApiProperty } from '@nestjs/swagger';

export class ResponseOneFileDto {
  @ApiProperty()
  fileUrl: string;

  @ApiProperty()
  fileKey: string;
}
