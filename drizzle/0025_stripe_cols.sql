ALTER TABLE `users`
  ADD COLUMN `stripeCustomerId` VARCHAR(255) NULL,
  ADD COLUMN `stripeSubscriptionId` VARCHAR(255) NULL;
