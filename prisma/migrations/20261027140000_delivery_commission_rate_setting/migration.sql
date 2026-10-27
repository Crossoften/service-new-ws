-- Percentual do delivery sai do código e passa a ser configurável pelo admin.
--
-- NOT NULL com DEFAULT: a linha de configuração é única (id = 1) e pode já
-- existir, então a coluna precisa nascer com valor. 20 é a taxa que estava
-- fixa em `DEFAULT_COMMISSION_RATE`, de modo que a migration não muda o que
-- nenhum restaurante paga hoje — só move de onde o número vem.
ALTER TABLE `platform_settings`
  ADD COLUMN `deliveryCommissionRate` DECIMAL(5, 2) NOT NULL DEFAULT 20.00;
