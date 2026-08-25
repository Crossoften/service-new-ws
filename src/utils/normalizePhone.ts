/**
 * Normalização de telefone para o formato E.164 (`+5511987654321`).
 *
 * A API do Twilio exige E.164 no campo `to`: qualquer máscara — espaço,
 * parêntese, hífen — ou a ausência do código do país faz o envio ser recusado.
 * O cadastro, porém, aceita o que passar pelo `@IsPhoneNumber('BR')`, que
 * valida o número mas **não** o normaliza: a base guarda hoje tanto
 * `11955554444` quanto `+5511955554444` para o mesmo telefone.
 *
 * Com a busca por igualdade exata que o `forgot` fazia, isso significava que
 * pedir o código no formato E.164 não encontrava o usuário salvo em formato
 * nacional — e a resposta genérica ("SMS enviado com sucesso") escondia a
 * falha. Normalizar na escrita e comparar por variantes na leitura resolve os
 * dois lados sem exigir migração dos registros já existentes.
 */

const BR_COUNTRY_CODE = '55';

/** Comprimentos nacionais válidos no Brasil: 10 (fixo) e 11 (móvel com o 9). */
const BR_NATIONAL_LENGTHS = [10, 11];

/** Faixa de comprimento de um número E.164, já sem o `+`. */
const E164_MIN_DIGITS = 8;
const E164_MAX_DIGITS = 15;

/**
 * Converte a entrada para E.164. Devolve `null` quando o valor não é um
 * telefone reconhecível — o chamador decide se isso vira `400` ou se apenas
 * interrompe o fluxo.
 *
 * Aceita, todos para o mesmo resultado `+5511955554444`:
 *   `11955554444` · `(11) 95555-4444` · `5511955554444` · `+55 11 95555-4444`
 */
export function normalizePhoneBR(value: string | null | undefined): string | null {
  if (!value) return null;

  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) return null;

  // Com `+`, o número já se declara internacional: respeitamos o país informado
  // em vez de assumir Brasil.
  if (hasPlus) {
    return digits.length >= E164_MIN_DIGITS && digits.length <= E164_MAX_DIGITS
      ? `+${digits}`
      : null;
  }

  // Sem `+`, mas já com o código do país na frente.
  if (digits.startsWith(BR_COUNTRY_CODE)) {
    const national = digits.slice(BR_COUNTRY_CODE.length);
    if (BR_NATIONAL_LENGTHS.includes(national.length)) {
      return `+${BR_COUNTRY_CODE}${national}`;
    }
  }

  // Formato nacional puro: DDD + número.
  if (BR_NATIONAL_LENGTHS.includes(digits.length)) {
    return `+${BR_COUNTRY_CODE}${digits}`;
  }

  return null;
}

/**
 * Variantes de escrita do mesmo telefone, para consultar registros gravados
 * antes da normalização. Sem isto, um usuário salvo como `11955554444` ficaria
 * inacessível assim que o front passasse a enviar E.164.
 *
 * A entrada original entra na lista porque uma máscara que o `normalizePhoneBR`
 * não reconhece ainda pode existir literalmente na base.
 */
export function phoneLookupVariants(value: string | null | undefined): string[] {
  if (!value) return [];

  const trimmed = value.trim();
  const variants = new Set<string>();

  if (trimmed) variants.add(trimmed);

  const e164 = normalizePhoneBR(trimmed);

  if (e164) {
    const digits = e164.slice(1);

    variants.add(e164);
    variants.add(digits);

    if (digits.startsWith(BR_COUNTRY_CODE)) {
      variants.add(digits.slice(BR_COUNTRY_CODE.length));
    }
  }

  return [...variants];
}
