import { PrismaService } from '@database/PrismaService';
import { DeliveryAssignmentStatusEnum, Prisma, User } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { DeliveriesGateway } from './deliveries.gateway';
import { DeliveriesService } from './deliveries.service';

const ENTREGADOR = { id: 42 } as User;

/**
 * A tela do entregador em corrida traça a rota coleta → entrega e sobrepõe o
 * marcador vivo dele. Para isso precisa dos dois pontos, que o back-end já
 * conhecia — calcula o frete pela distância restaurante↔cliente — e não
 * expunha: as colunas existiam no `Address` e ficavam fora do `select`.
 *
 * Os três pontos saem em texto, no mesmo formato: `currentLat`/`currentLng` do
 * entregador e `latitude`/`longitude` dos dois endereços.
 */
const dec = (valor: string) => new Prisma.Decimal(valor);

function build(opcoes: { comCoordenadas: boolean }) {
  const coordenadasDoRestaurante = opcoes.comCoordenadas
    ? { latitude: dec('-23.5505199'), longitude: dec('-46.6333094') }
    : { latitude: null, longitude: null };

  const coordenadasDoCliente = opcoes.comCoordenadas
    ? { latitude: dec('-23.5614'), longitude: dec('-46.6559') }
    : { latitude: null, longitude: null };

  const findUnique = jest.fn().mockResolvedValue({
    id: 7,
    status: DeliveryAssignmentStatusEnum.OnTheWay,
    courierId: ENTREGADOR.id,
    currentLat: dec('-23.5558'),
    currentLng: dec('-46.6396'),
    locationUpdatedAt: new Date('2026-10-27T12:00:00Z'),
    acceptedAt: null,
    rejectedAt: null,
    pickedUpAt: null,
    deliveredAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-10-27T11:00:00Z'),
    updatedAt: new Date('2026-10-27T12:00:00Z'),
    foodOrder: {
      id: 70,
      status: 'OnTheWay',
      deliveryFee: dec('10.00'),
      restaurant: {
        id: 3,
        name: 'Cantina',
        userId: 9,
        address: {
          street: 'Rua da Consolação',
          neighborhood: 'Centro',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01301000',
          number: '100',
          ...coordenadasDoRestaurante,
        },
      },
      customer: { id: 1, name: 'Cliente' },
      address: {
        street: 'Alameda Santos',
        neighborhood: 'Jardins',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01419001',
        number: '500',
        ...coordenadasDoCliente,
      },
    },
  });

  const prisma = {
    deliveryAssignment: { findUnique },
  } as unknown as PrismaService;

  const service = new DeliveriesService(
    prisma,
    {} as DeliveriesGateway,
    {} as NotificationsService,
  );

  return { service, findUnique };
}

describe('rota do entregador — coordenadas de coleta e entrega', () => {
  it('devolve as coordenadas da coleta, em texto', async () => {
    const { service } = build({ comCoordenadas: true });

    const resposta = await service.findById(ENTREGADOR, 7);

    expect(resposta.foodOrder.restaurant.address?.latitude).toBe('-23.5505199');
    expect(resposta.foodOrder.restaurant.address?.longitude).toBe('-46.6333094');
  });

  it('devolve as coordenadas da entrega, em texto', async () => {
    const { service } = build({ comCoordenadas: true });

    const resposta = await service.findById(ENTREGADOR, 7);

    expect(resposta.foodOrder.deliveryAddress?.latitude).toBe('-23.5614');
    expect(resposta.foodOrder.deliveryAddress?.longitude).toBe('-46.6559');
  });

  it('mantém o endereço legível junto das coordenadas', async () => {
    // O app pediu "endereço legível, se possível": já vinha, e continua vindo.
    const { service } = build({ comCoordenadas: true });

    const resposta = await service.findById(ENTREGADOR, 7);

    expect(resposta.foodOrder.restaurant.address?.street).toBe('Rua da Consolação');
    expect(resposta.foodOrder.deliveryAddress?.number).toBe('500');
  });

  it('usa o mesmo formato do marcador vivo do entregador', async () => {
    const { service } = build({ comCoordenadas: true });

    const resposta = await service.findById(ENTREGADOR, 7);

    for (const valor of [
      resposta.currentLat,
      resposta.foodOrder.restaurant.address?.latitude,
      resposta.foodOrder.deliveryAddress?.latitude,
    ]) {
      expect(typeof valor).toBe('string');
    }
  });

  it('omite a coordenada quando o endereço não tem, em vez de inventar zero', async () => {
    // A coluna é opcional e quem preenche é o front, ao geocodificar. Endereço
    // cadastrado antes disso não tem coordenada — e `0,0` no mapa é o Atlântico.
    const { service } = build({ comCoordenadas: false });

    const resposta = await service.findById(ENTREGADOR, 7);

    expect(resposta.foodOrder.restaurant.address?.latitude).toBeUndefined();
    expect(resposta.foodOrder.deliveryAddress?.longitude).toBeUndefined();
    expect(resposta.foodOrder.restaurant.address?.city).toBe('São Paulo');
  });

  it('pede as colunas nos dois selects, senão nada chega ao mapeamento', async () => {
    const { service, findUnique } = build({ comCoordenadas: true });

    await service.findById(ENTREGADOR, 7);

    const select = findUnique.mock.calls[0][0].select;
    const coleta = select.foodOrder.select.restaurant.select.address.select;
    const entrega = select.foodOrder.select.address.select;

    expect(coleta.latitude).toBe(true);
    expect(coleta.longitude).toBe(true);
    expect(entrega.latitude).toBe(true);
    expect(entrega.longitude).toBe(true);
  });
});
