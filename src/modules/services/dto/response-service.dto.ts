import { ApiProperty } from '@nestjs/swagger';
import { ServiceType } from '../enums/service-type.enum';
import { ResponseServiceCategoryDto } from './response-service-category.dto';

export class ResponseServiceOwnerDto {
  @ApiProperty({ description: 'Identificador do usuário dono do serviço.', example: 15 })
  id: number;

  @ApiProperty({ description: 'Nome do usuário.', example: 'Maria Silva' })
  name: string;

  @ApiProperty({ description: 'Email do usuário.', example: 'maria@email.com' })
  email: string;

  @ApiProperty({
    description: 'Telefone do usuário.',
    required: false,
    nullable: true,
    example: '+55 11 99999-9999',
  })
  phone?: string;
}

export class ResponseServiceListCategoryDto {
  @ApiProperty({ description: 'Identificador da categoria.', example: 4 })
  id: number;

  @ApiProperty({ description: 'Nome da categoria.', example: 'Dentista' })
  name: string;

  @ApiProperty({ description: 'Slug da categoria.', example: 'dentista' })
  slug: string;

  @ApiProperty({
    description: 'URL pública do ícone da categoria.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/service-categories/dentista.png',
  })
  iconUrl?: string;
}

export class ResponseServiceListOwnerDto {
  @ApiProperty({ description: 'Identificador do usuário dono do serviço.', example: 15 })
  id: number;

  @ApiProperty({ description: 'Nome do usuário.', example: 'Maria Silva' })
  name: string;

  @ApiProperty({
    description: 'Telefone do usuário.',
    required: false,
    nullable: true,
    example: '+55 11 99999-9999',
  })
  phone?: string;
}

export class ResponseServiceListItemDto {
  @ApiProperty({ description: 'Identificador do serviço.', example: 20 })
  id: number;

  @ApiProperty({ description: 'Nome do serviço.', example: 'Consulta odontológica' })
  name: string;

  @ApiProperty({
    description: 'Tipo de atendimento do serviço.',
    enum: ServiceType,
    enumName: 'ServiceType',
    example: ServiceType.Online,
  })
  type: ServiceType;

  @ApiProperty({ description: 'Preço formatado com duas casas decimais.', example: '150.00' })
  price: string;

  @ApiProperty({
    description: 'Descrição resumida do serviço.',
    required: false,
    nullable: true,
    example: 'Atendimento com avaliação inicial e plano de tratamento.',
  })
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem principal do serviço.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/services/consulta-odontologica.png',
  })
  imageUrl?: string;

  @ApiProperty({ description: 'Indica se o serviço está ativo.', example: true })
  isActive: boolean;

  @ApiProperty({ type: ResponseServiceListCategoryDto })
  category: ResponseServiceListCategoryDto;

  @ApiProperty({ type: ResponseServiceListOwnerDto })
  user: ResponseServiceListOwnerDto;

  @ApiProperty({
    description: 'Quantidade total de avaliações positivas recebidas pelo serviço.',
    example: 83,
    type: Number,
  })
  positiveReviews: number;

  @ApiProperty({
    description: 'Quantidade total de avaliações negativas recebidas pelo serviço.',
    example: 20,
    type: Number,
  })
  negativeReviews: number;

  @ApiProperty({
    description: 'Quantidade total de trabalhos finalizados vinculados ao serviço.',
    example: 100,
    type: Number,
  })
  completedWorks: number;
}

export class ResponseServiceDto {
  @ApiProperty({ description: 'Identificador do serviço.', example: 20 })
  id: number;

  @ApiProperty({ description: 'Nome do serviço.', example: 'Consulta odontológica' })
  name: string;

  @ApiProperty({
    description: 'Tipo de atendimento do serviço.',
    enum: ServiceType,
    enumName: 'ServiceType',
    example: ServiceType.Online,
  })
  type: ServiceType;

  @ApiProperty({
    description: 'Registro profissional vinculado ao serviço.',
    required: false,
    nullable: true,
    example: 'CRO 12345',
  })
  registrationCode?: string;

  @ApiProperty({ description: 'Preço formatado com duas casas decimais.', example: '150.00' })
  price: string;

  @ApiProperty({
    description: 'Descrição detalhada do serviço.',
    required: false,
    nullable: true,
    example: 'Atendimento com avaliação inicial e plano de tratamento.',
  })
  description?: string;

  @ApiProperty({
    description: 'URL pública da imagem do serviço.',
    required: false,
    nullable: true,
    example: 'https://cdn.seudominio.com/services/consulta-odontologica.png',
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'Chave da imagem do serviço no storage.',
    required: false,
    nullable: true,
    example: 'services/consulta-odontologica.png',
  })
  imageKey?: string;

  @ApiProperty({ description: 'Indica se o serviço está ativo.', example: true })
  isActive: boolean;

  @ApiProperty({ description: 'Id da categoria vinculada.', example: 4 })
  categoryId: number;

  @ApiProperty({ type: ResponseServiceCategoryDto })
  category: ResponseServiceCategoryDto;

  @ApiProperty({ description: 'Id do usuário dono do serviço.', example: 15 })
  userId: number;

  @ApiProperty({ type: ResponseServiceOwnerDto })
  user: ResponseServiceOwnerDto;

  @ApiProperty({
    description: 'Quantidade total de avaliações positivas recebidas pelo serviço.',
    example: 83,
    type: Number,
  })
  positiveReviews: number;

  @ApiProperty({
    description: 'Quantidade total de avaliações negativas recebidas pelo serviço.',
    example: 20,
    type: Number,
  })
  negativeReviews: number;

  @ApiProperty({
    description: 'Quantidade total de trabalhos finalizados vinculados ao serviço.',
    example: 100,
    type: Number,
  })
  completedWorks: number;

  @ApiProperty({ description: 'Data de criação do serviço.', example: '2026-03-14T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do serviço.',
    example: '2026-03-14T10:00:00.000Z',
  })
  updatedAt: Date;
}
