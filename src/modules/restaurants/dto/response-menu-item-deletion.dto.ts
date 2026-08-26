import { ApiProperty } from '@nestjs/swagger';

export class MenuItemDeletionResultDto {
  @ApiProperty({ description: 'O que aconteceu com o item, em texto para a tela.' })
  message: string;

  @ApiProperty({
    description:
      'true quando o item foi apagado de verdade; false quando ele já constava em pedidos e ' +
      'por isso foi apenas desativado. A tela deve tratar os dois casos: no segundo, o item ' +
      'continua existindo na listagem administrativa, marcado como inativo.',
    example: true,
  })
  deleted: boolean;
}
