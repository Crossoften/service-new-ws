-- Faixa de tempo estimado de entrega do restaurante, em minutos.
--
-- A tela de vitrine já exibia o tempo de entrega, mas não havia campo nenhum no
-- back para alimentá-lo — o front vinha mostrando valor fixo ou nada.
--
-- Nulo significa "não informado", e a tela deve omitir o tempo em vez de exibir
-- zero: um restaurante que não configurou é diferente de um que entrega
-- instantaneamente.
ALTER TABLE `restaurants`
  ADD COLUMN `deliveryTimeMinMinutes` INT NULL AFTER `addressId`,
  ADD COLUMN `deliveryTimeMaxMinutes` INT NULL AFTER `deliveryTimeMinMinutes`;
