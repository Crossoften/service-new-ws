import { BadRequestException } from '@nestjs/common';

export class BankAccountAlreadyExistsException extends BadRequestException {
  constructor() {
    super('O usuário já possui dados bancários cadastrados.');
  }
}
