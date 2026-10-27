import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { RespondRentalDto } from '../../rentals/dto/respond-rental.dto';
import { RespondBookingDto } from './respond-booking.dto';

/**
 * Regra do produto: ao recusar, a justificativa é obrigatória e fica visível
 * para quem pediu.
 *
 * Reserva e aluguel têm a **mesma** regra, e este arquivo cobre os dois de
 * propósito: um spec por módulo divergiria com o tempo — alguém ajusta a
 * mensagem de um lado e o outro fica para trás. Aqui, divergir quebra o teste.
 */
interface Caso {
  rotulo: string;
  dto: new () => object;
  aprova: string;
  recusa: string;
}

const CASOS: Caso[] = [
  { rotulo: 'reserva', dto: RespondBookingDto, aprova: 'Confirmed', recusa: 'Rejected' },
  { rotulo: 'aluguel', dto: RespondRentalDto, aprova: 'Accepted', recusa: 'Rejected' },
];

async function mensagens(caso: Caso, corpo: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(caso.dto, corpo);

  return (await validate(dto as object)).flatMap((erro) => Object.values(erro.constraints ?? {}));
}

function instancia(caso: Caso, corpo: Record<string, unknown>): { rejectReason?: string } {
  return plainToInstance(caso.dto, corpo) as { rejectReason?: string };
}

describe.each(CASOS)('motivo da recusa — $rotulo', (caso) => {
  it('exige o motivo quando a resposta é recusa', async () => {
    expect(await mensagens(caso, { status: caso.recusa })).toContain('Informe o motivo da recusa.');
  });

  it('recusa motivo só com espaços', async () => {
    // O `@Transform` apara antes de validar; sem ele `"   "` passaria pelo
    // `@IsNotEmpty` e gravaria motivo vazio, que é o mesmo que não ter motivo.
    expect(await mensagens(caso, { status: caso.recusa, rejectReason: '   ' })).toContain(
      'Informe o motivo da recusa.',
    );
  });

  it('recusa motivo que não é texto', async () => {
    expect(await mensagens(caso, { status: caso.recusa, rejectReason: 123 })).toContain(
      'O motivo da recusa deve ser um texto.',
    );
  });

  it('aceita a recusa com motivo, já aparado', async () => {
    const corpo = { status: caso.recusa, rejectReason: '  Sem disponibilidade.  ' };

    expect(await mensagens(caso, corpo)).toEqual([]);
    expect(instancia(caso, corpo).rejectReason).toBe('Sem disponibilidade.');
  });

  it('não exige motivo quando a resposta é aprovação', async () => {
    expect(await mensagens(caso, { status: caso.aprova })).toEqual([]);
  });

  it('não reclama de motivo mandado numa aprovação', async () => {
    // O `@ValidateIf` solta o campo fora da recusa. O serviço ignora o valor,
    // então mandar não causa dano — e recusar aqui seria rigor sem ganho.
    expect(await mensagens(caso, { status: caso.aprova, rejectReason: 'qualquer' })).toEqual([]);
  });

  it('não limita o tamanho do motivo', async () => {
    // A coluna é LongText, igual ao `cancelReason`. Um `@MaxLength` fazia o
    // caso mais comum — motivo omitido — responder também "deve ter no máximo
    // N caracteres", que não explica nada a quem esqueceu de preencher.
    const corpo = { status: caso.recusa, rejectReason: 'x'.repeat(5000) };

    expect(await mensagens(caso, corpo)).toEqual([]);
  });
});
