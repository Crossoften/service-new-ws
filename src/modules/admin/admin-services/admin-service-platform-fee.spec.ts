import { PrismaService } from '@database/PrismaService';

import { AdminServicesService } from './admin-services.service';

// A plataforma não retém nada de serviço. Estes testes fixam isso no contrato
// que o admin lê: se alguém reintroduzir o cálculo por `platformFeeRate`, o
// relatório volta a anunciar uma retenção que não acontece no pagamento.
function build(platformFeeRate: number) {
  const servico = {
    id: 3,
    name: 'Pintura',
    type: 'Service',
    price: 1000,
    isActive: true,
    imageUrl: null,
    description: null,
    registrationCode: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    category: { id: 1, name: 'Pintor', iconUrl: null, platformFeeRate },
    user: { id: 2, name: 'Fornecedor', email: 'f@f.com', phone: null, fileUrl: null },
    _count: { works: 4 },
  };

  const prisma = {
    service: {
      findMany: jest.fn().mockResolvedValue([servico]),
      count: jest.fn().mockResolvedValue(1),
      findUnique: jest.fn().mockResolvedValue(servico),
    },
    review: { groupBy: jest.fn().mockResolvedValue([]) },
    serviceCategory: {
      findMany: jest.fn().mockResolvedValue([{ name: 'Pintor', platformFeeRate, sortOrder: 1 }]),
    },
  } as unknown as PrismaService;

  return new AdminServicesService(prisma);
}

// A listagem devolve `platformValueReceived` e `category.platformFeeRate` sem
// que o DTO os declare — por isso não aparecem no Swagger e o tipo de retorno
// não os expõe. A lacuna é anterior a esta mudança e está anotada no relatório;
// aqui o teste lê a forma real da resposta.
interface ItemReal {
  platformValueReceived: number;
  category: { platformFeeRate: number };
}

describe('adminServices — retenção da plataforma em serviço', () => {
  it.each([0, 10, 35])('não retém nada da listagem, com taxa %i na categoria', async (taxa) => {
    const service = build(taxa);

    const resposta = await service.findAll({} as never);

    expect((resposta.services[0] as unknown as ItemReal).platformValueReceived).toBe(0);
  });

  it('devolve a taxa gravada na categoria sem aplicá-la', async () => {
    // O cadastro por categoria continua previsto, então o valor gravado segue
    // visível; o que não existe mais é o desconto em cima do pagamento.
    const service = build(10);

    const resposta = await service.findAll({} as never);

    expect((resposta.services[0] as unknown as ItemReal).category.platformFeeRate).toBe(10);
  });

  it.each([0, 10, 35])('não retém nada no detalhe, com taxa %i na categoria', async (taxa) => {
    const service = build(taxa);

    const resposta = await service.findById(3);

    expect(resposta.platformValueReceived).toBe(0);
    expect(resposta.platformFeeRate).toBe(0);
  });

  it.each([0, 10, 35])('repassa 100% ao fornecedor, com taxa %i na categoria', async (taxa) => {
    const service = build(taxa);

    const resposta = await service.listPercentageProvidersByCategory({} as never);

    expect(resposta[0].providerRate).toBe(100);
  });
});
