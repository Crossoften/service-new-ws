import { BadRequestException } from '@nestjs/common';

/**
 * O horário de agendamento precisa estar no futuro.
 *
 * `@IsDateString` valida o formato, não o instante — uma data válida e passada
 * passa pela validação e produziria um pedido agendado para ontem.
 */
export class FoodOrderInvalidScheduleException extends BadRequestException {
  constructor() {
    super('O horário de agendamento precisa ser no futuro.');
  }
}
