import { UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function parsePriceDecimal(value: string | number): Prisma.Decimal {
  const parsedValue = Number(value);

  if (Number.isNaN(parsedValue) || parsedValue <= 0) {
    throw new UnprocessableEntityException('price deve ser um valor numérico maior que zero.');
  }

  return new Prisma.Decimal(parsedValue.toFixed(2));
}
