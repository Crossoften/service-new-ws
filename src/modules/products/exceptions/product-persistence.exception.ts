import { BadRequestException } from '@nestjs/common';

export class ProductPersistenceException extends BadRequestException {
  constructor() {
    super('Não foi possível persistir o produto com os dados informados.');
  }
}
