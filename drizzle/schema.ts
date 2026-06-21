import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, float, uniqueIndex, unique } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  disclaimerAgreedAt: timestamp("disclaimerAgreedAt"), // 免責事項に同意した日時（null=未同意）
  passwordHash: varchar("passwordHash", { length: 255 }), // 独自認証用パスワードハッシュ（null=OAuth専用ユーザー）
  resetToken: varchar("resetToken", { length: 128 }), // パスワードリセットトークン
  resetTokenExpires: timestamp("resetTokenExpires"), // リセットトークンの有効期限
  userPlanType: mysqlEnum("userPlanType", ["free", "premium", "premium_plus"]).default("free").notNull(),
  premiumUntil: timestamp("premiumUntil"), // null = 無期限 or 未課金
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
});

export const pushSubscriptions = mysqlTable("push_subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  endpoint: text("endpoint").notNull(),
  p256dh: varchar("p256dh", { length: 512 }).notNull(),
  auth: varchar("auth", { length: 128 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * ユーザープロフィール（身体情報・目標設定）
 */
export const profiles = mysqlTable("profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  height: float("height"), // cm
  weight: float("weight"), // kg
  age: int("age"),
  gender: mysqlEnum("gender", ["male", "female", "other"]),
  experienceLevel: mysqlEnum("experienceLevel", ["none", "beginner", "intermediate", "advanced"]),
  goal: mysqlEnum("goal", ["muscle_gain", "fat_loss", "strength", "endurance", "health"]),
  availableDaysPerWeek: int("availableDaysPerWeek"), // 1-7
  dailyMinutes: int("dailyMinutes"), // 1日のトレーニング時間（分）
  equipmentAccess: mysqlEnum("equipmentAccess", ["home", "gym", "both"]),
  targetMuscles: json("targetMuscles"), // ["胸", "背中", ...] 特に鍛えたい部位
  trainingDays: json("training_days"), // ["月曜日", "水曜日", "金曜日"] トレーニングする曜日
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

/**
 * 生成されたトレーニングメニュー
 */
export const generatedMenus = mysqlTable("generated_menus", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  profileSnapshot: json("profileSnapshot"), // 生成時のプロフィールスナップショット
  menuData: json("menuData").notNull(), // 生成されたメニューデータ（種目・セット・レップ等）
  planType: mysqlEnum("planType", ["weekly", "monthly", "quarterly", "yearly"]),
  planDuration: varchar("planDuration", { length: 32 }), // "1week", "1month", "3months", "6months", "12months"
  title: varchar("title", { length: 255 }),
  planName: varchar("planName", { length: 255 }), // ユーザーが編集可能なプラン名（自動生成または手動入力）
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GeneratedMenu = typeof generatedMenus.$inferSelect;
export type InsertGeneratedMenu = typeof generatedMenus.$inferInsert;

/**
 * 種目ごとの基礎重量データ（管理者が入力）
 * 性別・体重に応じた推奨重量を保持する
 */
export const exerciseWeights = mysqlTable("exercise_weights", {
  id: int("id").autoincrement().primaryKey(),
  exerciseName: varchar("exerciseName", { length: 255 }).notNull().unique(),
  muscleGroup: varchar("muscleGroup", { length: 64 }).notNull(),
  // 女性（身長158cm・体重55kg標準）の基礎重量（kg）。自重種目はnull
  femaleBaseWeight: float("femaleBaseWeight"),
  // 男性（身長171cm・体重64kg標準）の基礎重量（kg）。自重種目はnull
  maleBaseWeight: float("maleBaseWeight"),
  // 女性用係数（基礎重量に掛ける。例: 0.6 = 60%）
  noneMultiplier: float("noneMultiplier").default(0.4).notNull(), // 完全初心者
  beginnerMultiplier: float("beginnerMultiplier").default(0.6).notNull(),
  intermediateMultiplier: float("intermediateMultiplier").default(1.0).notNull(),
  advancedMultiplier: float("advancedMultiplier").default(1.3).notNull(),
  // 男性用係数
  maleNoneMultiplier: float("maleNoneMultiplier").default(0.4).notNull(), // 完全初心者
  maleBeginnerMultiplier: float("maleBeginnerMultiplier").default(0.6).notNull(),
  maleIntermediateMultiplier: float("maleIntermediateMultiplier").default(1.0).notNull(),
  maleAdvancedMultiplier: float("maleAdvancedMultiplier").default(1.3).notNull(),
  // 体重あたりの係数（例: 0.5 = 体重の50%）。体重比例で計算する場合に使用
  weightRatio: float("weightRatio"),
  isBodyweight: int("isBodyweight").default(0).notNull(), // 1=自重種目
  // 種目の難易度（複数選択可。カンマ区切り文字列で格納。例: "beginner" または "beginner,intermediate"）
  difficulty: varchar("difficulty", { length: 64 }).notNull().default("beginner"),
  // 必要設備（home=自宅・ダンベルのみ、gym=ジム必須、both=両方対応）
  equipment: mysqlEnum("equipment", ["home", "gym", "both"]).default("both").notNull(),
  // 器具種別（dumbbell=ダンベル、barbell=バーベル、machine=マシン、bodyweight=自重、other=その他）
  equipmentCategory: varchar("equipment_category", { length: 32 }).default("other"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExerciseWeight = typeof exerciseWeights.$inferSelect;
export type InsertExerciseWeight = typeof exerciseWeights.$inferInsert;

/**
 * グローバル設定（管理者が一括設定する係数等）
 */
export const globalSettings = mysqlTable("global_settings", {
  id: int("id").autoincrement().primaryKey(),
  settingKey: varchar("settingKey", { length: 128 }).notNull().unique(),
  settingValue: json("settingValue").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GlobalSetting = typeof globalSettings.$inferSelect;
export type InsertGlobalSetting = typeof globalSettings.$inferInsert;

/**
 * お問い合わせフォームの投稿内容
 */
export const contacts = mysqlTable("contacts", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 128 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  category: mysqlEnum("category", ["feature", "bug", "other"]).notNull().default("other"),
  message: text("message").notNull(),
  isRead: int("isRead").default(0).notNull(), // 0=未読, 1=既読
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Contact = typeof contacts.$inferSelect;
export type InsertContact = typeof contacts.$inferInsert;

/**
 * トレーニング種目画像キャッシュ
 * Wger APIまたはAI生成で取得した画像データをキャッシュしてAPI呼び出しを最小化
 */
export const exerciseImages = mysqlTable("exercise_images", {
  id: int("id").autoincrement().primaryKey(),
  exerciseNameJa: varchar("exerciseNameJa", { length: 255 }).notNull().unique(),
  imageUrl: text("imageUrl").notNull(),
  source: mysqlEnum("source", ["wger", "ai"]).notNull().default("wger"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ExerciseImage = typeof exerciseImages.$inferSelect;
export type InsertExerciseImage = typeof exerciseImages.$inferInsert;

/**
 * ユーザーのストリーク（連続記録）管理
 */
export const userStreaks = mysqlTable("user_streaks", {
  id:              int("id").autoincrement().primaryKey(),
  userId:          int("userId").notNull().unique(),
  currentStreak:   int("currentStreak").notNull().default(0),
  longestStreak:   int("longestStreak").notNull().default(0),
  lastWorkoutDate: varchar("lastWorkoutDate", { length: 10 }), // YYYY-MM-DD
  freezesLeft:     int("freezesLeft").notNull().default(2),
  lastFreezeMonth: varchar("lastFreezeMonth", { length: 7 }), // YYYY-MM
  updatedAt:       timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserStreak = typeof userStreaks.$inferSelect;
export type InsertUserStreak = typeof userStreaks.$inferInsert;

/**
 * ユーザーが獲得したバッジ
 */
export const userBadges = mysqlTable("user_badges", {
  id:       int("id").autoincrement().primaryKey(),
  userId:   int("userId").notNull(),
  badgeId:  varchar("badgeId", { length: 64 }).notNull(),
  earnedAt: timestamp("earnedAt").defaultNow().notNull(),
}, (table) => ({
  userBadgeUnique: unique("user_badge_unique").on(table.userId, table.badgeId),
}));

export type UserBadge = typeof userBadges.$inferSelect;
export type InsertUserBadge = typeof userBadges.$inferInsert;

/**
 * 体重・体脂肪の日次記録
 */
export const bodyMeasurements = mysqlTable("body_measurements", {
  id:           int("id").autoincrement().primaryKey(),
  userId:       int("userId").notNull(),
  measuredDate: varchar("measuredDate", { length: 10 }).notNull(), // YYYY-MM-DD
  weight:       float("weight"),
  bodyFat:      float("bodyFat"),
  note:         varchar("note", { length: 500 }),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
  updatedAt:    timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userDateUnique: unique("user_date_unique").on(table.userId, table.measuredDate),
}));

export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type InsertBodyMeasurement = typeof bodyMeasurements.$inferInsert;

/**
 * ワークアウト記録
 * ユーザーが実際に行ったトレーニングの実績（重量・レップ数・完了フラグ）を記録する
 */
export const workoutLogs = mysqlTable("workout_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  menuId: int("menuId").notNull(), // generated_menus.id
  dayIndex: int("dayIndex").notNull(), // 週の何日目か（0-6）
  phaseIndex: int("phaseIndex").notNull().default(0), // フェーズ番号（1週間プランは常に0）
  exerciseName: varchar("exerciseName", { length: 255 }).notNull(), // 種目名
  setIndex: int("setIndex").notNull(), // セット番号（0始まり）
  plannedReps: int("plannedReps"), // 計画レップ数
  plannedWeight: float("plannedWeight"), // 計画重量（kg）
  actualReps: int("actualReps"), // 実際のレップ数
  actualWeight: float("actualWeight"), // 実際の重量（kg）
  completed: int("completed").default(0).notNull(), // 0=未完了, 1=完了
  note: varchar("note", { length: 500 }), // メモ
  loggedDate: varchar("logged_date", { length: 10 }).notNull().default(""), // YYYY-MM-DD（日付ごとに別セッション）
  loggedAt: timestamp("loggedAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  uniqueSet: uniqueIndex("workout_logs_unique_set").on(
    table.userId, table.menuId, table.phaseIndex, table.dayIndex,
    table.exerciseName, table.setIndex, table.loggedDate
  ),
}));
export type WorkoutLog = typeof workoutLogs.$inferSelect;
export type InsertWorkoutLog = typeof workoutLogs.$inferInsert;

/**
 * チャレンジ / 月間目標
 */
export const challenges = mysqlTable("challenges", {
  id:           int("id").autoincrement().primaryKey(),
  userId:       int("userId").notNull(),
  type:         mysqlEnum("type", ["streak", "pr", "monthly_sessions", "total_volume"]).notNull(),
  title:        varchar("title", { length: 255 }).notNull(),
  targetValue:  float("targetValue").notNull(),
  exerciseName: varchar("exerciseName", { length: 255 }), // PRタイプのみ使用
  startDate:    varchar("startDate", { length: 10 }).notNull(), // YYYY-MM-DD
  endDate:      varchar("endDate", { length: 10 }).notNull(),   // YYYY-MM-DD
  completedAt:  timestamp("completedAt"),
  createdAt:    timestamp("createdAt").defaultNow().notNull(),
});

export type Challenge = typeof challenges.$inferSelect;
export type InsertChallenge = typeof challenges.$inferInsert;
