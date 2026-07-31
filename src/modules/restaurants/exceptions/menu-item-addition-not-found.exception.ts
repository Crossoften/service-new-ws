import { NotFoundException } from '@nestjs/common';

export class MenuItemAdditionNotFoundException extends NotFoundException {
  constructor() {
    super('Adicional de item de cardápio não encontrado.');
  }
}
