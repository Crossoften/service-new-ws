import { Payment, Prisma } from '@prisma/client';

import { FinancialTransactionCategoryEnum } from '../works/enums/financial-transaction-category.enum';
import { FinancialTransactionTypeEnum } from '../works/enums/financial-transaction-type.enum';
import { PaymentReferenceTypeEnum } from '../works/enums/payment-reference-type.enum';
import { PaymentStatusEnum } from '../works/enums/payment-status.enum';
import { WebhooksService } from './webhooks.service';

const PAGAMENTO = {
  id: 5,
  amount: new Prisma.Decimal('100.00'),
  payerId: 10,
  receiverId: 20,
  referenceType: PaymentReferenceTypeEnum.Work,
  referenceId: 3,
  platformFeeAmount: new Prisma.Decimal('20.00'),
} as unknown as Payment;

const PAGO_EM = new Date('2026-09-04T12:00:00Z');

/**
 * `feeTransaction` é privado porque é detalhe de como o webhook monta o razão.
 * O comportamento sob teste é o do lançamento, não o da API pública.
 */
function feeTransaction(pagamento: Payment) {
  const service = new WebhooksService({} as never, {} as never, { notifyUser: jest.fn() } as never);

  return (
    service as unknown as {
      feeTransaction: (p: Payment, d: Date, s: string) => Record<string, unknown>[];
    }
  ).feeTransaction(pagamento, PAGO_EM, 'Taxa da plataforma sobre o trabalho #3');
}

describe('WebhooksService — taxa da plataforma no razão', () => {
  it('lança a taxa como débito do recebedor, não do pagador', () => {
    const [lancamento] = feeTransaction(PAGAMENTO);

    expect(lancamento).toMatchObject({
      type: FinancialTransactionTypeEnum.Debit,
      category: FinancialTransactionCategoryEnum.Fee,
      status: PaymentStatusEnum.Paid,
      userId: 20,
      paymentId: 5,
    });
  });

  it('usa o valor retido, não o valor da venda', () => {
    const [lancamento] = feeTransaction(PAGAMENTO);

    expect(Number(lancamento.amount)).toBe(20);
  });

  it('deixa o saldo do recebedor no líquido: crédito bruto menos a taxa', () => {
    const [lancamento] = feeTransaction(PAGAMENTO);
    const credito = Number(PAGAMENTO.amount);

    // O saldo é calculado como soma de créditos menos soma de débitos, então o
    // par (crédito de 100, débito de 20) resulta nos 80 que de fato entraram.
    expect(credito - Number(lancamento.amount)).toBe(80);
  });

  it('carimba a mesma data do pagamento, para cair na mesma competência', () => {
    const [lancamento] = feeTransaction(PAGAMENTO);

    expect(lancamento.availableAt).toBe(PAGO_EM);
  });

  it('aponta para a mesma referência do pagamento', () => {
    const [lancamento] = feeTransaction(PAGAMENTO);

    expect(lancamento).toMatchObject({
      referenceType: PaymentReferenceTypeEnum.Work,
      referenceId: 3,
    });
  });

  it('não lança nada quando o pagamento não teve split', () => {
    expect(feeTransaction({ ...PAGAMENTO, platformFeeAmount: null } as Payment)).toEqual([]);
  });

  it('não lança nada quando a taxa retida foi zero', () => {
    expect(
      feeTransaction({ ...PAGAMENTO, platformFeeAmount: new Prisma.Decimal(0) } as Payment),
    ).toEqual([]);
  });

  it('ignora valor negativo em vez de creditar o vendedor por engano', () => {
    expect(
      feeTransaction({ ...PAGAMENTO, platformFeeAmount: new Prisma.Decimal('-5') } as Payment),
    ).toEqual([]);
  });
});
