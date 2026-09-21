import { PaymentMethodEnum } from '@prisma/client';

import { isSettledOffPlatform } from './card-machine';

describe('isSettledOffPlatform — o dinheiro passa pela plataforma?', () => {
  describe('sem maquininha própria', () => {
    it('só o dinheiro fica fora', () => {
      expect(isSettledOffPlatform(PaymentMethodEnum.Cash, false)).toBe(true);
      expect(isSettledOffPlatform(PaymentMethodEnum.CreditCard, false)).toBe(false);
      expect(isSettledOffPlatform(PaymentMethodEnum.DebitCard, false)).toBe(false);
      expect(isSettledOffPlatform(PaymentMethodEnum.Pix, false)).toBe(false);
      expect(isSettledOffPlatform(PaymentMethodEnum.BankSlip, false)).toBe(false);
    });
  });

  describe('com maquininha própria', () => {
    it('tira crédito e débito do gateway', () => {
      expect(isSettledOffPlatform(PaymentMethodEnum.CreditCard, true)).toBe(true);
      expect(isSettledOffPlatform(PaymentMethodEnum.DebitCard, true)).toBe(true);
    });

    it('mantém Pix e boleto no gateway: a maquininha é de cartão', () => {
      expect(isSettledOffPlatform(PaymentMethodEnum.Pix, true)).toBe(false);
      expect(isSettledOffPlatform(PaymentMethodEnum.BankSlip, true)).toBe(false);
    });

    it('dinheiro continua fora, como sempre esteve', () => {
      expect(isSettledOffPlatform(PaymentMethodEnum.Cash, true)).toBe(true);
    });
  });
});
