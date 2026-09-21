import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateCardMachineDto {
  @ApiProperty({
    description:
      'Liga ou desliga a cobrança de cartão na maquininha do próprio estabelecimento. ' +
      'Ligar exige `acceptResponsibility: true`.',
    example: true,
  })
  @IsBoolean({ message: 'Informe se o estabelecimento usa maquininha própria.' })
  usesOwnCardMachine: boolean;

  @ApiPropertyOptional({
    description:
      'Aceite do termo de responsabilidade. Obrigatório para LIGAR a modalidade; ' +
      'ignorado ao desligar. Ao aceitar, o estabelecimento assume que o pagamento ' +
      'no cartão não passa pela plataforma e que o repasse do frete e da gorjeta ' +
      'ao entregador é responsabilidade dele.',
    example: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'O aceite deve ser verdadeiro ou falso.' })
  acceptResponsibility?: boolean;
}
