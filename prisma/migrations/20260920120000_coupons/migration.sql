-- Cupons de desconto.
--
-- O desconto sai do bolso da PLATAFORMA: o restaurante continua recebendo os
-- itens integrais e o entregador continua recebendo frete e gorjeta. Na prática
-- isso significa que o desconto é abatido da retenção do split, e por isso
-- nunca pode passar da comissão daquele pedido — é só dela que há de onde
-- tirar. `minOrderValue` e `maxDiscountValue` são os controles que mantêm o
-- desconto dentro desse limite.

CREATE TABLE `coupons` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `description` VARCHAR(255) NULL,
  `type` ENUM('Percent', 'Fixed', 'FreeShipping') NOT NULL,
  `value` DECIMAL(10, 2) NULL,
  `maxDiscountValue` DECIMAL(10, 2) NULL,
  `minOrderValue` DECIMAL(10, 2) NULL,
  `startsAt` DATETIME(3) NULL,
  `endsAt` DATETIME(3) NULL,
  `maxUses` INTEGER NULL,
  `maxUsesPerCustomer` INTEGER NULL,
  `restaurantId` INTEGER NULL,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdById` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `coupons_code_key`(`code`),
  INDEX `coupons_isActive_idx`(`isActive`),
  INDEX `coupons_restaurantId_idx`(`restaurantId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Um resgate por pedido. É esta tabela que responde "quantas vezes este cupom
-- já foi usado" — contar em `food_orders` misturaria pedido cancelado com
-- pedido válido.
CREATE TABLE `coupon_redemptions` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `couponId` INTEGER NOT NULL,
  `userId` INTEGER NOT NULL,
  `foodOrderId` INTEGER NOT NULL,
  `discountAmount` DECIMAL(10, 2) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `coupon_redemptions_foodOrderId_key`(`foodOrderId`),
  INDEX `coupon_redemptions_couponId_userId_idx`(`couponId`, `userId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `food_orders`
  ADD COLUMN `discount` DECIMAL(10, 2) NOT NULL DEFAULT 0 AFTER `tip`,
  ADD COLUMN `couponId` INTEGER NULL AFTER `discount`;

ALTER TABLE `coupons`
  ADD CONSTRAINT `coupons_restaurantId_fkey` FOREIGN KEY (`restaurantId`)
    REFERENCES `restaurants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `coupons_createdById_fkey` FOREIGN KEY (`createdById`)
    REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `coupon_redemptions`
  ADD CONSTRAINT `coupon_redemptions_couponId_fkey` FOREIGN KEY (`couponId`)
    REFERENCES `coupons`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `coupon_redemptions_userId_fkey` FOREIGN KEY (`userId`)
    REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `coupon_redemptions_foodOrderId_fkey` FOREIGN KEY (`foodOrderId`)
    REFERENCES `food_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `food_orders`
  ADD CONSTRAINT `food_orders_couponId_fkey` FOREIGN KEY (`couponId`)
    REFERENCES `coupons`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
