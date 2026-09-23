import { BadRequestException } from '@nestjs/common';

/**
 * Não existe garantia de garantia.
 *
 * Decisão de produto Q-G: bloquear no MVP. A garantia cobre o **serviço
 * original**; encadear reparos de reparos traria recursão, complicaria o
 * contador do perfil e não resolve nada que o caminho normal não resolva — se
 * o conserto falhou, o cliente aciona a garantia do trabalho original de novo,
 * enquanto estiver na janela.
 */
export class WorkWarrantyNotNestableException extends BadRequestException {
  constructor() {
    super(
      'Este trabalho já é um reparo em garantia e não aceita novo acionamento. ' +
        'Acione a garantia do trabalho original.',
    );
  }
}
