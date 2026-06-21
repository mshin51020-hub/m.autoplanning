ALTER TABLE `exercise_weights` ADD `difficulty` enum('beginner','intermediate','advanced') DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE `exercise_weights` ADD `equipment` enum('home','gym','both') DEFAULT 'both' NOT NULL;--> statement-breakpoint
ALTER TABLE `exercise_weights` ADD `createdAt` timestamp DEFAULT (now()) NOT NULL;