ALTER TABLE `works`
    ADD COLUMN `arrivalConfirmedAt` DATETIME(3) NULL AFTER `startedAt`,
    ADD COLUMN `warrantyRequestedAt` DATETIME(3) NULL AFTER `warrantyExpiresAt`,
    ADD COLUMN `warrantyRequestDescription` LONGTEXT NULL AFTER `warrantyRequestedAt`,
    ADD COLUMN `warrantyRequestStatus` ENUM('Pending', 'Approved', 'Rejected') NULL AFTER `warrantyRequestDescription`;

ALTER TABLE `work_files`
    MODIFY `type` ENUM('Requester', 'Provider', 'Completion', 'WarrantyRequest') NOT NULL DEFAULT 'Requester';
