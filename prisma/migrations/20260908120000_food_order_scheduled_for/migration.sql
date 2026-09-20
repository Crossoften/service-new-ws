-- Horário em que o cliente quer receber o pedido.
--
-- Nulo é o pedido comum, para agora — o que inclui todos os já existentes.
-- Não há mudança de status envolvida: quem move o pedido pela cozinha continua
-- sendo o restaurante, que usa este campo para separar o que é para já do que
-- é para depois.
ALTER TABLE `food_orders`
  ADD COLUMN `scheduledFor` DATETIME(3) NULL AFTER `paymentStatus`;
