CREATE TABLE `exercise_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exerciseNameJa` varchar(255) NOT NULL,
	`imageUrl` text NOT NULL,
	`source` enum('wger','ai') NOT NULL DEFAULT 'wger',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exercise_images_id` PRIMARY KEY(`id`),
	CONSTRAINT `exercise_images_exerciseNameJa_unique` UNIQUE(`exerciseNameJa`)
);
