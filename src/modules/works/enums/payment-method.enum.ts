// Espelho do enum do Prisma. Mantenha os dois em sincronia: este é o que
// alimenta a documentação do Swagger nos módulos que não importam de
// `@prisma/client` diretamente.
export enum PaymentMethodEnum {
  CreditCard = 'CreditCard',
  DebitCard = 'DebitCard',
  Pix = 'Pix',
  BankSlip = 'BankSlip',
  Cash = 'Cash',
}
