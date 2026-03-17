ALTER TABLE `products`
  ADD COLUMN `transactionType` ENUM('Rent', 'Sale', 'RentAndSale') NOT NULL DEFAULT 'Sale' AFTER `name`;
