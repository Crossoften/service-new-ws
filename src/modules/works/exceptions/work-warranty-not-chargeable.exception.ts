import { BadRequestException } from '@nestjs/common';

/**
 * Reparo em garantia não é cobrado.
 *
 * Decisão de produto Q-E: a garantia é sem custo. O Work de garantia nasce com
 * `serviceValue = 0`, então gerar checkout no Mercado Pago com valor zero não
 * faria sentido nem seria aceito pelo gateway — e liberar `request-extra` nele
 * reintroduziria a cobrança pela porta dos fundos.
 */
export class WorkWarrantyNotChargeableException extends BadRequestException {
  constructor(acao: 'pagamento' | 'adicional') {
    super(
      acao === 'pagamento'
        ? 'Reparo em garantia não é cobrado, então não gera pagamento.'
        : 'Reparo em garantia não é cobrado, então não aceita pedido de adicional. ' +
            'Se o conserto revelou um serviço novo, ele é um trabalho novo.',
    );
  }
}
