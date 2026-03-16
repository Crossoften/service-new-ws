import { parseBooleanString } from './parseBooleanString';

export function parseOptionalBooleanString(
  value?: boolean | string,
  fieldName = 'value',
): boolean | undefined {
  if (value === undefined || value === null) return undefined;

  return parseBooleanString(value, fieldName);
}
