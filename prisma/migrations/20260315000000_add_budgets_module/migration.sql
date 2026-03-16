-- CreateTable
CREATE TABLE `budgets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` LONGTEXT NULL,
    `status` ENUM('Pending', 'Responded', 'WaitingInformation', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `responseDescription` LONGTEXT NULL,
    `responseValue` DECIMAL(10, 2) NULL,
    `responseTimeQuantity` INTEGER NULL,
    `responseTimeUnit` ENUM('Hour', 'Day', 'Week', 'Month') NULL,
    `serviceId` INTEGER NOT NULL,
    `requesterId` INTEGER NOT NULL,
    `providerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budgets_serviceId_idx`(`serviceId`),
    INDEX `budgets_requesterId_idx`(`requesterId`),
    INDEX `budgets_providerId_idx`(`providerId`),
    INDEX `budgets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(1500) NOT NULL,
    `fileKey` VARCHAR(1500) NOT NULL,
    `type` ENUM('Request', 'InformationRequest') NOT NULL DEFAULT 'Request',
    `budgetId` INTEGER NOT NULL,
    `informationRequestId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budget_files_budgetId_idx`(`budgetId`),
    INDEX `budget_files_informationRequestId_idx`(`informationRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_information` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message` LONGTEXT NOT NULL,
    `budgetId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budget_information_budgetId_idx`(`budgetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_files` ADD CONSTRAINT `budget_files_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_files` ADD CONSTRAINT `budget_files_informationRequestId_fkey` FOREIGN KEY (`informationRequestId`) REFERENCES `budget_information`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_information` ADD CONSTRAINT `budget_information_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
