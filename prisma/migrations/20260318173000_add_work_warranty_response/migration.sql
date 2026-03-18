ALTER TABLE `works`
    ADD COLUMN `warrantyResponseDescription` LONGTEXT NULL AFTER `warrantyRequestStatus`,
    ADD COLUMN `warrantyRespondedAt` DATETIME(3) NULL AFTER `warrantyResponseDescription`;
