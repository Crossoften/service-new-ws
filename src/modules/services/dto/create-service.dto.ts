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
import { ServiceTypeEnum } from '../enums/service-type.enum';

export class CreateServiceDto {
  @ApiProperty({
    description: 'Nome do serviço que será exibido para os usuários.',
    example: 'Consulta odontológica',
    type: String,
  })
  @IsString({ message: 'O nome do serviço deve ser um texto.' })
  @IsNotEmpty({ message: 'O nome do serviço é obrigatório.' })
  @MinLength(3, { message: 'O nome do serviço deve ter no mínimo 3 caracteres.' })
  @MaxLength(160, { message: 'O nome do serviço deve ter no máximo 160 caracteres.' })
  name: string;

  @ApiProperty({
    description: 'Tipo de atendimento do serviço.',
    enum: ServiceTypeEnum,
    enumName: 'ServiceTypeEnum',
    example: ServiceTypeEnum.Online,
  })
  @IsEnum(ServiceTypeEnum, { message: 'O tipo de serviço informado é inválido.' })
  type: ServiceTypeEnum;

  @ApiProperty({
    description: 'Registro profissional, quando aplicável.',
    required: false,
    nullable: true,
    example: 'CRO 12345',
    type: String,
  })
  @IsString({ message: 'O registro profissional deve ser um texto.' })
  @IsOptional()
  @MaxLength(80, { message: 'O registro profissional deve ter no máximo 80 caracteres.' })
  registrationCode?: string;

  @ApiProperty({
    description: 'Valor monetário do serviço com até duas casas decimais.',
    example: '150.00',
    type: String,
  })
  @IsNumberString({}, { message: 'O preço do serviço deve conter apenas números.' })
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada do serviço.',
    required: false,
    nullable: true,
    example: 'Atendimento clínico com avaliação inicial e orientação.',
    type: String,
  })
  @IsString({ message: 'A descrição do serviço deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do serviço.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/services/consulta-odontologica.png',
    type: String,
  })
  @IsUrl({}, { message: 'A URL da imagem do serviço é inválida.' })
  @IsOptional()
  @MaxLength(1500, { message: 'A URL da imagem deve ter no máximo 1500 caracteres.' })
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave do arquivo da imagem no storage.',
    required: false,
    nullable: true,
    example: 'services/consulta-odontologica.png',
    type: String,
  })
  @IsString({ message: 'A chave da imagem do serviço deve ser um texto.' })
  @IsOptional()
  @MaxLength(1500, { message: 'A chave da imagem deve ter no máximo 1500 caracteres.' })
  imageKey?: string;

  @ApiProperty({
    description: 'Identificador da categoria do serviço.',
    example: '1',
    type: String,
  })
  @IsNumberString({}, { message: 'O id da categoria deve conter apenas números.' })
  categoryId: number;

  @ApiProperty({
    description: 'Indica se o serviço já deve nascer ativo.',
    required: false,
    example: 'true',
    type: String,
  })
  @IsBooleanString({ message: 'O campo isActive deve ser true ou false.' })
  @IsOptional()
  isActive?: boolean;
}
