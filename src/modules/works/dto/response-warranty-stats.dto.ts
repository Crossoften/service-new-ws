import { ApiProperty } from '@nestjs/swagger';

/**
 * Contador de garantias de um fornecedor (BE-W7).
 *
 * O número de destaque no perfil é **`warrantiesCompleted` / `warrantiesTotal`**
 * — "atendidas de tantas" (decisão Q-H). Os demais são detalhe secundário.
 */
export class ResponseWarrantyStatsDto {
  @ApiProperty({
    description: 'Acionamentos de garantia recebidos, aprovados ou não.',
    example: 7,
  })
  warrantiesTotal: number;

  @ApiProperty({ description: 'Acionamentos aprovados pelo fornecedor.', example: 6 })
  warrantiesApproved: number;

  @ApiProperty({ description: 'Acionamentos recusados. A recusa é final.', example: 1 })
  warrantiesRejected: number;

  @ApiProperty({ description: 'Acionamentos aguardando resposta.', example: 0 })
  warrantiesPending: number;

  @ApiProperty({
    description:
      'Reparos em garantia concluídos. É o que o perfil chama de "atendidas": para quem ' +
      'lê, atendida significa problema resolvido, não apenas aprovado.',
    example: 5,
  })
  warrantiesCompleted: number;

  @ApiProperty({ description: 'Reparos abertos ou em andamento.', example: 1 })
  warrantiesInProgress: number;
}
