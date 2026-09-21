import { BadRequestException } from '@nestjs/common';

/**
 * Ligar a maquininha própria sem aceitar a responsabilidade.
 *
 * O aceite não é formalidade: ao ligar a modalidade, o pagamento no cartão
 * deixa de passar pela plataforma, e com ele somem o split e a retenção do
 * frete. A partir daí é o estabelecimento quem deve ao entregador. Gravar a
 * flag sem o aceite deixaria essa transferência de responsabilidade sem
 * registro — que é exatamente o que a reunião pediu para não acontecer.
 */
export class RestaurantCardMachineTermsRequiredException extends BadRequestException {
  constructor() {
    super(
      'Para usar maquininha própria é preciso aceitar a responsabilidade pelo repasse ' +
        'ao entregador. Envie `acceptResponsibility: true`.',
    );
  }
}
