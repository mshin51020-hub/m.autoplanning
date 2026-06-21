CREATE TABLE IF NOT EXISTS `body_measurements` (
  `id`           INT AUTO_INCREMENT PRIMARY KEY,
  `userId`       INT NOT NULL,
  `measuredDate` VARCHAR(10) NOT NULL,
  `weight`       FLOAT,
  `bodyFat`      FLOAT,
  `note`         VARCHAR(500),
  `createdAt`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updatedAt`    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY `user_date_unique` (`userId`, `measuredDate`)
);
