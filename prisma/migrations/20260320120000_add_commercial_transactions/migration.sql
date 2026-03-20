-- AlterTable
ALTER TABLE `chat_rooms`
    MODIFY `contextType` ENUM('Budget', 'Work', 'CommercialTransaction') NOT NULL;

-- AlterTable
ALTER TABLE `payments`
    MODIFY `referenceType` ENUM('Work', 'CommercialTransaction') NOT NULL;

-- AlterTable
ALTER TABLE `financial_transactions`
    MODIFY `referenceType` ENUM('Work', 'CommercialTransaction') NOT NULL,
    MODIFY `category` ENUM('WorkPayment', 'CommercialTransaction', 'Fee', 'Withdrawal', 'Refund', 'Adjustment') NOT NULL;

-- CreateTable
CREATE TABLE `commercial_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referenceType` ENUM('Product') NOT NULL,
    `referenceId` INTEGER NOT NULL,
    `status` ENUM('Requested', 'Accepted', 'Rejected', 'Cancelled', 'Paid', 'Completed') NOT NULL DEFAULT 'Requested',
    `title` VARCHAR(191) NULL,
    `description` LONGTEXT NULL,
    `requestedAmount` DECIMAL(10, 2) NOT NULL,
    `agreedAmount` DECIMAL(10, 2) NULL,
    `buyerId` INTEGER NOT NULL,
    `sellerId` INTEGER NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `commercial_transactions_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `commercial_transactions_buyerId_idx`(`buyerId`),
    INDEX `commercial_transactions_sellerId_idx`(`sellerId`),
    INDEX `commercial_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `commercial_transactions`
    ADD CONSTRAINT `commercial_transactions_buyerId_fkey`
    FOREIGN KEY (`buyerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commercial_transactions`
    ADD CONSTRAINT `commercial_transactions_sellerId_fkey`
    FOREIGN KEY (`sellerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commercial_transactions`
    ADD CONSTRAINT `commercial_transactions_referenceId_fkey`
    FOREIGN KEY (`referenceId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
