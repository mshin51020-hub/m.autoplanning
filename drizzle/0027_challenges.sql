CREATE TABLE `challenges` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `type` enum('streak','pr','monthly_sessions','total_volume') NOT NULL,
  `title` varchar(255) NOT NULL,
  `targetValue` float NOT NULL,
  `exerciseName` varchar(255),
  `startDate` varchar(10) NOT NULL,
  `endDate` varchar(10) NOT NULL,
  `completedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT NOW(),
  CONSTRAINT `challenges_pk` PRIMARY KEY(`id`)
);
