import { ApiProperty } from '@nestjs/swagger';

export class DeleteOneFileDto {
  @ApiProperty()
  fileKey?: string;
}
