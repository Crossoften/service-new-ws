-- Inscrições de Web Push.
--
-- Uma por navegador: o mesmo usuário tem uma no celular e outra no desktop, e
-- cada uma é cifrada com as próprias chaves. `endpoint` é único porque é a
-- identidade da inscrição — reinscrever o mesmo navegador atualiza a linha em
-- vez de criar outra.
--
-- `ON DELETE CASCADE` no usuário: inscrição sem dono não serve para nada e não
-- deve impedir a remoção da conta.
CREATE TABLE `push_subscriptions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `endpoint` VARCHAR(500) NOT NULL,
  `p256dh` VARCHAR(255) NOT NULL,
  `auth` VARCHAR(255) NOT NULL,
  `userAgent` VARCHAR(255) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  `lastSentAt` DATETIME(3) NULL,

  UNIQUE INDEX `push_subscriptions_endpoint_key`(`endpoint`),
  INDEX `push_subscriptions_userId_idx`(`userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `push_subscriptions`
  ADD CONSTRAINT `push_subscriptions_userId_fkey` FOREIGN KEY (`userId`)
    REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
