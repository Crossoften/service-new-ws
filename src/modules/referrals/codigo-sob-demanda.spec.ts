import { PrismaService } from '@database/PrismaService';
import { User } from '@prisma/client';

import { ReferralsService } from './referrals.service';

/**
 * O cadastro gera o código de indicação, mas conta criada por outro caminho —
 * seed, carga, importação — nasce com a coluna nula. Era o caso da conta de
 * exemplo `influencer one`, e a tela "Meu link" do app ficava vazia sem erro
 * nenhum que explicasse.
 */
function build(opcoes: { codigoAtual: string | null; gravou?: boolean; codigoDeOutro?: string }) {
  const updateMany = jest.fn().mockResolvedValue({ count: opcoes.gravou === false ? 0 : 1 });
  const findUnique = jest
    .fn()
    .mockResolvedValue({ referralCode: opcoes.codigoDeOutro ?? 'outro-0000000000000000' });

  const prisma = {
    user: { updateMany, findUnique },
    referral: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
      aggregate: jest.fn().mockResolvedValue({ _sum: { commissionAmount: null } }),
    },
    platformSettings: { findUnique: jest.fn().mockResolvedValue(null) },
    $queryRaw: jest.fn().mockResolvedValue([]),
  } as unknown as PrismaService;

  const service = new ReferralsService(prisma);
  const user = { id: 7, name: 'Maria Silva', referralCode: opcoes.codigoAtual } as User;

  return { service, user, updateMany, findUnique };
}

describe('código de indicação sob demanda', () => {
  it('devolve o código já gravado, sem tocar no banco', async () => {
    const { service, user, updateMany } = build({ codigoAtual: 'maria-abcdef0123456789' });

    const resposta = await service.findMySummary(user);

    expect(resposta.referralCode).toBe('maria-abcdef0123456789');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('gera e grava quando o influencer está sem código', async () => {
    const { service, user, updateMany } = build({ codigoAtual: null });

    const resposta = await service.findMySummary(user);

    expect(resposta.referralCode).toMatch(/^maria-[0-9a-f]{16}$/);
    expect(updateMany.mock.calls[0][0].data.referralCode).toBe(resposta.referralCode);
  });

  it('grava só se a coluna ainda estiver nula', async () => {
    // Condição no `where`: sem ela, duas requisições simultâneas gerariam dois
    // códigos e a segunda sobrescreveria a primeira — link já compartilhado
    // deixaria de funcionar.
    const { service, user, updateMany } = build({ codigoAtual: null });

    await service.findMySummary(user);

    expect(updateMany.mock.calls[0][0].where).toEqual({ id: 7, referralCode: null });
  });

  it('devolve o código do vencedor quando outra requisição gravou primeiro', async () => {
    const { service, user } = build({
      codigoAtual: null,
      gravou: false,
      codigoDeOutro: 'maria-1111111111111111',
    });

    const resposta = await service.findMySummary(user);

    expect(resposta.referralCode).toBe('maria-1111111111111111');
  });

  it('vale também na listagem de indicados, não só no resumo', async () => {
    const { service, user, updateMany } = build({ codigoAtual: null });

    const resposta = await service.findMyReferrals(user);

    expect(resposta.referralCode).toMatch(/^maria-[0-9a-f]{16}$/);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });
});
