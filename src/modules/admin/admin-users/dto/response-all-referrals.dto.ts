import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserProfileType } from '@prisma/client';

export class ResponseAllReferralUserDto {
  @ApiProperty({ description: 'ID do usuário que indicou.', example: 12 })
  id: number;

  @ApiProperty({ description: 'Nome do usuário que indicou.', example: 'João Influencer' })
  name: string;

  @ApiProperty({ description: 'E-mail do usuário que indicou.', example: 'joao@influencer.com' })
  email: string;

  @ApiPropertyOptional({
    description: 'Código de indicação utilizado.',
    example: 'joao2026',
    nullable: true,
  })
  referralCode?: string | null;

  @ApiProperty({
    description: 'Tipo de perfil de quem indicou.',
    enum: UserProfileType,
    example: UserProfileType.Influencer,
  })
  profileType: UserProfileType;
}

export class ReferralReferredUserDto {
  @ApiProperty({ description: 'ID do usuário indicado.', example: 910 })
  id: number;

  @ApiProperty({ description: 'Nome do usuário indicado.', example: 'Maria Cliente' })
  name: string;

  @ApiProperty({ description: 'E-mail do usuário indicado.', example: 'maria@cliente.com' })
  email: string;

  @ApiPropertyOptional({
    description: 'Telefone do usuário indicado.',
    example: '+5511999990000',
    nullable: true,
  })
  phone?: string | null;

  @ApiProperty({
    description: 'Data exata em que o novo usuário se cadastrou.',
    example: '2026-06-10T14:30:00.000Z',
  })
  registeredAt: Date;
}

export class ReferralListItemDto {
  @ApiProperty({ description: 'ID único do registro de indicação (tabela referrals).', example: 1 })
  id: number;

  @ApiProperty({
    description: 'Status financeiro da indicação.',
    example: 'Convertido',
    enum: ['Convertido', 'Aguardando Pagamento'],
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Valor da comissão gerada em Reais (R$).',
    example: 50.00,
    nullable: true,
  })
  commissionAmount?: number | null;

  @ApiPropertyOptional({
    description: 'Data em que a comissão foi registrada/paga.',
    example: '2026-06-15T10:00:00.000Z',
    nullable: true,
  })
  paidAt?: Date | null;

  @ApiProperty({
    description: 'Data em que a indicação foi criada no banco de dados.',
    example: '2026-06-10T14:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Dados da pessoa que enviou o convite.',
    type: ResponseAllReferralUserDto,
  })
  influencer: ResponseAllReferralUserDto;

  @ApiProperty({
    description: 'Dados da pessoa que se cadastrou através do convite',
    type: ReferralReferredUserDto,
  })
  referredUser: ReferralReferredUserDto;
}

export class ResponseFindAllReferralsDto {
  @ApiProperty({
    description: 'Lista com todas as indicações e seus respectivos vínculos.',
    type: [ReferralListItemDto],
  })
  referrals: ReferralListItemDto[];

  @ApiProperty({
    description: 'Total de registros retornados.',
    example: 42,
  })
  totalRecords: number;
}