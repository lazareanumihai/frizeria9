CREATE TABLE `blockedHours` (
	`id` int AUTO_INCREMENT NOT NULL,
	`barberId` int NOT NULL,
	`date` date NOT NULL,
	`hour` int NOT NULL,
	`reason` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `blockedHours_id` PRIMARY KEY(`id`)
);
