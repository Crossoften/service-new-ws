CREATE TABLE `bank_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bankName` VARCHAR(120) NOT NULL,
    `accountType` ENUM('Checking', 'Savings') NOT NULL,
    `agency` VARCHAR(30) NOT NULL,
    `account` VARCHAR(30) NOT NULL,
    `cpf` VARCHAR(14) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bank_accounts_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `bank_accounts`
    ADD CONSTRAINT `bank_accounts_userId_fkey`
    FOREIGN KEY (`userId`) REFERENCES `users`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
