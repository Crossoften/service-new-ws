-- AlterTable
ALTER TABLE `users` ADD COLUMN `billingType` ENUM('Subscription', 'Commission') NULL;
