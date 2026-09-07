-- Valor retido pela plataforma no split, por pagamento.
--
-- Sem esta coluna o lançamento financeiro creditava o valor BRUTO ao recebedor,
-- enquanto o Mercado Pago já havia descontado a comissão na origem. O saldo
-- exibido ficava maior que o dinheiro que de fato entrou na conta do vendedor,
-- em todos os fluxos com split.
--
-- Nulo em pagamento sem split — o que inclui todos os anteriores a esta
-- migration, e por isso a coluna é opcional em vez de ter default zero: zero
-- afirmaria que não houve taxa, e o correto para o histórico é "não se sabe".
ALTER TABLE `payments`
  ADD COLUMN `platformFeeAmount` DECIMAL(10, 2) NULL AFTER `mpPaymentId`;
