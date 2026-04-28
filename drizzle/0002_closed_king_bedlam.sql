CREATE TABLE `settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`businessHours` text,
	`servicePrices` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `settings_id` PRIMARY KEY(`id`)
);
