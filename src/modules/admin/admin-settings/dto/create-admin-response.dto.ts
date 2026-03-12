import { ApiProperty } from '@nestjs/swagger';
import { CreateAdminAloneDto } from './create-admin-alone.dto';

export class CreateAdminResponseDto {
  @ApiProperty()
  message: string;

  @ApiProperty()
  admin: CreateAdminAloneDto;
}
