-- Assinatura concedida por administrador, sem pagamento.
--
-- Existe para três casos reais: cortesia a parceiro, acordo comercial, e
-- ambiente de teste — onde não há como obter assinatura ativa, já que ela nasce
-- Pending e só é ativada pelo webhook do provedor de pagamento.
--
-- `grantedById` é o que separa uma concessão de uma assinatura paga. Sem essa
-- coluna, a única pista seria o `amount` zerado, que é frágil: um plano
-- gratuito legítimo teria a mesma cara.
ALTER TABLE `subscriptions`
  ADD COLUMN `grantedById` INT NULL,
  ADD COLUMN `grantReason` VARCHAR(255) NULL;

CREATE INDEX `subscriptions_grantedById_idx` ON `subscriptions`(`grantedById`);

ALTER TABLE `subscriptions`
  ADD CONSTRAINT `subscriptions_grantedById_fkey`
  FOREIGN KEY (`grantedById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
