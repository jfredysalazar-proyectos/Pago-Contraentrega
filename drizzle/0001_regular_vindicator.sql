CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`orderNumber` varchar(64) NOT NULL,
	`dropiOrderId` varchar(128),
	`productId` int,
	`productName` varchar(512) NOT NULL,
	`productPrice` decimal(12,2) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`customerName` varchar(256),
	`customerPhone` varchar(32),
	`customerEmail` varchar(320),
	`shippingAddress` text,
	`shippingCity` varchar(128),
	`shippingDepartment` varchar(128),
	`shippingPostalCode` varchar(16),
	`status` enum('pending','confirmed','processing','shipped','delivered','cancelled','returned') NOT NULL DEFAULT 'pending',
	`trackingNumber` varchar(128),
	`trackingUrl` text,
	`carrier` varchar(128),
	`source` enum('whatsapp','web','admin') DEFAULT 'whatsapp',
	`whatsappConversationId` int,
	`notes` text,
	`confirmedAt` timestamp,
	`shippedAt` timestamp,
	`deliveredAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_orderNumber_unique` UNIQUE(`orderNumber`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`dropiId` varchar(128) NOT NULL,
	`slug` varchar(256) NOT NULL,
	`name` varchar(512) NOT NULL,
	`description` text,
	`shortDescription` text,
	`price` decimal(12,2) NOT NULL,
	`comparePrice` decimal(12,2),
	`sku` varchar(128),
	`brand` varchar(256),
	`category` varchar(256),
	`subcategory` varchar(256),
	`images` json DEFAULT ('[]'),
	`mainImage` text,
	`stock` int DEFAULT 0,
	`weight` decimal(8,2),
	`dimensions` json,
	`tags` json DEFAULT ('[]'),
	`attributes` json,
	`isActive` boolean NOT NULL DEFAULT true,
	`isFeatured` boolean NOT NULL DEFAULT false,
	`metaTitle` varchar(256),
	`metaDescription` text,
	`googleCategory` varchar(512),
	`gtin` varchar(64),
	`mpn` varchar(128),
	`condition` enum('new','used','refurbished') DEFAULT 'new',
	`lastSyncedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_dropiId_unique` UNIQUE(`dropiId`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`key` varchar(128) NOT NULL,
	`value` text,
	`description` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `settings_key_unique` UNIQUE(`key`)
);
--> statement-breakpoint
CREATE TABLE `sync_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('full','incremental','manual') NOT NULL,
	`status` enum('running','success','error') NOT NULL,
	`productsFound` int DEFAULT 0,
	`productsCreated` int DEFAULT 0,
	`productsUpdated` int DEFAULT 0,
	`productsDeactivated` int DEFAULT 0,
	`errorMessage` text,
	`duration` int,
	`startedAt` timestamp NOT NULL DEFAULT (now()),
	`finishedAt` timestamp,
	CONSTRAINT `sync_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`phoneNumber` varchar(32) NOT NULL,
	`customerName` varchar(256),
	`state` enum('greeting','product_inquiry','collecting_name','collecting_address','collecting_city','collecting_phone','confirming_order','order_placed','tracking','closed') NOT NULL DEFAULT 'greeting',
	`context` json DEFAULT ('{}'),
	`productId` int,
	`productName` varchar(512),
	`orderId` int,
	`lastMessageAt` timestamp DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `whatsapp_conversations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `whatsapp_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`role` enum('user','assistant') NOT NULL,
	`content` text NOT NULL,
	`messageId` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `whatsapp_messages_id` PRIMARY KEY(`id`)
);
