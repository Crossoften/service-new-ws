-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `bonusMonths` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `birthDate` DATETIME(3) NULL,
    ADD COLUMN `commissionRate` DECIMAL(5, 2) NULL;

-- CreateTable
CREATE TABLE `user_social_medias` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `network` ENUM('Instagram', 'TikTok', 'YouTube', 'Facebook', 'X', 'Other') NOT NULL,
    `url` VARCHAR(500) NOT NULL,
    `followers` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `user_social_medias_userId_idx`(`userId`),
    UNIQUE INDEX `user_social_medias_userId_network_key`(`userId`, `network`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `platform_settings` (
    `id` INTEGER NOT NULL DEFAULT 1,
    `influencerCommissionRate` DECIMAL(5, 2) NOT NULL DEFAULT 10,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_social_medias` ADD CONSTRAINT `user_social_medias_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
