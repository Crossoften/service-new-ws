import { NotFoundException } from '@nestjs/common';

export class CommercialTransactionChatNotFoundException extends NotFoundException {
  constructor() {
    super('Chat da negociação não encontrado.');
  }
}
