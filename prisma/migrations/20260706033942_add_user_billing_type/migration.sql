-- AlterTable
ALTER TABLE `users` MODIFY `billingType` ENUM('None', 'Subscription', 'Commission') NULL;
