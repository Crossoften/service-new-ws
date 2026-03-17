CREATE TABLE `work_payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `method` ENUM('CreditCard', 'Pix', 'BankSlip') NOT NULL,
    `status` ENUM('Pending', 'Paid', 'Cancelled') NOT NULL DEFAULT 'Paid',
    `holderName` VARCHAR(160) NULL,
    `cardBrand` VARCHAR(60) NULL,
    `cardLast4` VARCHAR(4) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `workId` INTEGER NOT NULL,
    `requesterId` INTEGER NOT NULL,
    `providerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `work_payments_workId_key`(`workId`),
    INDEX `work_payments_requesterId_idx`(`requesterId`),
    INDEX `work_payments_providerId_idx`(`providerId`),
    INDEX `work_payments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `work_payments`
    ADD CONSTRAINT `work_payments_workId_fkey`
    FOREIGN KEY (`workId`) REFERENCES `works`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `work_payments`
    ADD CONSTRAINT `work_payments_requesterId_fkey`
    FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `work_payments`
    ADD CONSTRAINT `work_payments_providerId_fkey`
    FOREIGN KEY (`providerId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
