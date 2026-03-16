import { ApiProperty } from '@nestjs/swagger';
import {
  IsBooleanString,
  IsEnum,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ServiceType } from '../enums/service-type.enum';

export class CreateServiceDto {
  @ApiProperty({
    description: 'Nome do serviço que será exibido para os usuários.',
    example: 'Consulta odontológica',
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(160)
  name: string;

  @ApiProperty({
    description: 'Tipo de atendimento do serviço.',
    enum: ServiceType,
    enumName: 'ServiceType',
    example: ServiceType.Online,
  })
  @IsEnum(ServiceType)
  type: ServiceType;

  @ApiProperty({
    description: 'Registro profissional, quando aplicável.',
    required: false,
    nullable: true,
    example: 'CRO 12345',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(80)
  registrationCode?: string;

  @ApiProperty({
    description: 'Valor monetário do serviço com até duas casas decimais.',
    example: '150.00',
    type: String,
  })
  @IsNumberString()
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada do serviço.',
    required: false,
    nullable: true,
    example: 'Atendimento clínico com avaliação inicial e orientação.',
    type: String,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do serviço.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/services/consulta-odontologica.png',
    type: String,
  })
  @IsUrl()
  @IsOptional()
  @MaxLength(1500)
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave do arquivo da imagem no storage.',
    required: false,
    nullable: true,
    example: 'services/consulta-odontologica.png',
    type: String,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1500)
  imageKey?: string;

  @ApiProperty({
    description: 'Identificador da categoria do serviço.',
    example: '1',
    type: String,
  })
  @IsNumberString()
  categoryId: number;

  @ApiProperty({
    description: 'Indica se o serviço já deve nascer ativo.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsBooleanString()
  @IsOptional()
  isActive?: boolean;
}
