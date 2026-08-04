-- AlterTable
ALTER TABLE `payments` ADD COLUMN `externalReference` VARCHAR(64) NULL,
    ADD COLUMN `mpPaymentId` VARCHAR(120) NULL,
    ADD COLUMN `mpPreferenceId` VARCHAR(120) NULL,
    MODIFY `method` ENUM('CreditCard', 'Pix', 'BankSlip') NULL,
    MODIFY `status` ENUM('Pending', 'Paid', 'Cancelled') NOT NULL DEFAULT 'Pending';

-- AlterTable
ALTER TABLE `subscriptions` MODIFY `status` ENUM('Pending', 'Active', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Pending';

-- CreateIndex
CREATE UNIQUE INDEX `payments_externalReference_key` ON `payments`(`externalReference`);

-- CreateIndex
CREATE UNIQUE INDEX `payments_mpPaymentId_key` ON `payments`(`mpPaymentId`);
