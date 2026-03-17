ALTER TABLE `reviews`
  DROP FOREIGN KEY `reviews_serviceId_fkey`;

ALTER TABLE `reviews`
  DROP INDEX `reviews_serviceId_requesterId_key`,
  DROP INDEX `reviews_serviceId_idx`,
  MODIFY `serviceId` INTEGER NULL,
  ADD COLUMN `productId` INTEGER NULL,
  ADD COLUMN `accommodationId` INTEGER NULL,
  ADD COLUMN `transportationId` INTEGER NULL,
  ADD UNIQUE INDEX `reviews_serviceId_requesterId_key`(`serviceId`, `requesterId`),
  ADD UNIQUE INDEX `reviews_productId_requesterId_key`(`productId`, `requesterId`),
  ADD UNIQUE INDEX `reviews_accommodationId_requesterId_key`(`accommodationId`, `requesterId`),
  ADD UNIQUE INDEX `reviews_transportationId_requesterId_key`(`transportationId`, `requesterId`),
  ADD INDEX `reviews_serviceId_idx`(`serviceId`),
  ADD INDEX `reviews_productId_idx`(`productId`),
  ADD INDEX `reviews_accommodationId_idx`(`accommodationId`),
  ADD INDEX `reviews_transportationId_idx`(`transportationId`);

ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_serviceId_fkey`
  FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `reviews_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `products`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `reviews_accommodationId_fkey`
  FOREIGN KEY (`accommodationId`) REFERENCES `accommodations`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `reviews_transportationId_fkey`
  FOREIGN KEY (`transportationId`) REFERENCES `transportations`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;
