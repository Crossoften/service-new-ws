CREATE TABLE `transportation_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `iconUrl` VARCHAR(1500) NULL,
    `iconKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transportation_categories_name_key`(`name`),
    UNIQUE INDEX `transportation_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `transportations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `model` VARCHAR(160) NULL,
    `mileageKm` INTEGER NULL,
    `capacity` INTEGER NULL,
    `year` INTEGER NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `description` LONGTEXT NULL,
    `imageUrl` VARCHAR(1500) NULL,
    `imageKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `categoryId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transportations_categoryId_idx`(`categoryId`),
    INDEX `transportations_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `transportations`
    ADD CONSTRAINT `transportations_categoryId_fkey`
    FOREIGN KEY (`categoryId`) REFERENCES `transportation_categories`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `transportations`
    ADD CONSTRAINT `transportations_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
