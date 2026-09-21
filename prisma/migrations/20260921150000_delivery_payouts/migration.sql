-- Carteira do entregador: o repasse passa a ter saída, não só entrada.
--
-- A plataforma retém frete e gorjeta no split e devia esses valores ao
-- entregador. A dívida existia como crédito em `financial_transactions`
-- (categoria `DeliveryPayout`), mas nenhuma rotina no projeto a liquidava:
-- `Withdrawal` estava no enum desde a criação e nunca foi gravado. O dinheiro
-- do entregador estava contabilizado e não estava pago.
--
-- Três mudanças, todas aditivas. Nenhum dado existente muda de significado: os
-- créditos já gravados nascem com `payoutId` nulo, que é exatamente o que
-- "ainda devido" quer dizer — o saldo em aberto de hoje aparece correto sem
-- backfill nenhum.

-- 1. O referenceType ganha o repasse.
--
-- É o único que não nasce de um negócio entre duas pessoas, e sim de a
-- plataforma pagar o que devia; o `referenceId` aponta para `delivery_payouts`.
-- Só `financial_transactions` precisa dele: `payments` é cobrança ao cliente e
-- nunca vai referenciar um repasse, então a coluna dele fica como está.
ALTER TABLE `financial_transactions`
  MODIFY `referenceType` ENUM(
    'Work',
    'CommercialTransaction',
    'Subscription',
    'FoodOrder',
    'Referral',
    'DeliveryPayout'
  ) NOT NULL;

-- 2. O lote de repasse.
CREATE TABLE `delivery_payouts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `amount` DECIMAL(10, 2) NOT NULL,
    `method` ENUM('Pix', 'BankTransfer', 'Cash', 'Other') NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` VARCHAR(255) NULL,
    `transactionsCount` INTEGER NOT NULL DEFAULT 0,
    `paidAt` DATETIME(3) NOT NULL,
    `courierId` INTEGER NOT NULL,
    `createdById` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `delivery_payouts_courierId_idx`(`courierId`),
    INDEX `delivery_payouts_paidAt_idx`(`paidAt`),
    INDEX `delivery_payouts_createdById_idx`(`createdById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. O vínculo entre o crédito e o lote que o quitou.
--
-- Uma coluna nula resolve as três coisas de uma vez: saldo em aberto é a soma
-- dos créditos com `payoutId` nulo; histórico é o agrupamento por lote; e
-- idempotência sai de um `UPDATE ... WHERE payoutId IS NULL`, que numa corrida
-- entre dois admins afeta menos linhas do que o esperado e derruba a transação.
ALTER TABLE `financial_transactions` ADD COLUMN `payoutId` INTEGER NULL;

CREATE INDEX `financial_transactions_payoutId_idx` ON `financial_transactions`(`payoutId`);

ALTER TABLE `delivery_payouts`
  ADD CONSTRAINT `delivery_payouts_courierId_fkey`
  FOREIGN KEY (`courierId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `delivery_payouts`
  ADD CONSTRAINT `delivery_payouts_createdById_fkey`
  FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `financial_transactions`
  ADD CONSTRAINT `financial_transactions_payoutId_fkey`
  FOREIGN KEY (`payoutId`) REFERENCES `delivery_payouts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
