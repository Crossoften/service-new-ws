import { PrismaService } from '@database/PrismaService';
import { Prisma, Status } from '@prisma/client';

import { AdminUsersService } from './admin-users.service';

const USUARIO = {
  id: 7,
  name: 'Rafael Lima',
  email: 'rafael@email.com',
  phone: '+5534998701109',
  document: '123.456.789-10',
  biography: 'Pintor residencial há 12 anos.',
  birthDate: new Date('1990-05-20T00:00:00.000Z'),
  status: Status.Active,
  fileUrl: null,
  fileKey: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-02T00:00:00.000Z'),
  referralCode: 'RAF123',
  deliveryCommissionRate: new Prisma.Decimal('15.50'),
};

function build(usuario: Record<string, unknown> | null = USUARIO) {
  const findFirst = jest.fn().mockResolvedValue(usuario);
  const count = jest.fn().mockResolvedValue(0);

  const prisma = {
    user: { findFirst },
    service: { count },
  } as unknown as PrismaService;

  return { service: new AdminUsersService(prisma), findFirst };
}

describe('AdminUsersService.findById', () => {
  /**
   * A tela de edição do admin preenche o formulário com o que esta rota
   * devolve. Sem `biography` aqui, o campo abriria vazio e salvar apagaria o
   * texto que estivesse gravado — perda de dado sem nenhum erro aparente.
   */
  it('devolve a biografia, que a tela de edição precisa para preencher o campo', async () => {
    const { service } = build();

    const resposta = await service.findById(7);

    expect(resposta.biography).toBe('Pintor residencial há 12 anos.');
  });

  it('pede a biografia ao banco explicitamente', async () => {
    const { service, findFirst } = build();

    await service.findById(7);

    expect(findFirst.mock.calls[0][0].select).toMatchObject({ biography: true });
  });

  /**
   * `biography` entra no select DESTE método, não no `userSelect` — que também
   * serve a listagem. A coluna é `LongText`, e trazê-la por linha numa lista
   * paginada é custo puro, já que a listagem não exibe o campo.
   */
  it('não contamina o select compartilhado com a listagem', async () => {
    const { service, findFirst } = build();

    await service.findById(7);

    const compartilhado = (service as unknown as { userSelect: Record<string, boolean> })
      .userSelect;

    expect(compartilhado).not.toHaveProperty('biography');
    expect(findFirst.mock.calls[0][0].select).toMatchObject({ biography: true });
  });

  it('devolve undefined quando não há biografia gravada', async () => {
    const { service } = build({ ...USUARIO, biography: null });

    const resposta = await service.findById(7);

    expect(resposta.biography).toBeUndefined();
  });
});

/**
 * Mesmo problema da biografia, encontrado no mesmo lugar: o `PATCH` aceitava
 * `deliveryCommissionRate` e o `GET` não devolvia. A tela de edição abriria o
 * campo em branco sem saber o que está gravado.
 */
describe('AdminUsersService.findById — comissão do delivery', () => {
  it('pede a comissão ao banco explicitamente', async () => {
    const { service, findFirst } = build();

    await service.findById(7);

    expect(findFirst.mock.calls[0][0].select).toMatchObject({ deliveryCommissionRate: true });
  });

  it('não contamina o select compartilhado com a listagem', async () => {
    const { service, findFirst } = build();

    await service.findById(7);

    const compartilhado = (service as unknown as { userSelect: Record<string, boolean> })
      .userSelect;

    expect(compartilhado).not.toHaveProperty('deliveryCommissionRate');
    expect(findFirst.mock.calls[0][0].select).toMatchObject({ deliveryCommissionRate: true });
  });

  it('converte o Decimal em número', async () => {
    const { service } = build();

    const resposta = await service.findById(7);

    expect(resposta.deliveryCommissionRate).toBe(15.5);
    expect(typeof resposta.deliveryCommissionRate).toBe('number');
  });

  it('devolve undefined quando o usuário não tem comissão própria', async () => {
    const { service } = build({ ...USUARIO, deliveryCommissionRate: null });

    const resposta = await service.findById(7);

    expect(resposta.deliveryCommissionRate).toBeUndefined();
  });

  /**
   * Zero é um valor, não uma ausência: significa comissão zerada. Tratar os
   * dois igual faria a tela mostrar o padrão da plataforma para quem tem
   * isenção, e salvar devolveria a cobrança sem ninguém pedir.
   */
  it('mantém zero como zero, não como ausente', async () => {
    const { service } = build({ ...USUARIO, deliveryCommissionRate: new Prisma.Decimal('0') });

    const resposta = await service.findById(7);

    expect(resposta.deliveryCommissionRate).toBe(0);
  });
});
