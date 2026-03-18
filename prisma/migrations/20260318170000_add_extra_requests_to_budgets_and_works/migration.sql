ALTER TABLE `budgets`
    ADD COLUMN `extraRequestValue` DECIMAL(10, 2) NULL AFTER `responseValue`,
    ADD COLUMN `extraRequestDescription` LONGTEXT NULL AFTER `extraRequestValue`,
    ADD COLUMN `extraRequestStatus` ENUM('Pending', 'Approved', 'Rejected') NULL AFTER `extraRequestDescription`,
    ADD COLUMN `extraRequestedAt` DATETIME(3) NULL AFTER `extraRequestStatus`,
    ADD COLUMN `extraRespondedAt` DATETIME(3) NULL AFTER `extraRequestedAt`;

ALTER TABLE `works`
    ADD COLUMN `extraRequestValue` DECIMAL(10, 2) NULL AFTER `warrantyRequestStatus`,
    ADD COLUMN `extraRequestDescription` LONGTEXT NULL AFTER `extraRequestValue`,
    ADD COLUMN `extraRequestStatus` ENUM('Pending', 'Approved', 'Rejected') NULL AFTER `extraRequestDescription`,
    ADD COLUMN `extraRequestedAt` DATETIME(3) NULL AFTER `extraRequestStatus`,
    ADD COLUMN `extraRespondedAt` DATETIME(3) NULL AFTER `extraRequestedAt`;
