import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { ServiceImageInputDto } from './service-image.dto';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  ValidateNested,
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

/** Teto técnico da galeria. Não é regra de negócio — ver a nota no campo. */
export const MAXIMO_DE_IMAGENS = 10;

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

  @ApiProperty({
    description: 'Registro profissional.',
    required: false,
    nullable: true,
    example: 'CRO 12345',
  })
  @IsString({ message: 'O registro profissional deve ser um texto.' })
  @IsOptional()
  @MaxLength(80, { message: 'O registro profissional deve ter no máximo 80 caracteres.' })
  registrationCode?: string;

  @ApiPropertyOptional({
    description:
      'Valor de referência do serviço. **Opcional**: o preço que vale é o que o ' +
      'profissional informa ao responder a solicitação de orçamento. Use para vitrine ' +
      '("a partir de"), ou omita quando tudo for sob orçamento. Envie `null` numa ' +
      'atualização para apagar o preço de um serviço que já tinha.',
    example: 150.0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 }, { message: 'O preço do serviço deve ser um número válido.' })
  @Min(0)
  price?: number | null;

  @ApiProperty({ description: 'Descrição detalhada do serviço.', required: false, nullable: true })
  @IsString({ message: 'A descrição do serviço deve ser um texto.' })
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do serviço.',
    required: false,
    nullable: true,
  })
  // `require_tld: false` porque a própria API emite a URL do arquivo a partir
  // de `URL_INTEGRATION`, e em ambiente local isso é `http://localhost:8000`.
  // Com as opções padrão o validador recusava a URL que o próprio upload
  // devolveu — travava criar e editar serviço com imagem fora de um domínio
  // com TLD. O IP já passava; o host sem ponto é que não.
  @IsUrl({ require_tld: false }, { message: 'A URL da imagem do serviço é inválida.' })
  @IsOptional()
  @MaxLength(1500, { message: 'A URL da imagem deve ter no máximo 1500 caracteres.' })
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave do arquivo da imagem no storage.',
    required: false,
    nullable: true,
  })
  @IsString({ message: 'A chave da imagem do serviço deve ser um texto.' })
  @IsOptional()
  @MaxLength(1500, { message: 'A chave da imagem deve ter no máximo 1500 caracteres.' })
  imageKey?: string;

  @ApiPropertyOptional({
    description:
      'URL do vídeo de apresentação. Um por serviço, como em produto, hospedagem e ' +
      'transporte. Enviado pelo fluxo de presign.',
  })
  @IsUrl({ require_tld: false }, { message: 'A URL do vídeo do serviço é inválida.' })
  @IsOptional()
  @MaxLength(1500, { message: 'A URL do vídeo deve ter no máximo 1500 caracteres.' })
  videoUrl?: string;

  @ApiPropertyOptional({ description: 'Chave do vídeo no storage.' })
  @IsString({ message: 'A chave do vídeo do serviço deve ser um texto.' })
  @IsOptional()
  @MaxLength(1500, { message: 'A chave do vídeo deve ter no máximo 1500 caracteres.' })
  videoKey?: string;

  @ApiPropertyOptional({
    description:
      'Galeria de imagens, além da capa. No `PATCH` a lista enviada **substitui** a ' +
      'galeria inteira: o que não vier é removido, e o arquivo correspondente sai do ' +
      'storage. Omitir o campo não mexe na galeria; mandar `[]` a esvazia.',
    type: [ServiceImageInputDto],
  })
  @IsOptional()
  @IsArray({ message: 'A galeria deve ser uma lista de imagens.' })
  // Teto técnico para não aceitar payload sem fim. Se o produto quiser outro
  // número, é só este valor.
  @ArrayMaxSize(MAXIMO_DE_IMAGENS, {
    message: `A galeria aceita no máximo ${MAXIMO_DE_IMAGENS} imagens.`,
  })
  @ValidateNested({ each: true })
  @Type(() => ServiceImageInputDto)
  images?: ServiceImageInputDto[];

  @ApiProperty({ description: 'Identificador da categoria do serviço.', example: 1 })
  @Type(() => Number)
  @IsInt({ message: 'O id da categoria deve ser um número inteiro.' })
  @Min(1)
  categoryId: number;

  @ApiProperty({
    description: 'Indica se o serviço já deve nascer ativo.',
    required: false,
    example: true,
  })
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean({ message: 'O campo isActive deve ser true ou false.' })
  @IsOptional()
  isActive?: boolean;
}
