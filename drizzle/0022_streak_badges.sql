CREATE TABLE IF NOT EXISTS `user_streaks` (
  `id`              INT AUTO_INCREMENT PRIMARY KEY,
  `userId`          INT NOT NULL UNIQUE,
  `currentStreak`   INT NOT NULL DEFAULT 0,
  `longestStreak`   INT NOT NULL DEFAULT 0,
  `lastWorkoutDate` VARCHAR(10),
  `freezesLeft`     INT NOT NULL DEFAULT 2,
  `lastFreezeMonth` VARCHAR(7),
  `updatedAt`       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `user_badges` (
  `id`       INT AUTO_INCREMENT PRIMARY KEY,
  `userId`   INT NOT NULL,
  `badgeId`  VARCHAR(64) NOT NULL,
  `earnedAt` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `user_badge_unique` (`userId`, `badgeId`)
);
