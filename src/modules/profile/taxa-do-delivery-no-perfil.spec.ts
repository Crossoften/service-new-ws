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
function build(opcoes: { profileType: UserProfileType; taxaPropria?: string | null }) {
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
