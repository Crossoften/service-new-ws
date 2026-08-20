import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { WebhooksController } from '../src/modules/webhooks/webhooks.controller';
import { WebhooksService } from '../src/modules/webhooks/webhooks.service';

describe('Webhook do Mercado Pago (e2e)', () => {
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
    app.setGlobalPrefix('v1');
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('processa a rota pública real com o prefixo da API', async () => {
    await request(app.getHttpServer())
      .post('/v1/webhooks/mercado-pago')
      .send({ type: 'payment', data: { id: '123456789' } })
      .expect(200)
      .expect({ received: true });

    expect(handleMercadoPagoNotification).toHaveBeenCalledWith(
      { type: 'payment', data: { id: '123456789' } },
      {},
      undefined,
      undefined,
    );
  });
});
