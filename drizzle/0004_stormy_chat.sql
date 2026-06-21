CREATE TABLE `exercise_weights` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exerciseName` varchar(255) NOT NULL,
	`muscleGroup` varchar(64) NOT NULL,
	`femaleBaseWeight` float,
	`maleBaseWeight` float,
	`beginnerMultiplier` float NOT NULL DEFAULT 0.6,
	`intermediateMultiplier` float NOT NULL DEFAULT 1,
	`advancedMultiplier` float NOT NULL DEFAULT 1.3,
	`weightRatio` float,
	`isBodyweight` int NOT NULL DEFAULT 0,
	`notes` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exercise_weights_id` PRIMARY KEY(`id`),
	CONSTRAINT `exercise_weights_exerciseName_unique` UNIQUE(`exerciseName`)
);
