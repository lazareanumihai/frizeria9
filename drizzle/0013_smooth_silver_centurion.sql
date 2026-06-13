CREATE TABLE `tenants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`slug` varchar(100) NOT NULL,
	`adminEmail` varchar(320),
	`basePricePerBarber` decimal(10,2) NOT NULL DEFAULT '50',
	`currentMonthlyTotal` decimal(10,2) NOT NULL DEFAULT '0',
	`isActive` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tenants_id` PRIMARY KEY(`id`),
	CONSTRAINT `tenants_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('user','admin','super_admin') NOT NULL DEFAULT 'user';--> statement-breakpoint
ALTER TABLE `barberAvailability` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `barbers` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `blockedHours` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `bookings` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `services` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `settings` ADD `tenantId` int;--> statement-breakpoint
ALTER TABLE `users` ADD `tenantId` int;