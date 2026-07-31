import { NotFoundException } from '@nestjs/common';

export class MenuItemNotFoundException extends NotFoundException {
  constructor() {
    super('Item de cardápio não encontrado.');
  }
}
