-- Situação do pagamento no pedido de comida.
--
-- Até aqui o pedido guardava apenas o meio de pagamento escolhido; nada
-- registrava se o dinheiro entrou. Pedidos de comida nunca criaram linha em
-- `payments`, então não havia onde olhar.
--
-- Com `Cash` no enum de meios, isso deixou de ser aceitável: dinheiro não passa
-- por gateway e alguém precisa confirmar o recebimento à mão.
ALTER TABLE `food_orders`
  ADD COLUMN `paymentStatus` ENUM('Pending', 'Paid', 'Cancelled') NOT NULL DEFAULT 'Pending',
  ADD COLUMN `paidAt` DATETIME(3) NULL,
  ADD COLUMN `paidConfirmedById` INT NULL;

CREATE INDEX `food_orders_paymentStatus_idx` ON `food_orders`(`paymentStatus`);

ALTER TABLE `food_orders`
  ADD CONSTRAINT `food_orders_paidConfirmedById_fkey`
  FOREIGN KEY (`paidConfirmedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Pedidos já entregues antes desta migration são dados como pagos: foram
-- concluídos sob a regra antiga, em que a entrega encerrava o assunto.
-- Deixá-los `Pending` criaria uma fila de cobrança falsa no primeiro relatório.
UPDATE `food_orders`
   SET `paymentStatus` = 'Paid', `paidAt` = `deliveredAt`
 WHERE `status` = 'Delivered' AND `deliveredAt` IS NOT NULL;

UPDATE `food_orders`
   SET `paymentStatus` = 'Cancelled'
 WHERE `status` = 'Cancelled';
