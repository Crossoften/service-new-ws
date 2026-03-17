CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `method` ENUM('CreditCard', 'Pix', 'BankSlip') NOT NULL,
    `status` ENUM('Pending', 'Paid', 'Cancelled') NOT NULL DEFAULT 'Paid',
    `referenceType` ENUM('Work') NOT NULL,
    `referenceId` INTEGER NOT NULL,
    `holderName` VARCHAR(160) NULL,
    `cardBrand` VARCHAR(60) NULL,
    `cardLast4` VARCHAR(4) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `payerId` INTEGER NOT NULL,
    `receiverId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payments_payerId_idx`(`payerId`),
    INDEX `payments_receiverId_idx`(`receiverId`),
    INDEX `payments_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `payments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `financial_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('Credit', 'Debit') NOT NULL,
    `category` ENUM('WorkPayment', 'Fee', 'Withdrawal', 'Refund', 'Adjustment') NOT NULL,
    `status` ENUM('Pending', 'Paid', 'Cancelled') NOT NULL DEFAULT 'Paid',
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `availableAt` DATETIME(3) NULL,
    `referenceType` ENUM('Work') NOT NULL,
    `referenceId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `paymentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `financial_transactions_userId_idx`(`userId`),
    INDEX `financial_transactions_paymentId_idx`(`paymentId`),
    INDEX `financial_transactions_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `financial_transactions_type_status_idx`(`type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `payments`
    ADD CONSTRAINT `payments_payerId_fkey`
    FOREIGN KEY (`payerId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `payments`
    ADD CONSTRAINT `payments_receiverId_fkey`
    FOREIGN KEY (`receiverId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `financial_transactions`
    ADD CONSTRAINT `financial_transactions_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `financial_transactions`
    ADD CONSTRAINT `financial_transactions_paymentId_fkey`
    FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO `payments` (
    `method`,
    `status`,
    `referenceType`,
    `referenceId`,
    `holderName`,
    `cardBrand`,
    `cardLast4`,
    `amount`,
    `paidAt`,
    `payerId`,
    `receiverId`,
    `createdAt`,
    `updatedAt`
)
SELECT
    `method`,
    `status`,
    'Work',
    `workId`,
    `holderName`,
    `cardBrand`,
    `cardLast4`,
    `amount`,
    `paidAt`,
    `requesterId`,
    `providerId`,
    `createdAt`,
    `updatedAt`
FROM `work_payments`;

INSERT INTO `financial_transactions` (
    `type`,
    `category`,
    `status`,
    `amount`,
    `description`,
    `availableAt`,
    `referenceType`,
    `referenceId`,
    `userId`,
    `paymentId`,
    `createdAt`,
    `updatedAt`
)
SELECT
    'Debit',
    'WorkPayment',
    p.`status`,
    p.`amount`,
    CONCAT('Pagamento do trabalho #', p.`referenceId`),
    p.`paidAt`,
    p.`referenceType`,
    p.`referenceId`,
    p.`payerId`,
    p.`id`,
    p.`createdAt`,
    p.`updatedAt`
FROM `payments` p;

INSERT INTO `financial_transactions` (
    `type`,
    `category`,
    `status`,
    `amount`,
    `description`,
    `availableAt`,
    `referenceType`,
    `referenceId`,
    `userId`,
    `paymentId`,
    `createdAt`,
    `updatedAt`
)
SELECT
    'Credit',
    'WorkPayment',
    p.`status`,
    p.`amount`,
    CONCAT('Recebimento do trabalho #', p.`referenceId`),
    p.`paidAt`,
    p.`referenceType`,
    p.`referenceId`,
    p.`receiverId`,
    p.`id`,
    p.`createdAt`,
    p.`updatedAt`
FROM `payments` p;

DROP TABLE `work_payments`;
