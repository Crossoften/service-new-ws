-- AlterTable
ALTER TABLE `plans` ADD COLUMN `bonusMonths` INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `plans` DROP COLUMN `benefits`;
