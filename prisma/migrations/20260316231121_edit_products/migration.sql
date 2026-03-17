-- DropForeignKey
ALTER TABLE `budgets` DROP FOREIGN KEY `budgets_serviceId_fkey`;

-- AlterTable
ALTER TABLE `admin_permissions` MODIFY `name` ENUM('Dashboard', 'Settings', 'Services', 'Financial', 'Users') NOT NULL;

-- AlterTable
ALTER TABLE `budgets` MODIFY `serviceId` INTEGER NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `role` ENUM('Master', 'Admin', 'User', 'Supplier') NOT NULL DEFAULT 'User';

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
