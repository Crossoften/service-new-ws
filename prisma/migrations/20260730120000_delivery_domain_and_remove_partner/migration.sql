-- AlterTable
ALTER TABLE `chat_rooms` MODIFY `contextType` ENUM('Budget', 'Work', 'CommercialTransaction', 'Rental', 'TransportRequest', 'Booking', 'FoodOrder', 'Job') NOT NULL;

-- AlterTable
ALTER TABLE `financial_transactions` MODIFY `category` ENUM('WorkPayment', 'CommercialTransaction', 'Subscription', 'Fee', 'Withdrawal', 'Refund', 'Adjustment', 'DeliveryPayout', 'ReferralCommission') NOT NULL,
    MODIFY `referenceType` ENUM('Work', 'CommercialTransaction', 'Subscription', 'FoodOrder', 'Referral') NOT NULL;

-- AlterTable
ALTER TABLE `payments` MODIFY `referenceType` ENUM('Work', 'CommercialTransaction', 'Subscription', 'FoodOrder', 'Referral') NOT NULL;

-- AlterTable
ALTER TABLE `reviews` ADD COLUMN `restaurantId` INTEGER NULL;

-- AlterTable
ALTER TABLE `users` MODIFY `profileType` ENUM('Client', 'Supplier', 'Delivery', 'Influencer') NOT NULL DEFAULT 'Client';

-- CreateTable
CREATE TABLE `restaurant_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `iconUrl` VARCHAR(1500) NULL,
    `iconKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `restaurant_categories_name_key`(`name`),
    UNIQUE INDEX `restaurant_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `restaurants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `description` LONGTEXT NULL,
    `imageUrl` VARCHAR(1500) NULL,
    `imageKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isOpen` BOOLEAN NOT NULL DEFAULT true,
    `categoryId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `addressId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `restaurants_userId_key`(`userId`),
    UNIQUE INDEX `restaurants_addressId_key`(`addressId`),
    INDEX `restaurants_categoryId_idx`(`categoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `restaurantId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `menu_categories_restaurantId_idx`(`restaurantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `description` LONGTEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `imageUrl` VARCHAR(1500) NULL,
    `imageKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `restaurantId` INTEGER NOT NULL,
    `menuCategoryId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `menu_items_restaurantId_idx`(`restaurantId`),
    INDEX `menu_items_menuCategoryId_idx`(`menuCategoryId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `menu_item_additions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `menuItemId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `menu_item_additions_menuItemId_idx`(`menuItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `food_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('Received', 'Accepted', 'Preparing', 'OnTheWay', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Received',
    `itemsValue` DECIMAL(10, 2) NOT NULL,
    `deliveryFee` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `totalValue` DECIMAL(10, 2) NOT NULL,
    `platformFeeRate` DECIMAL(5, 2) NULL,
    `commissionAmount` DECIMAL(10, 2) NULL,
    `paymentMethod` ENUM('CreditCard', 'Pix', 'BankSlip') NOT NULL,
    `notes` LONGTEXT NULL,
    `cancelReason` LONGTEXT NULL,
    `restaurantId` INTEGER NOT NULL,
    `customerId` INTEGER NOT NULL,
    `addressId` INTEGER NULL,
    `acceptedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `food_orders_restaurantId_idx`(`restaurantId`),
    INDEX `food_orders_customerId_idx`(`customerId`),
    INDEX `food_orders_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `food_order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `foodOrderId` INTEGER NOT NULL,
    `menuItemId` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL DEFAULT 1,
    `unitPrice` DECIMAL(10, 2) NOT NULL,
    `notes` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `food_order_items_foodOrderId_idx`(`foodOrderId`),
    INDEX `food_order_items_menuItemId_idx`(`menuItemId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `food_order_item_additions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `foodOrderItemId` INTEGER NOT NULL,
    `menuItemAdditionId` INTEGER NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,

    INDEX `food_order_item_additions_foodOrderItemId_idx`(`foodOrderItemId`),
    INDEX `food_order_item_additions_menuItemAdditionId_idx`(`menuItemAdditionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_assignments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('Pending', 'Accepted', 'Rejected', 'PickedUp', 'OnTheWay', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `foodOrderId` INTEGER NOT NULL,
    `courierId` INTEGER NULL,
    `currentLat` DECIMAL(10, 7) NULL,
    `currentLng` DECIMAL(10, 7) NULL,
    `locationUpdatedAt` DATETIME(3) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `pickedUpAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `delivery_assignments_foodOrderId_key`(`foodOrderId`),
    INDEX `delivery_assignments_courierId_idx`(`courierId`),
    INDEX `delivery_assignments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rentals` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('Requested', 'Accepted', 'Rejected', 'Active', 'Returned', 'Cancelled') NOT NULL DEFAULT 'Requested',
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `conditions` LONGTEXT NULL,
    `cancelReason` LONGTEXT NULL,
    `productId` INTEGER NOT NULL,
    `requesterId` INTEGER NOT NULL,
    `providerId` INTEGER NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `returnedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `rentals_productId_idx`(`productId`),
    INDEX `rentals_requesterId_idx`(`requesterId`),
    INDEX `rentals_providerId_idx`(`providerId`),
    INDEX `rentals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transport_requests` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('Requested', 'Quoted', 'Accepted', 'Rejected', 'InTransit', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Requested',
    `origin` VARCHAR(255) NOT NULL,
    `destination` VARCHAR(255) NOT NULL,
    `cargoDescription` LONGTEXT NULL,
    `quotedValue` DECIMAL(10, 2) NULL,
    `cancelReason` LONGTEXT NULL,
    `transportationId` INTEGER NOT NULL,
    `requesterId` INTEGER NOT NULL,
    `providerId` INTEGER NOT NULL,
    `quotedAt` DATETIME(3) NULL,
    `acceptedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transport_requests_transportationId_idx`(`transportationId`),
    INDEX `transport_requests_requesterId_idx`(`requesterId`),
    INDEX `transport_requests_providerId_idx`(`providerId`),
    INDEX `transport_requests_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('Requested', 'Confirmed', 'Rejected', 'CheckedIn', 'Completed', 'Cancelled') NOT NULL DEFAULT 'Requested',
    `checkIn` DATETIME(3) NOT NULL,
    `checkOut` DATETIME(3) NOT NULL,
    `guests` INTEGER NOT NULL DEFAULT 1,
    `totalValue` DECIMAL(10, 2) NOT NULL,
    `cancelReason` LONGTEXT NULL,
    `accommodationId` INTEGER NOT NULL,
    `requesterId` INTEGER NOT NULL,
    `providerId` INTEGER NOT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `checkedInAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `bookings_accommodationId_idx`(`accommodationId`),
    INDEX `bookings_requesterId_idx`(`requesterId`),
    INDEX `bookings_providerId_idx`(`providerId`),
    INDEX `bookings_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accommodation_availabilities` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `accommodationId` INTEGER NOT NULL,
    `date` DATE NOT NULL,
    `isBlocked` BOOLEAN NOT NULL DEFAULT true,
    `reason` VARCHAR(255) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `accommodation_availabilities_accommodationId_idx`(`accommodationId`),
    UNIQUE INDEX `accommodation_availabilities_accommodationId_date_key`(`accommodationId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `jobs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(160) NOT NULL,
    `type` ENUM('CLT', 'PJ', 'Freelance', 'Temporary') NOT NULL,
    `value` DECIMAL(10, 2) NULL,
    `requirements` LONGTEXT NULL,
    `description` LONGTEXT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `employerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `jobs_employerId_idx`(`employerId`),
    INDEX `jobs_isActive_idx`(`isActive`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `job_applications` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('Applied', 'Accepted', 'Rejected') NOT NULL DEFAULT 'Applied',
    `message` LONGTEXT NULL,
    `jobId` INTEGER NOT NULL,
    `applicantId` INTEGER NOT NULL,
    `respondedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `job_applications_jobId_idx`(`jobId`),
    INDEX `job_applications_applicantId_idx`(`applicantId`),
    UNIQUE INDEX `job_applications_jobId_applicantId_key`(`jobId`, `applicantId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurants` ADD CONSTRAINT `restaurants_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `restaurant_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurants` ADD CONSTRAINT `restaurants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `restaurants` ADD CONSTRAINT `restaurants_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_categories` ADD CONSTRAINT `menu_categories_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_items` ADD CONSTRAINT `menu_items_menuCategoryId_fkey` FOREIGN KEY (`menuCategoryId`) REFERENCES `menu_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `menu_item_additions` ADD CONSTRAINT `menu_item_additions_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `food_orders` ADD CONSTRAINT `food_orders_restaurantId_fkey` FOREIGN KEY (`restaurantId`) REFERENCES `restaurants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `food_orders` ADD CONSTRAINT `food_orders_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `food_orders` ADD CONSTRAINT `food_orders_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `food_order_items` ADD CONSTRAINT `food_order_items_foodOrderId_fkey` FOREIGN KEY (`foodOrderId`) REFERENCES `food_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `food_order_items` ADD CONSTRAINT `food_order_items_menuItemId_fkey` FOREIGN KEY (`menuItemId`) REFERENCES `menu_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `food_order_item_additions` ADD CONSTRAINT `food_order_item_additions_foodOrderItemId_fkey` FOREIGN KEY (`foodOrderItemId`) REFERENCES `food_order_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `food_order_item_additions` ADD CONSTRAINT `food_order_item_additions_menuItemAdditionId_fkey` FOREIGN KEY (`menuItemAdditionId`) REFERENCES `menu_item_additions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_assignments` ADD CONSTRAINT `delivery_assignments_foodOrderId_fkey` FOREIGN KEY (`foodOrderId`) REFERENCES `food_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_assignments` ADD CONSTRAINT `delivery_assignments_courierId_fkey` FOREIGN KEY (`courierId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rentals` ADD CONSTRAINT `rentals_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rentals` ADD CONSTRAINT `rentals_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `rentals` ADD CONSTRAINT `rentals_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_requests` ADD CONSTRAINT `transport_requests_transportationId_fkey` FOREIGN KEY (`transportationId`) REFERENCES `transportations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_requests` ADD CONSTRAINT `transport_requests_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transport_requests` ADD CONSTRAINT `transport_requests_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_accommodationId_fkey` FOREIGN KEY (`accommodationId`) REFERENCES `accommodations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accommodation_availabilities` ADD CONSTRAINT `accommodation_availabilities_accommodationId_fkey` FOREIGN KEY (`accommodationId`) REFERENCES `accommodations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_employerId_fkey` FOREIGN KEY (`employerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `job_applications` ADD CONSTRAINT `job_applications_applicantId_fkey` FOREIGN KEY (`applicantId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
