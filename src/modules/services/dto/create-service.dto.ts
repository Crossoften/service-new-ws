import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ServiceTypeEnum } from '../enums/service-type.enum';

export class CreateServiceDto {
  @ApiProperty({ description: 'Nome do serviço.', example: 'Consulta odontológica' })
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

  @ApiProperty({ description: 'Registro profissional.', required: false, nullable: true, example: 'CRO 12345' })
  @IsString({ message: 'O registro profissional deve ser um texto.' })
  @IsOptional()
  @MaxLength(80, { message: 'O registro profissional deve ter no máximo 80 caracteres.' })
  registrationCode?: string;

  @ApiProperty({ description: 'Valor monetário do serviço.', example: 150.0 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço do serviço deve ser um número válido.' })
  @Min(0)
  price: number;

  @ApiProperty({ description: 'Descrição detalhada do serviço.', required: false, nullable: true })
  @IsString({ message: 'A descrição do serviço deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'URL pública da imagem do serviço.', required: false, nullable: true })
  @IsUrl({}, { message: 'A URL da imagem do serviço é inválida.' })
  @IsOptional()
  @MaxLength(1500, { message: 'A URL da imagem deve ter no máximo 1500 caracteres.' })
  imageUrl?: string;

  @ApiProperty({ description: 'Chave do arquivo da imagem no storage.', required: false, nullable: true })
  @IsString({ message: 'A chave da imagem do serviço deve ser um texto.' })
  @IsOptional()
  @MaxLength(1500, { message: 'A chave da imagem deve ter no máximo 1500 caracteres.' })
  imageKey?: string;

  @ApiProperty({ description: 'Identificador da categoria do serviço.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id da categoria deve ser um número inteiro.' })
  @Min(1)
  categoryId: number;

  @ApiProperty({ description: 'Indica se o serviço já deve nascer ativo.', required: false, example: true })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'O campo isActive deve ser true ou false.' })
  @IsOptional()
  isActive?: boolean;
}
