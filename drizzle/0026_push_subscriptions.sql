CREATE TABLE `push_subscriptions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `userId` INT NOT NULL,
  `endpoint` TEXT NOT NULL,
  `p256dh` VARCHAR(512) NOT NULL,
  `auth` VARCHAR(128) NOT NULL,
  `createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `unique_endpoint` (`endpoint`(512))
);
