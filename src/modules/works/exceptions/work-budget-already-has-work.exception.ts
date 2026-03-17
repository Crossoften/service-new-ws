import { BadRequestException } from '@nestjs/common';

export class WorkBudgetAlreadyHasWorkException extends BadRequestException {
  constructor() {
    super('Já existe trabalho cadastrado para esse orçamento.');
  }
}
