CREATE TABLE `generated_menus` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`profileSnapshot` json,
	`menuData` json NOT NULL,
	`planType` enum('weekly','monthly','quarterly','yearly'),
	`planDuration` varchar(32),
	`title` varchar(255),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `generated_menus_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`height` float,
	`weight` float,
	`age` int,
	`gender` enum('male','female','other'),
	`experienceLevel` enum('beginner','intermediate','advanced'),
	`goal` enum('muscle_gain','fat_loss','strength','endurance','health'),
	`availableDaysPerWeek` int,
	`equipmentAccess` enum('home','gym','both'),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`)
);
