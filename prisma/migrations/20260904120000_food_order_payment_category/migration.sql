-- Categoria de lançamento financeiro para pagamento de pedido de delivery.
--
-- `PaymentReferenceTypeEnum` já tinha `FoodOrder` desde a criação do enum, mas
-- nenhum pagamento era criado com esse tipo e o webhook não tinha ramo para
-- ele. Sem uma categoria própria, o lançamento do pedido teria de ser gravado
-- sob a categoria de outro fluxo, o que inviabilizaria qualquer relatório
-- separado por origem de receita.
ALTER TABLE `financial_transactions`
  MODIFY `category` ENUM(
    'WorkPayment',
    'CommercialTransaction',
    'FoodOrderPayment',
    'Subscription',
    'Fee',
    'Withdrawal',
    'Refund',
    'Adjustment',
    'DeliveryPayout',
    'ReferralCommission'
  ) NOT NULL;
