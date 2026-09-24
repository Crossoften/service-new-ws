-- AlterTable
ALTER TABLE `subscriptions` ADD COLUMN `categoryId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `subscriptions_userId_categoryId_status_idx` ON `subscriptions`(`userId`, `categoryId`, `status`);

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `service_categories`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
