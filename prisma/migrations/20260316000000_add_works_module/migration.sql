-- CreateTable
CREATE TABLE `works` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('InProgress', 'Finished', 'Cancelled') NOT NULL DEFAULT 'InProgress',
    `details` LONGTEXT NULL,
    `completionDescription` LONGTEXT NULL,
    `cancelReason` LONGTEXT NULL,
    `serviceDate` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `serviceValue` DECIMAL(10, 2) NULL,
    `totalValue` DECIMAL(10, 2) NULL,
    `budgetId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `requesterId` INTEGER NOT NULL,
    `providerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `works_budgetId_key`(`budgetId`),
    INDEX `works_serviceId_idx`(`serviceId`),
    INDEX `works_requesterId_idx`(`requesterId`),
    INDEX `works_providerId_idx`(`providerId`),
    INDEX `works_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(1500) NOT NULL,
    `fileKey` VARCHAR(1500) NOT NULL,
    `type` ENUM('Requester', 'Provider', 'Completion') NOT NULL DEFAULT 'Requester',
    `workId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `work_files_workId_idx`(`workId`),
    INDEX `work_files_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `works` ADD CONSTRAINT `works_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `works` ADD CONSTRAINT `works_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `works` ADD CONSTRAINT `works_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `works` ADD CONSTRAINT `works_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_files` ADD CONSTRAINT `work_files_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `works`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
