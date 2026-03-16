import { BadRequestException } from '@nestjs/common';

export function parsePositiveInt(value: string | number, fieldName: string): number {
  const parsedValue = Number(value);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new BadRequestException(`${fieldName} deve ser um número inteiro positivo.`);
  }

  return parsedValue;
}
