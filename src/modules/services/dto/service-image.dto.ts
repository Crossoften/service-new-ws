import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl, MaxLength, Min } from 'class-validator';

/** Mesmos tetos das colunas: `VARCHAR(1500)`. */
const URL_MAXIMA = 1500;

/**
 * Uma imagem da galeria, no corpo da requisição.
 *
 * O par `fileUrl`/`fileKey` é exatamente o que o upload devolve — a tela não
 * monta nenhum dos dois. Não há `fileName`: imagem de vitrine é renderizada,
 * não baixada por nome.
 */
export class ServiceImageInputDto {
  @ApiProperty({
    description: 'URL devolvida pelo upload. Mande a absoluta, sem reescrever o host.',
    example: 'http://localhost:8000/v1/files/1791230853240-foto.png',
  })
  // `require_tld: false` pelo mesmo motivo do `imageUrl`: a URL vem do nosso
  // próprio upload e em ambiente local o host não tem ponto.
  @IsUrl({ require_tld: false }, { message: 'A URL da imagem é inválida.' })
  @MaxLength(URL_MAXIMA, { message: `A URL da imagem excedeu ${URL_MAXIMA} caracteres.` })
  fileUrl: string;

  @ApiProperty({
    description: 'Chave do arquivo no storage, devolvida pelo upload.',
    example: '1791230853240-foto.png',
  })
  @IsString({ message: 'A chave da imagem deve ser um texto.' })
  @MaxLength(URL_MAXIMA, { message: `A chave da imagem excedeu ${URL_MAXIMA} caracteres.` })
  fileKey: string;

  @ApiProperty({
    description:
      'Posição na galeria. Quando omitida, vale a ordem em que a imagem aparece no array.',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'A ordem da imagem deve ser um número inteiro.' })
  @Min(0, { message: 'A ordem da imagem não pode ser negativa.' })
  sortOrder?: number;
}

/** Uma imagem da galeria, na resposta. */
export class ServiceImageDto {
  @ApiProperty({ example: 1, type: Number })
  id: number;

  @ApiProperty({ example: 'http://localhost:8000/v1/files/1791230853240-foto.png' })
  fileUrl: string;

  @ApiProperty({ example: '1791230853240-foto.png' })
  fileKey: string;

  @ApiProperty({ example: 0, type: Number })
  sortOrder: number;
}
