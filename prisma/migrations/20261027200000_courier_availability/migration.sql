-- Disponibilidade operacional do entregador.
--
-- `DEFAULT TRUE` de propósito: todo entregador existente continua recebendo
-- corrida no instante do deploy. Nascer `FALSE` tiraria a base inteira de
-- operação em silêncio, e ninguém pediu para ficar offline.
ALTER TABLE `users`
  ADD COLUMN `isAvailableForDelivery` BOOLEAN NOT NULL DEFAULT TRUE;
