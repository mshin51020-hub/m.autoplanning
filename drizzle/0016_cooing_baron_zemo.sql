CREATE TABLE `workout_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`menuId` int NOT NULL,
	`dayIndex` int NOT NULL,
	`phaseIndex` int NOT NULL DEFAULT 0,
	`exerciseName` varchar(255) NOT NULL,
	`setIndex` int NOT NULL,
	`plannedReps` int,
	`plannedWeight` float,
	`actualReps` int,
	`actualWeight` float,
	`completed` int NOT NULL DEFAULT 0,
	`note` varchar(500),
	`loggedAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `workout_logs_id` PRIMARY KEY(`id`)
);
