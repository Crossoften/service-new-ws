-- Débito e dinheiro passam a ter representação própria.
--
-- Até aqui o enum tinha três valores, e `mapPaymentMethod()` gravava todo
-- pagamento no débito como `CreditCard`. Dinheiro não tinha representação
-- nenhuma: qualquer valor que o front escolhesse era falso.
--
-- Alteração puramente aditiva — nenhuma linha existente muda de valor.
--
-- ATENÇÃO à conciliação histórica: os pedidos gravados antes desta migration
-- que foram pagos no débito continuam registrados como `CreditCard`, e não há
-- como distingui-los pelo banco. O dado de origem está no Mercado Pago
-- (`mpPaymentId` na tabela `payments`), caso seja necessário reclassificar.
ALTER TABLE `food_orders`
  MODIFY `paymentMethod` ENUM('CreditCard', 'DebitCard', 'Pix', 'BankSlip', 'Cash') NOT NULL;

ALTER TABLE `payments`
  MODIFY `method` ENUM('CreditCard', 'DebitCard', 'Pix', 'BankSlip', 'Cash') NULL;
