-- AlterTable
ALTER TABLE `services` ADD COLUMN `videoKey` VARCHAR(1500) NULL,
    ADD COLUMN `videoUrl` VARCHAR(1500) NULL;

-- CreateTable
CREATE TABLE `service_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileUrl` VARCHAR(1500) NOT NULL,
    `fileKey` VARCHAR(1500) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `serviceId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `service_files_serviceId_idx`(`serviceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `service_files` ADD CONSTRAINT `service_files_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
