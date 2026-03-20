-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `document` VARCHAR(18) NULL,
    `biography` LONGTEXT NULL,
    `phone` VARCHAR(191) NULL,
    `password` VARCHAR(191) NOT NULL,
    `code` VARCHAR(4) NULL,
    `codeExpiresIn` DATETIME(3) NULL,
    `role` ENUM('Master', 'Admin', 'User', 'Supplier') NOT NULL DEFAULT 'User',
    `profileType` ENUM('Client', 'Supplier', 'Partner', 'Delivery') NOT NULL DEFAULT 'Client',
    `status` ENUM('Active', 'Pending', 'Inactive') NOT NULL DEFAULT 'Pending',
    `fileUrl` VARCHAR(1500) NULL,
    `fileKey` VARCHAR(1500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    UNIQUE INDEX `users_document_key`(`document`),
    UNIQUE INDEX `users_phone_key`(`phone`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `admin_permissions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` ENUM('Dashboard', 'Settings', 'Services', 'Financial', 'Users') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `admin_permissions_name_key`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `service_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `iconUrl` VARCHAR(1500) NULL,
    `iconKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `service_categories_name_key`(`name`),
    UNIQUE INDEX `service_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `iconUrl` VARCHAR(1500) NULL,
    `iconKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `product_categories_name_key`(`name`),
    UNIQUE INDEX `product_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transportation_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `iconUrl` VARCHAR(1500) NULL,
    `iconKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transportation_categories_name_key`(`name`),
    UNIQUE INDEX `transportation_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accommodation_categories` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `iconUrl` VARCHAR(1500) NULL,
    `iconKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `accommodation_categories_name_key`(`name`),
    UNIQUE INDEX `accommodation_categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `transactionType` ENUM('Rent', 'Sale', 'RentAndSale') NOT NULL DEFAULT 'Sale',
    `model` VARCHAR(160) NULL,
    `year` INTEGER NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `description` LONGTEXT NULL,
    `imageUrl` VARCHAR(1500) NULL,
    `imageKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `categoryId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `products_categoryId_idx`(`categoryId`),
    INDEX `products_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transportations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `model` VARCHAR(160) NULL,
    `mileageKm` INTEGER NULL,
    `capacity` INTEGER NULL,
    `year` INTEGER NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `description` LONGTEXT NULL,
    `imageUrl` VARCHAR(1500) NULL,
    `imageKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `categoryId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `transportations_categoryId_idx`(`categoryId`),
    INDEX `transportations_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `accommodations` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `addressId` INTEGER NULL,
    `roomsQuantity` INTEGER NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `description` LONGTEXT NULL,
    `imageUrl` VARCHAR(1500) NULL,
    `imageKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `categoryId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `accommodations_addressId_key`(`addressId`),
    INDEX `accommodations_addressId_idx`(`addressId`),
    INDEX `accommodations_categoryId_idx`(`categoryId`),
    INDEX `accommodations_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addresses` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `street` VARCHAR(160) NULL,
    `neighborhood` VARCHAR(120) NULL,
    `city` VARCHAR(120) NULL,
    `state` VARCHAR(120) NULL,
    `zipCode` VARCHAR(20) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bank_accounts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `bankName` VARCHAR(120) NOT NULL,
    `accountType` ENUM('Checking', 'Savings') NOT NULL,
    `agency` VARCHAR(30) NOT NULL,
    `account` VARCHAR(30) NOT NULL,
    `cpf` VARCHAR(14) NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `bank_accounts_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `services` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(160) NOT NULL,
    `type` ENUM('Online', 'Presential', 'Home') NOT NULL,
    `registrationCode` VARCHAR(80) NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `description` LONGTEXT NULL,
    `imageUrl` VARCHAR(1500) NULL,
    `imageKey` VARCHAR(1500) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `categoryId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `services_categoryId_idx`(`categoryId`),
    INDEX `services_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('Positive', 'Negative') NOT NULL,
    `comment` LONGTEXT NULL,
    `serviceId` INTEGER NULL,
    `productId` INTEGER NULL,
    `accommodationId` INTEGER NULL,
    `transportationId` INTEGER NULL,
    `requesterId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `reviews_serviceId_idx`(`serviceId`),
    INDEX `reviews_productId_idx`(`productId`),
    INDEX `reviews_accommodationId_idx`(`accommodationId`),
    INDEX `reviews_transportationId_idx`(`transportationId`),
    INDEX `reviews_requesterId_idx`(`requesterId`),
    INDEX `reviews_type_idx`(`type`),
    UNIQUE INDEX `reviews_serviceId_requesterId_key`(`serviceId`, `requesterId`),
    UNIQUE INDEX `reviews_productId_requesterId_key`(`productId`, `requesterId`),
    UNIQUE INDEX `reviews_accommodationId_requesterId_key`(`accommodationId`, `requesterId`),
    UNIQUE INDEX `reviews_transportationId_requesterId_key`(`transportationId`, `requesterId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budgets` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `description` LONGTEXT NULL,
    `status` ENUM('Pending', 'Responded', 'WaitingInformation', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `responseDescription` LONGTEXT NULL,
    `responseValue` DECIMAL(10, 2) NULL,
    `extraRequestValue` DECIMAL(10, 2) NULL,
    `extraRequestDescription` LONGTEXT NULL,
    `extraRequestStatus` ENUM('Pending', 'Approved', 'Rejected') NULL,
    `extraRequestedAt` DATETIME(3) NULL,
    `extraRespondedAt` DATETIME(3) NULL,
    `responseTimeQuantity` INTEGER NULL,
    `responseTimeUnit` ENUM('Hour', 'Day', 'Week', 'Month') NULL,
    `serviceId` INTEGER NULL,
    `requesterId` INTEGER NOT NULL,
    `providerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budgets_serviceId_idx`(`serviceId`),
    INDEX `budgets_requesterId_idx`(`requesterId`),
    INDEX `budgets_providerId_idx`(`providerId`),
    INDEX `budgets_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(1500) NOT NULL,
    `fileKey` VARCHAR(1500) NOT NULL,
    `type` ENUM('Request', 'InformationRequest') NOT NULL DEFAULT 'Request',
    `budgetId` INTEGER NOT NULL,
    `informationRequestId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budget_files_budgetId_idx`(`budgetId`),
    INDEX `budget_files_informationRequestId_idx`(`informationRequestId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `budget_information` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `message` LONGTEXT NOT NULL,
    `budgetId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `budget_information_budgetId_idx`(`budgetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `works` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('Pending', 'InProgress', 'Finished', 'Cancelled') NOT NULL DEFAULT 'Pending',
    `details` LONGTEXT NULL,
    `completionDescription` LONGTEXT NULL,
    `cancelReason` LONGTEXT NULL,
    `serviceDate` DATETIME(3) NULL,
    `startedAt` DATETIME(3) NULL,
    `arrivalConfirmedAt` DATETIME(3) NULL,
    `finishedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `warrantyExpiresAt` DATETIME(3) NULL,
    `warrantyRequestedAt` DATETIME(3) NULL,
    `warrantyRequestDescription` LONGTEXT NULL,
    `warrantyRequestStatus` ENUM('Pending', 'Approved', 'Rejected') NULL,
    `warrantyResponseDescription` LONGTEXT NULL,
    `warrantyRespondedAt` DATETIME(3) NULL,
    `extraRequestValue` DECIMAL(10, 2) NULL,
    `extraRequestDescription` LONGTEXT NULL,
    `extraRequestStatus` ENUM('Pending', 'Approved', 'Rejected') NULL,
    `extraRequestedAt` DATETIME(3) NULL,
    `extraRespondedAt` DATETIME(3) NULL,
    `serviceValue` DECIMAL(10, 2) NULL,
    `totalValue` DECIMAL(10, 2) NULL,
    `budgetId` INTEGER NOT NULL,
    `serviceId` INTEGER NOT NULL,
    `requesterId` INTEGER NOT NULL,
    `providerId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `works_budgetId_key`(`budgetId`),
    INDEX `works_serviceId_idx`(`serviceId`),
    INDEX `works_requesterId_idx`(`requesterId`),
    INDEX `works_providerId_idx`(`providerId`),
    INDEX `works_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_rooms` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `contextType` ENUM('Budget', 'Work', 'CommercialTransaction') NOT NULL,
    `referenceId` INTEGER NOT NULL,
    `createdById` INTEGER NULL,
    `lastMessageAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chat_rooms_createdById_idx`(`createdById`),
    INDEX `chat_rooms_contextType_referenceId_idx`(`contextType`, `referenceId`),
    INDEX `chat_rooms_lastMessageAt_idx`(`lastMessageAt`),
    UNIQUE INDEX `chat_rooms_contextType_referenceId_key`(`contextType`, `referenceId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_participants` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roomId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `lastReadAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chat_participants_roomId_idx`(`roomId`),
    INDEX `chat_participants_userId_idx`(`userId`),
    UNIQUE INDEX `chat_participants_roomId_userId_key`(`roomId`, `userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `roomId` INTEGER NOT NULL,
    `senderId` INTEGER NOT NULL,
    `message` LONGTEXT NULL,
    `fileName` VARCHAR(191) NULL,
    `fileUrl` VARCHAR(1500) NULL,
    `fileKey` VARCHAR(1500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `chat_messages_roomId_idx`(`roomId`),
    INDEX `chat_messages_senderId_idx`(`senderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `commercial_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `referenceType` ENUM('Product') NOT NULL,
    `referenceId` INTEGER NOT NULL,
    `status` ENUM('Requested', 'Accepted', 'Rejected', 'Cancelled', 'Paid', 'Completed') NOT NULL DEFAULT 'Requested',
    `title` VARCHAR(191) NULL,
    `description` LONGTEXT NULL,
    `requestedAmount` DECIMAL(10, 2) NOT NULL,
    `agreedAmount` DECIMAL(10, 2) NULL,
    `buyerId` INTEGER NOT NULL,
    `sellerId` INTEGER NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `rejectedAt` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `paidAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `commercial_transactions_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `commercial_transactions_buyerId_idx`(`buyerId`),
    INDEX `commercial_transactions_sellerId_idx`(`sellerId`),
    INDEX `commercial_transactions_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `method` ENUM('CreditCard', 'Pix', 'BankSlip') NOT NULL,
    `status` ENUM('Pending', 'Paid', 'Cancelled') NOT NULL DEFAULT 'Paid',
    `referenceType` ENUM('Work', 'CommercialTransaction', 'Subscription') NOT NULL,
    `referenceId` INTEGER NOT NULL,
    `holderName` VARCHAR(160) NULL,
    `cardBrand` VARCHAR(60) NULL,
    `cardLast4` VARCHAR(4) NULL,
    `amount` DECIMAL(10, 2) NOT NULL,
    `paidAt` DATETIME(3) NULL,
    `payerId` INTEGER NOT NULL,
    `receiverId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `payments_payerId_idx`(`payerId`),
    INDEX `payments_receiverId_idx`(`receiverId`),
    INDEX `payments_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `payments_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(120) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `description` LONGTEXT NULL,
    `price` DECIMAL(10, 2) NOT NULL,
    `interval` ENUM('Month', 'Year') NOT NULL,
    `intervalCount` INTEGER NOT NULL DEFAULT 1,
    `benefits` JSON NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `plans_slug_key`(`slug`),
    INDEX `plans_isActive_idx`(`isActive`),
    INDEX `plans_sortOrder_idx`(`sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subscriptions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `status` ENUM('Active', 'Cancelled', 'Expired') NOT NULL DEFAULT 'Active',
    `amount` DECIMAL(10, 2) NOT NULL,
    `planName` VARCHAR(120) NOT NULL,
    `planInterval` ENUM('Month', 'Year') NOT NULL,
    `intervalCount` INTEGER NOT NULL DEFAULT 1,
    `startedAt` DATETIME(3) NULL,
    `currentPeriodStart` DATETIME(3) NULL,
    `currentPeriodEnd` DATETIME(3) NULL,
    `cancelledAt` DATETIME(3) NULL,
    `userId` INTEGER NOT NULL,
    `planId` INTEGER NOT NULL,
    `addressId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `subscriptions_userId_idx`(`userId`),
    INDEX `subscriptions_planId_idx`(`planId`),
    INDEX `subscriptions_addressId_idx`(`addressId`),
    INDEX `subscriptions_status_idx`(`status`),
    INDEX `subscriptions_currentPeriodEnd_idx`(`currentPeriodEnd`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `financial_transactions` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('Credit', 'Debit') NOT NULL,
    `category` ENUM('WorkPayment', 'CommercialTransaction', 'Subscription', 'Fee', 'Withdrawal', 'Refund', 'Adjustment') NOT NULL,
    `status` ENUM('Pending', 'Paid', 'Cancelled') NOT NULL DEFAULT 'Paid',
    `amount` DECIMAL(10, 2) NOT NULL,
    `description` VARCHAR(255) NULL,
    `availableAt` DATETIME(3) NULL,
    `referenceType` ENUM('Work', 'CommercialTransaction', 'Subscription') NOT NULL,
    `referenceId` INTEGER NOT NULL,
    `userId` INTEGER NOT NULL,
    `paymentId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `financial_transactions_userId_idx`(`userId`),
    INDEX `financial_transactions_paymentId_idx`(`paymentId`),
    INDEX `financial_transactions_referenceType_referenceId_idx`(`referenceType`, `referenceId`),
    INDEX `financial_transactions_type_status_idx`(`type`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `work_files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileName` VARCHAR(191) NOT NULL,
    `fileUrl` VARCHAR(1500) NOT NULL,
    `fileKey` VARCHAR(1500) NOT NULL,
    `type` ENUM('Requester', 'Provider', 'Completion', 'WarrantyRequest') NOT NULL DEFAULT 'Requester',
    `workId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `work_files_workId_idx`(`workId`),
    INDEX `work_files_type_idx`(`type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `files` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `fileUrl` VARCHAR(1500) NULL,
    `fileKey` VARCHAR(1500) NULL,
    `userId` INTEGER NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `texts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `type` ENUM('About', 'Policies', 'Terms', 'Tips', 'Cookies') NOT NULL,
    `text` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_AdminPermissionToUser` (
    `A` INTEGER NOT NULL,
    `B` INTEGER NOT NULL,

    UNIQUE INDEX `_AdminPermissionToUser_AB_unique`(`A`, `B`),
    INDEX `_AdminPermissionToUser_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `product_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transportations` ADD CONSTRAINT `transportations_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `transportation_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transportations` ADD CONSTRAINT `transportations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accommodations` ADD CONSTRAINT `accommodations_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accommodations` ADD CONSTRAINT `accommodations_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `accommodation_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `accommodations` ADD CONSTRAINT `accommodations_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `service_categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `services` ADD CONSTRAINT `services_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_accommodationId_fkey` FOREIGN KEY (`accommodationId`) REFERENCES `accommodations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_transportationId_fkey` FOREIGN KEY (`transportationId`) REFERENCES `transportations`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budgets` ADD CONSTRAINT `budgets_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_files` ADD CONSTRAINT `budget_files_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_files` ADD CONSTRAINT `budget_files_informationRequestId_fkey` FOREIGN KEY (`informationRequestId`) REFERENCES `budget_information`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `budget_information` ADD CONSTRAINT `budget_information_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `works` ADD CONSTRAINT `works_budgetId_fkey` FOREIGN KEY (`budgetId`) REFERENCES `budgets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `works` ADD CONSTRAINT `works_serviceId_fkey` FOREIGN KEY (`serviceId`) REFERENCES `services`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `works` ADD CONSTRAINT `works_requesterId_fkey` FOREIGN KEY (`requesterId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `works` ADD CONSTRAINT `works_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_rooms` ADD CONSTRAINT `chat_rooms_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participants` ADD CONSTRAINT `chat_participants_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `chat_rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_participants` ADD CONSTRAINT `chat_participants_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_roomId_fkey` FOREIGN KEY (`roomId`) REFERENCES `chat_rooms`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_senderId_fkey` FOREIGN KEY (`senderId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commercial_transactions` ADD CONSTRAINT `commercial_transactions_buyerId_fkey` FOREIGN KEY (`buyerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commercial_transactions` ADD CONSTRAINT `commercial_transactions_sellerId_fkey` FOREIGN KEY (`sellerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `commercial_transactions` ADD CONSTRAINT `commercial_transactions_referenceId_fkey` FOREIGN KEY (`referenceId`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_payerId_fkey` FOREIGN KEY (`payerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_receiverId_fkey` FOREIGN KEY (`receiverId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_planId_fkey` FOREIGN KEY (`planId`) REFERENCES `plans`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_addressId_fkey` FOREIGN KEY (`addressId`) REFERENCES `addresses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `financial_transactions` ADD CONSTRAINT `financial_transactions_paymentId_fkey` FOREIGN KEY (`paymentId`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `work_files` ADD CONSTRAINT `work_files_workId_fkey` FOREIGN KEY (`workId`) REFERENCES `works`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `files` ADD CONSTRAINT `files_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdminPermissionToUser` ADD CONSTRAINT `_AdminPermissionToUser_A_fkey` FOREIGN KEY (`A`) REFERENCES `admin_permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_AdminPermissionToUser` ADD CONSTRAINT `_AdminPermissionToUser_B_fkey` FOREIGN KEY (`B`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
