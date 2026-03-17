import { NotFoundException } from '@nestjs/common';

export class BankAccountNotFoundException extends NotFoundException {
  constructor() {
    super('Dados bancários não encontrados.');
  }
}
