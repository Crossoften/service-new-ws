import { BadRequestException } from '@nestjs/common';

export class WorkPaymentOnlyAfterFinishException extends BadRequestException {
  constructor() {
    super('O pagamento só pode ser realizado após a conclusão do trabalho.');
  }
}
