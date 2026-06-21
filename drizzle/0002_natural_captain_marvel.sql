ALTER TABLE `profiles` MODIFY COLUMN `experienceLevel` enum('none','beginner','intermediate','advanced');--> statement-breakpoint
ALTER TABLE `profiles` ADD `targetMuscles` json;