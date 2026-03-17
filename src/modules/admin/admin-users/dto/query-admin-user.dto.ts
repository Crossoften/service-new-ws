import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma/client';
import { IsEnum, IsNumberString, IsOptional, IsString } from 'class-validator';

export class QueryAdminUserDto {
  @ApiProperty({
    description: 'Filtro textual aplicado sobre nome, email, telefone ou documento do usuário.',
    required: false,
    example: 'Marina',
    type: String,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Filtro opcional pelo status do usuário.',
    enum: Status,
    enumName: 'Status',
    required: false,
    example: Status.Active,
  })
  @IsEnum(Status)
  @IsOptional()
  status?: Status;

  @ApiProperty({
    description: 'Quantidade de registros por página.',
    required: false,
    example: '10',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  take?: number;

  @ApiProperty({
    description:
      'Página atual da listagem. Apesar do nome do campo ser `skip`, o valor esperado é o número da página.',
    required: false,
    example: '1',
    type: String,
  })
  @IsNumberString()
  @IsOptional()
  skip?: number;
}
