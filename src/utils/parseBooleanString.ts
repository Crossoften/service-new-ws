import { BadRequestException } from '@nestjs/common';

export function parseBooleanString(value: boolean | string, fieldName: string): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new BadRequestException(`${fieldName} deve ser true ou false.`);
}
