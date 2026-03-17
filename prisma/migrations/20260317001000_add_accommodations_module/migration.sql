CREATE TABLE `accommodation_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `iconUrl` VARCHAR(1500) NULL,
    `iconKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `accommodation_categories_name_key`(`name`),
    UNIQUE INDEX `accommodation_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `accommodations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `street` VARCHAR(160) NULL,
    `neighborhood` VARCHAR(120) NULL,
    `city` VARCHAR(120) NULL,
    `state` VARCHAR(120) NULL,
    `roomsQuantity` INTEGER NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `description` LONGTEXT NULL,
    `imageUrl` VARCHAR(1500) NULL,
    `imageKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `categoryId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `accommodations_categoryId_idx`(`categoryId`),
    INDEX `accommodations_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `accommodations`
    ADD CONSTRAINT `accommodations_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `accommodation_categories`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `accommodations`
    ADD CONSTRAINT `accommodations_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
