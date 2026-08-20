import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';

describe('WebhooksController', () => {
  let app: INestApplication;
  const handleMercadoPagoNotification = jest.fn().mockResolvedValue(undefined);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [WebhooksController],
      providers: [
        {
          provide: WebhooksService,
          useValue: { handleMercadoPagoNotification },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    handleMercadoPagoNotification.mockClear();
  });

  it('recebe a rota real do webhook e devolve confirmação em português', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/mercado-pago')
      .set('x-signature', 'assinatura')
      .set('x-request-id', 'requisicao')
      .send({ type: 'payment', data: { id: '123456789' } })
      .expect(200)
      .expect({ received: true });

    expect(handleMercadoPagoNotification).toHaveBeenCalledWith(
      { type: 'payment', data: { id: '123456789' } },
      {},
      'assinatura',
      'requisicao',
    );
  });

  it('mantém resposta 200 para payload vazio', async () => {
    await request(app.getHttpServer())
      .post('/webhooks/mercado-pago')
      .send({})
      .expect(200)
      .expect({ received: true });

    expect(handleMercadoPagoNotification).toHaveBeenCalledWith({}, {}, undefined, undefined);
  });
});
