import { PrismaService } from '@database/PrismaService';
import { DeliveryAssignmentStatusEnum, User } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { DeliveriesGateway } from './deliveries.gateway';
import { DeliveriesService } from './deliveries.service';
import { QueryDeliveryDto } from './dto/query-delivery.dto';
import { CourierUnavailableException } from './exceptions/courier-unavailable.exception';

const ENTREGADOR = { id: 42 } as User;

/**
 * A home do entregador tinha um toggle Ativo/Inativo que só mexia em estado
 * local: ele marcava "Inativo" achando ter saído de operação, e as corridas
 * continuavam chegando, porque o back nunca ficava sabendo.
 *
 * A corrida nasce com `courierId: null` e fica numa fila igual para todos — não
 * há disparo para entregadores —, então filtrar a fila é o que de fato tira
 * alguém da operação.
 */
function build(opcoes: { disponivel: boolean; corridasNaFila?: number }) {
  const lerUsuario = jest.fn().mockResolvedValue({ isAvailableForDelivery: opcoes.disponivel });
  const atualizarUsuario = jest.fn(
    (args: { where: { id: number }; data: { isAvailableForDelivery: boolean } }) =>
      Promise.resolve({ isAvailableForDelivery: args.data.isAvailableForDelivery }),
  );
  const buscarCorridas = jest.fn().mockResolvedValue([]);
  const contarCorridas = jest.fn().mockResolvedValue(opcoes.corridasNaFila ?? 0);
  const atualizarCorrida = jest.fn();

  const prisma = {
    user: { findUnique: lerUsuario, update: atualizarUsuario },
    deliveryAssignment: {
      findMany: buscarCorridas,
      count: contarCorridas,
      update: atualizarCorrida,
      findUnique: jest.fn().mockResolvedValue({
        id: 7,
        status: DeliveryAssignmentStatusEnum.Pending,
        courierId: null,
        foodOrder: { restaurant: { userId: 9 }, customer: { id: 1 } },
      }),
    },
  } as unknown as PrismaService;

  const service = new DeliveriesService(
    prisma,
    { emitStatusChange: jest.fn() } as unknown as DeliveriesGateway,
    {} as NotificationsService,
  );

  jest.spyOn(service, 'findById').mockResolvedValue({ id: 7 } as never);

  return { service, lerUsuario, atualizarUsuario, buscarCorridas, atualizarCorrida };
}

const SEM_FILTRO = {} as QueryDeliveryDto;

describe('disponibilidade do entregador', () => {
  describe('fila de corridas', () => {
    it('devolve fila vazia para quem está indisponível', async () => {
      const { service, buscarCorridas } = build({ disponivel: false, corridasNaFila: 5 });

      const resposta = await service.findAvailable(ENTREGADOR, SEM_FILTRO);

      expect(resposta.deliveries).toEqual([]);
      expect(resposta.totalRecords).toBe(0);
      // Nem consulta as corridas: indisponível não tem fila a montar.
      expect(buscarCorridas).not.toHaveBeenCalled();
    });

    it('devolve página vazia coerente, não erro', async () => {
      // A tela é uma listagem; um 403 apareceria como falha de carregamento em
      // vez do estado que o próprio entregador escolheu.
      const { service } = build({ disponivel: false });

      const resposta = await service.findAvailable(ENTREGADOR, SEM_FILTRO);

      expect(resposta.totalPages).toBe(1);
      expect(resposta.currentPage).toBe(1);
    });

    it('monta a fila normalmente para quem está disponível', async () => {
      const { service, buscarCorridas } = build({ disponivel: true });

      await service.findAvailable(ENTREGADOR, SEM_FILTRO);

      expect(buscarCorridas).toHaveBeenCalled();
      expect(buscarCorridas.mock.calls[0][0].where).toEqual({
        status: DeliveryAssignmentStatusEnum.Pending,
        courierId: null,
      });
    });

    it('nega a fila quando o registro do entregador não existe', async () => {
      // Caminho estreito — conta apagada no meio da sessão, token ainda válido
      // por 360 dias. O padrão seguro é negar: liberar por ausência de dado
      // deixaria uma conta que não existe mais puxando corrida.
      const { service, buscarCorridas } = build({ disponivel: true });
      const prisma = (service as unknown as { prisma: { user: { findUnique: jest.Mock } } }).prisma;
      prisma.user.findUnique.mockResolvedValue(null);

      const resposta = await service.findAvailable(ENTREGADOR, SEM_FILTRO);

      expect(resposta.totalRecords).toBe(0);
      expect(buscarCorridas).not.toHaveBeenCalled();
    });

    it('lê a disponibilidade do banco, não do token', async () => {
      // O token vale 360 dias e é montado na autenticação: confiar nele faria a
      // alternância do toggle só valer na requisição seguinte ao login.
      const { service, lerUsuario } = build({ disponivel: true });

      await service.findAvailable(ENTREGADOR, SEM_FILTRO);

      expect(lerUsuario.mock.calls[0][0]).toEqual({
        where: { id: ENTREGADOR.id },
        select: { isAvailableForDelivery: true },
      });
    });
  });

  describe('aceite de corrida', () => {
    it('recusa aceite de quem está indisponível', async () => {
      // Sem esta trava a disponibilidade seria cosmética: bastaria ter a lista
      // carregada antes de ficar indisponível para seguir aceitando.
      const { service, atualizarCorrida } = build({ disponivel: false });

      await expect(service.accept(ENTREGADOR, 7)).rejects.toBeInstanceOf(
        CourierUnavailableException,
      );
      expect(atualizarCorrida).not.toHaveBeenCalled();
    });

    it('responde 409, com caminho de saída na mensagem', async () => {
      const { service } = build({ disponivel: false });

      await expect(service.accept(ENTREGADOR, 7)).rejects.toMatchObject({ status: 409 });
      await expect(service.accept(ENTREGADOR, 7)).rejects.toThrow(/Ative sua disponibilidade/);
    });

    it('deixa aceitar quem está disponível', async () => {
      const { service, atualizarCorrida } = build({ disponivel: true });

      await service.accept(ENTREGADOR, 7);

      expect(atualizarCorrida.mock.calls[0][0].data.courierId).toBe(ENTREGADOR.id);
    });
  });

  describe('alternar a disponibilidade', () => {
    it('grava e devolve o estado novo', async () => {
      const { service, atualizarUsuario } = build({ disponivel: true });

      const resposta = await service.setAvailability(ENTREGADOR, { isAvailable: false });

      expect(atualizarUsuario.mock.calls[0][0].data).toEqual({ isAvailableForDelivery: false });
      expect(resposta).toEqual({ isAvailable: false });
    });

    it('devolve o estado depois da alteração, para a tela não reconsultar', async () => {
      const { service } = build({ disponivel: false });

      expect(await service.setAvailability(ENTREGADOR, { isAvailable: true })).toEqual({
        isAvailable: true,
      });
    });

    it('devolve o que ficou gravado, não o que foi pedido', async () => {
      // O banco é a fonte: se algum dia um default ou gatilho mudar o valor na
      // gravação, a tela precisa ver o que ficou, não o que ela mandou.
      const { service } = build({ disponivel: true });
      const prisma = (service as unknown as { prisma: { user: { update: jest.Mock } } }).prisma;
      prisma.user.update.mockResolvedValue({ isAvailableForDelivery: true });

      expect(await service.setAvailability(ENTREGADOR, { isAvailable: false })).toEqual({
        isAvailable: true,
      });
    });

    it('altera só o próprio registro', async () => {
      const { service, atualizarUsuario } = build({ disponivel: true });

      await service.setAvailability(ENTREGADOR, { isAvailable: false });

      expect(atualizarUsuario.mock.calls[0][0].where).toEqual({ id: ENTREGADOR.id });
    });
  });
});
