import { PrismaService } from '@database/PrismaService';
import { Prisma, User, UserProfileType } from '@prisma/client';

import { PlatformSettingsService } from '../platform-settings/platform-settings.service';
import { WarrantyStatsService } from '../works/warranty-stats.service';
import { ProfileService } from './profile.service';

const TAXA_DO_PAINEL = 17;

/**
 * O app precisa dizer ao fornecedor qual percentual a plataforma retém, na tela
 * de criação do restaurante — "além da assinatura, há X% por pedido".
 *
 * Naquele momento ele ainda não tem restaurante, então o painel do fornecedor
 * (`GET /restaurants/me/payouts`) responde 404 e não serve. O perfil passa a
 * devolver o percentual já resolvido, para a tela não reimplementar a
 * precedência entre taxa própria e taxa do painel — nem divergir dela.
 */
function build(opcoes: {
  profileType: UserProfileType;
  taxaPropria?: string | null;
  /** `'parcial'` grava o id sem o token — vínculo pela metade. */
  mpVinculado?: boolean | 'parcial';
}) {
  const lerPainel = jest.fn().mockResolvedValue(TAXA_DO_PAINEL);

  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue({
        id: 9,
        name: 'Fornecedor',
        email: 'f@f.com',
        document: null,
        phone: null,
        biography: null,
        role: 'User',
        profileType: opcoes.profileType,
        status: 'Active',
        fileUrl: null,
        fileKey: null,
        referralCode: null,
        birthDate: null,
        commissionRate: null,
        deliveryCommissionRate:
          opcoes.taxaPropria == null ? null : new Prisma.Decimal(opcoes.taxaPropria),
        isAvailableForDelivery: true,
        mpUserId: opcoes.mpVinculado === false ? null : 'MP-123',
        mpAccessToken:
          opcoes.mpVinculado === false || opcoes.mpVinculado === 'parcial' ? null : 'cifrado',
        billingType: null,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
        socialMedias: [],
        address: null,
      }),
    },
  } as unknown as PrismaService;

  const service = new ProfileService(
    prisma,
    { statsFor: jest.fn().mockResolvedValue(undefined) } as unknown as WarrantyStatsService,
    { deliveryCommissionRate: lerPainel } as unknown as PlatformSettingsService,
  );

  return { service, lerPainel };
}

const FORNECEDOR = { id: 9 } as User;

describe('taxa do delivery no perfil', () => {
  it('devolve a taxa do painel quando o fornecedor não tem taxa própria', async () => {
    const { service } = build({ profileType: UserProfileType.Supplier, taxaPropria: null });

    const perfil = await service.findMine(FORNECEDOR);

    expect(perfil.deliveryCommissionRate).toBe(TAXA_DO_PAINEL);
  });

  it('devolve a taxa própria do fornecedor quando existe', async () => {
    const { service } = build({ profileType: UserProfileType.Supplier, taxaPropria: '12.5' });

    const perfil = await service.findMine(FORNECEDOR);

    expect(perfil.deliveryCommissionRate).toBe(12.5);
  });

  it('devolve 0 quando o admin cadastrou 0 para aquele fornecedor', async () => {
    // Zero é decisão do admin — "este restaurante não paga" — e não pode cair
    // na taxa do painel. A tela mostra 0%, que é a verdade.
    const { service } = build({ profileType: UserProfileType.Supplier, taxaPropria: '0' });

    const perfil = await service.findMine(FORNECEDOR);

    expect(perfil.deliveryCommissionRate).toBe(0);
  });

  it.each([UserProfileType.Client, UserProfileType.Delivery, UserProfileType.Influencer])(
    'omite o campo no perfil de %s',
    async (profileType) => {
      // Delivery é vertical de fornecedor; número aqui seria sem significado.
      const { service } = build({ profileType, taxaPropria: '12.5' });

      const perfil = await service.findMine(FORNECEDOR);

      expect(perfil.deliveryCommissionRate).toBeUndefined();
    },
  );

  it('não consulta o painel para quem não é fornecedor', async () => {
    const { service, lerPainel } = build({
      profileType: UserProfileType.Client,
      taxaPropria: null,
    });

    await service.findMine(FORNECEDOR);

    expect(lerPainel).not.toHaveBeenCalled();
  });

  it('pede a coluna no select, senão o valor nunca chega ao mapeamento', async () => {
    const { service } = build({ profileType: UserProfileType.Supplier, taxaPropria: null });
    const prismaMock = (service as unknown as { prisma: { user: { findUnique: jest.Mock } } })
      .prisma;

    await service.findMine(FORNECEDOR);

    expect(prismaMock.user.findUnique.mock.calls[0][0].select.deliveryCommissionRate).toBe(true);
  });
});

describe('disponibilidade do entregador no perfil', () => {
  // A home do entregador já lê este endpoint: o estado inicial do toggle vem
  // daqui, sem uma segunda chamada só para descobri-lo.
  it('devolve a disponibilidade no perfil de entregador', async () => {
    const { service } = build({ profileType: UserProfileType.Delivery, taxaPropria: null });

    const perfil = await service.findMine(FORNECEDOR);

    expect(perfil.isAvailable).toBe(true);
  });

  it.each([UserProfileType.Client, UserProfileType.Supplier, UserProfileType.Influencer])(
    'omite a disponibilidade no perfil de %s',
    async (profileType) => {
      const { service } = build({ profileType, taxaPropria: null });

      const perfil = await service.findMine(FORNECEDOR);

      expect(perfil.isAvailable).toBeUndefined();
    },
  );

  it('pede a coluna no select', async () => {
    const { service } = build({ profileType: UserProfileType.Delivery, taxaPropria: null });
    const prismaMock = (service as unknown as { prisma: { user: { findUnique: jest.Mock } } })
      .prisma;

    await service.findMine(FORNECEDOR);

    expect(prismaMock.user.findUnique.mock.calls[0][0].select.isAvailableForDelivery).toBe(true);
  });
});

/**
 * Sem conta do Mercado Pago vinculada, o cliente não consegue pagar nada deste
 * fornecedor: o pagamento usa split na origem e precisa da conta do vendedor.
 * O erro, porém, aparecia do lado do cliente — o fornecedor não tinha como
 * saber antes de perder a venda. O perfil passa a dizer.
 */
describe('pendência de conta para receber, no perfil', () => {
  it('diz que está vinculado quando há id e token', async () => {
    const { service } = build({ profileType: UserProfileType.Supplier, mpVinculado: true });

    expect((await service.findMine(FORNECEDOR)).mercadoPagoLinked).toBe(true);
  });

  it('diz que falta vincular quando as colunas estão vazias', async () => {
    const { service } = build({ profileType: UserProfileType.Supplier, mpVinculado: false });

    expect((await service.findMine(FORNECEDOR)).mercadoPagoLinked).toBe(false);
  });

  it('exige os dois campos: id sem token não é vínculo', async () => {
    // É a mesma condição do `verifySellerLinked` que barra o pagamento. Olhar
    // só o `mpUserId` faria o perfil dizer "tudo certo" e o cliente levar 400.
    const { service } = build({ profileType: UserProfileType.Supplier, mpVinculado: 'parcial' });

    expect((await service.findMine(FORNECEDOR)).mercadoPagoLinked).toBe(false);
  });

  it.each([UserProfileType.Client, UserProfileType.Delivery, UserProfileType.Influencer])(
    'omite a pendência no perfil de %s',
    async (profileType) => {
      const { service } = build({ profileType, mpVinculado: false });

      expect((await service.findMine(FORNECEDOR)).mercadoPagoLinked).toBeUndefined();
    },
  );

  it('nunca devolve o token, só o booleano', async () => {
    const { service } = build({ profileType: UserProfileType.Supplier, mpVinculado: true });

    const perfil = JSON.stringify(await service.findMine(FORNECEDOR));

    expect(perfil).not.toContain('cifrado');
    expect(perfil).not.toContain('MP-123');
  });
});
