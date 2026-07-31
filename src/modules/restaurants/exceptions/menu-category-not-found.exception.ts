import { NotFoundException } from '@nestjs/common';

export class MenuCategoryNotFoundException extends NotFoundException {
  constructor() {
    super('Categoria de cardápio não encontrada.');
  }
}
