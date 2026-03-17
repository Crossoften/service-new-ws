import { BadRequestException } from '@nestjs/common';

export class BankAccountPersistenceException extends BadRequestException {
  constructor() {
    super('Não foi possível persistir os dados bancários com os dados informados.');
  }
}
