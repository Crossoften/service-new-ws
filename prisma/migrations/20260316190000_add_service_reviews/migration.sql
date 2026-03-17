CREATE TABLE `reviews` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `type` ENUM('Positive', 'Negative') NOT NULL,
  `comment` LONGTEXT NULL,
  `serviceId` INTEGER NOT NULL,
  `requesterId` INTEGER NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  UNIQUE INDEX `reviews_serviceId_requesterId_key`(`serviceId`, `requesterId`),
  INDEX `reviews_serviceId_idx`(`serviceId`),
  INDEX `reviews_requesterId_idx`(`requesterId`),
  INDEX `reviews_type_idx`(`type`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_serviceId_fkey`
  FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_requesterId_fkey`
  FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
