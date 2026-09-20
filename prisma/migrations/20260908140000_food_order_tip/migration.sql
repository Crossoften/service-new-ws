-- Gorjeta ao entregador.
--
-- Entra no total cobrado do cliente e vai inteira para o entregador: a
-- plataforma a retém no split junto com o frete, e a repassa na entrega. Não há
-- comissão sobre gorjeta — o dinheiro é do entregador, não receita da venda.
--
-- Default zero, e não nulo: gorjeta ausente e gorjeta de zero são a mesma coisa
-- economicamente, e o default evita nulo no meio das somas de total.
ALTER TABLE `food_orders`
  ADD COLUMN `tip` DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER `deliveryFee`;
