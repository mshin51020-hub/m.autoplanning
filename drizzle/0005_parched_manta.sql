CREATE TABLE `global_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`settingKey` varchar(128) NOT NULL,
	`settingValue` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `global_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `global_settings_settingKey_unique` UNIQUE(`settingKey`)
);
--> statement-breakpoint
ALTER TABLE `exercise_weights` ADD `maleBeginnerMultiplier` float DEFAULT 0.6 NOT NULL;--> statement-breakpoint
ALTER TABLE `exercise_weights` ADD `maleIntermediateMultiplier` float DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `exercise_weights` ADD `maleAdvancedMultiplier` float DEFAULT 1.3 NOT NULL;