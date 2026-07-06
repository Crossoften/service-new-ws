-- AlterTable
ALTER TABLE `plans` ADD COLUMN `categoryId` INTEGER NULL;

-- AddForeignKey
ALTER TABLE `plans` ADD CONSTRAINT `plans_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `service_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
