-- AlterTable
ALTER TABLE `accommodations` ADD COLUMN `videoKey` VARCHAR(1500) NULL,
    ADD COLUMN `videoUrl` VARCHAR(1500) NULL;

-- AlterTable
ALTER TABLE `products` ADD COLUMN `videoKey` VARCHAR(1500) NULL,
    ADD COLUMN `videoUrl` VARCHAR(1500) NULL;

-- AlterTable
ALTER TABLE `transportations` ADD COLUMN `videoKey` VARCHAR(1500) NULL,
    ADD COLUMN `videoUrl` VARCHAR(1500) NULL;
