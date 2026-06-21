-- users.email に UNIQUE 制約を追加
-- 既存の重複データがある場合は先に手動で解消してから実行すること
ALTER TABLE `users` MODIFY COLUMN `email` varchar(320);
ALTER TABLE `users` ADD CONSTRAINT `users_email_unique` UNIQUE (`email`);
