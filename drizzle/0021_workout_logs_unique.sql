-- workout_logs に複合 UNIQUE 制約を追加（同日の同一セット重複防止）
ALTER TABLE `workout_logs`
  ADD CONSTRAINT `workout_logs_unique_set`
  UNIQUE (`userId`, `menuId`, `phaseIndex`, `dayIndex`, `exerciseName`, `setIndex`, `logged_date`);
