import { ApiProperty } from '@nestjs/swagger';

export class ImessageEntity {
  @ApiProperty()
  message: string;
}
