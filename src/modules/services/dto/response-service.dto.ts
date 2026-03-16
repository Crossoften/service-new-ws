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

  @ApiProperty({ description: 'Data de criação do serviço.', example: '2026-03-14T10:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({
    description: 'Data da última atualização do serviço.',
    example: '2026-03-14T10:00:00.000Z',
  })
  updatedAt: Date;
}
