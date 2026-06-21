ALTER TABLE `users`
  ADD COLUMN `userPlanType` ENUM('free','premium','premium_plus') NOT NULL DEFAULT 'free',
  ADD COLUMN `premiumUntil` DATETIME NULL;
