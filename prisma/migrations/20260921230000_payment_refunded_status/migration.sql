-- Estorno ganha status próprio.
--
-- O webhook do Mercado Pago só tratava `approved`, `rejected` e `cancelled`.
-- `refunded` e `charged_back` caíam no vazio: a função retornava sem fazer
-- nada, e o pagamento continuava marcado como pago para sempre.
--
-- Isso era inconsistência de razão até a carteira do entregador existir. Com
-- ela, virou dinheiro saindo: o crédito do frete continuava em aberto, o admin
-- via no `/pending` e pagava o Pix, e a plataforma perdia frete, gorjeta e
-- itens de um pedido que o cliente recebeu de volta.
--
-- `Cancelled` não servia para representar isso. Cancelado é o que nunca entrou;
-- estornado é o que entrou e voltou — e só no segundo caso existe dinheiro já
-- creditado a alguém.
--
-- Aditivo: o enum só cresce, nenhuma linha existente muda de valor.
ALTER TABLE `payments`
  MODIFY `status` ENUM('Pending', 'Paid', 'Cancelled', 'Refunded') NOT NULL DEFAULT 'Pending';

ALTER TABLE `financial_transactions`
  MODIFY `status` ENUM('Pending', 'Paid', 'Cancelled', 'Refunded') NOT NULL DEFAULT 'Paid';

ALTER TABLE `food_orders`
  MODIFY `paymentStatus` ENUM('Pending', 'Paid', 'Cancelled', 'Refunded') NOT NULL DEFAULT 'Pending';
