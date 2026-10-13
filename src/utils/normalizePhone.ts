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
 * Maior DDD que mantém o nono dígito no WhatsApp.
 *
 * O nono dígito foi adicionado aos celulares brasileiros por região, e o
 * WhatsApp manteve no seu cadastro a forma vigente em cada uma delas: os DDDs
 * do eixo SP–RJ–ES (11 a 28) registram o número **com** o nono dígito; de 31 em
 * diante, **sem**. A linha telefônica tem o dígito nos dois casos — quem não
 * tem é o cadastro do WhatsApp.
 *
 * Isto vale só para o WhatsApp. O SMS vai para a operadora, que exige o número
 * completo, e por isso a regra mora aqui e não no `normalizePhoneBR`.
 *
 * ⚠️ É uma heurística sobre um sistema externo, observada no comportamento do
 * WhatsApp, não uma especificação publicada pela Meta. Se um dia a Meta
 * unificar o cadastro, é esta constante que muda.
 */
const BR_DDD_MAXIMO_COM_NONO_DIGITO = 28;

/** Posição do nono dígito dentro do número nacional (`DDD` + `9` + 8 dígitos). */
const BR_INDICE_DO_NONO_DIGITO = 2;

/** Comprimento nacional de um celular brasileiro com o nono dígito. */
const BR_CELULAR_COM_NONO_DIGITO = 11;

/**
 * E.164 no formato que o cadastro do WhatsApp reconhece.
 *
 * Enviar para a forma errada não dá erro de validação: a API do Twilio aceita a
 * mensagem, devolve `queued`, e só depois a entrega falha de forma assíncrona
 * (código 63015 no sandbox). Como a exceção nunca chega ao nosso código, o
 * fallback de SMS não dispara e o usuário não recebe nada — daí a importância
 * de acertar o formato na origem.
 *
 * Fora do caso "celular brasileiro de DDD alto", devolve o mesmo que o
 * `normalizePhoneBR`: fixo, número já sem o nono dígito e número estrangeiro
 * passam intactos.
 */
export function normalizeWhatsappPhoneBR(value: string | null | undefined): string | null {
  const e164 = normalizePhoneBR(value);

  if (!e164) return null;

  const digits = e164.slice(1);

  if (!digits.startsWith(BR_COUNTRY_CODE)) return e164;

  const national = digits.slice(BR_COUNTRY_CODE.length);

  // Só celular com o nono dígito: fixo (10 dígitos) e celular já sem o nono não
  // têm o que remover.
  if (
    national.length !== BR_CELULAR_COM_NONO_DIGITO ||
    national[BR_INDICE_DO_NONO_DIGITO] !== '9'
  ) {
    return e164;
  }

  const ddd = Number(national.slice(0, BR_INDICE_DO_NONO_DIGITO));

  if (!Number.isInteger(ddd) || ddd <= BR_DDD_MAXIMO_COM_NONO_DIGITO) return e164;

  return `+${BR_COUNTRY_CODE}${national.slice(0, BR_INDICE_DO_NONO_DIGITO)}${national.slice(
    BR_INDICE_DO_NONO_DIGITO + 1,
  )}`;
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
