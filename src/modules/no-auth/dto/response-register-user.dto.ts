import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role, Status, UserProfileType } from '@prisma/client';

export class RegisterUserDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiPropertyOptional()
  phone?: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ enum: UserProfileType })
  profileType: UserProfileType;

  @ApiProperty({ enum: Status })
  status: Status;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

export class RegisterUserResponseDto {
  @ApiProperty({
    example: 'Usuário cadastrado com sucesso.',
  })
  message: string;

  @ApiProperty({ type: RegisterUserDto })
  user: RegisterUserDto;
}
