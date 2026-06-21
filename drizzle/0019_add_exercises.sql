-- 新規種目の追加（45種目 → 62種目）
-- 胸・背中・肩・脚・腹筋の各部位に一般的な種目を追加

INSERT IGNORE INTO `exercise_weights` (
  `exerciseName`, `muscleGroup`,
  `femaleBaseWeight`, `maleBaseWeight`,
  `noneMultiplier`, `beginnerMultiplier`, `intermediateMultiplier`, `advancedMultiplier`,
  `maleNoneMultiplier`, `maleBeginnerMultiplier`, `maleIntermediateMultiplier`, `maleAdvancedMultiplier`,
  `weightRatio`, `isBodyweight`, `difficulty`, `equipment`, `equipment_category`
) VALUES
-- 胸
('インクラインベンチプレス', '胸', 25, 50, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, 0.5, 0, 'intermediate,advanced', 'gym', 'barbell'),
('ワイドプッシュアップ',     '胸', NULL, NULL, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, NULL, 1, 'beginner,intermediate', 'home', 'bodyweight'),
('デクラインプッシュアップ', '胸', NULL, NULL, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, NULL, 1, 'intermediate,advanced', 'both', 'bodyweight'),

-- 背中
('チンアップ',         '背中', NULL, NULL, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, NULL, 1, 'intermediate,advanced', 'both', 'bodyweight'),
('ダンベルシュラッグ', '背中', 8,    16,   0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, 0.3, 0, 'beginner,intermediate,advanced', 'home', 'dumbbell'),
('バーベルシュラッグ', '背中', 30,   60,   0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, 0.4, 0, 'intermediate,advanced', 'gym', 'barbell'),
('インバーテッドロウ', '背中', NULL, NULL, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, NULL, 1, 'beginner,intermediate', 'home', 'bodyweight'),

-- 肩
('アップライトロウ',     '肩', 12, 25, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, 0.3, 0, 'beginner,intermediate', 'both', 'barbell'),
('ケーブルサイドレイズ', '肩', 4,  7,  0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, 0.2, 0, 'intermediate,advanced', 'gym', 'machine'),

-- 脚
('ヒップスラスト',    '脚', 20, 40, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, 0.4, 0, 'beginner,intermediate,advanced', 'both', 'barbell'),
('スモウスクワット',  '脚', 8,  16, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, 0.3, 0, 'beginner,intermediate', 'home', 'dumbbell'),
('グルートキックバック', '脚', NULL, NULL, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, NULL, 1, 'beginner,intermediate', 'home', 'bodyweight'),
('ヒップアブダクション', '脚', 30, 50, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, 0.3, 0, 'beginner,intermediate,advanced', 'gym', 'machine'),

-- 腹筋
('サイドプランク',       '腹筋', NULL, NULL, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, NULL, 1, 'beginner,intermediate,advanced', 'home', 'bodyweight'),
('バイシクルクランチ',   '腹筋', NULL, NULL, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, NULL, 1, 'beginner,intermediate', 'home', 'bodyweight'),
('ドラゴンフラッグ',     '腹筋', NULL, NULL, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, NULL, 1, 'advanced', 'both', 'bodyweight'),
('ハンギングレッグレイズ', '腹筋', NULL, NULL, 0.4, 0.6, 1.0, 1.3, 0.4, 0.6, 1.0, 1.3, NULL, 1, 'intermediate,advanced', 'both', 'bodyweight');
