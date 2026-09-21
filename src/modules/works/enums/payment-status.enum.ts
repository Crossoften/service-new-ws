export enum PaymentStatusEnum {
  Pending = 'Pending',
  Paid = 'Paid',
  Cancelled = 'Cancelled',
  /** Pago e devolvido depois: estorno ou chargeback. */
  Refunded = 'Refunded',
}
