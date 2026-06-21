import { eq, desc, asc, and, count, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, profiles, generatedMenus, exerciseWeights, globalSettings, workoutLogs, userStreaks, userBadges, bodyMeasurements, pushSubscriptions, challenges, type InsertProfile, type InsertGeneratedMenu, type InsertExerciseWeight, type InsertWorkoutLog } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ===== プロフィール =====

export async function getProfileByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertProfile(data: InsertProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(profiles).where(eq(profiles.userId, data.userId)).limit(1);

  if (existing.length > 0) {
    await db.update(profiles).set(data).where(eq(profiles.userId, data.userId));
    const updated = await db.select().from(profiles).where(eq(profiles.userId, data.userId)).limit(1);
    return updated[0];
  } else {
    await db.insert(profiles).values(data);
    const inserted = await db.select().from(profiles).where(eq(profiles.userId, data.userId)).limit(1);
    return inserted[0];
  }
}

// ===== 生成メニュー =====

export async function saveGeneratedMenu(data: InsertGeneratedMenu) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(generatedMenus).values(data);
  // 最新のレコードを取得
  const result = await db
    .select()
    .from(generatedMenus)
    .where(eq(generatedMenus.userId, data.userId))
    .orderBy(desc(generatedMenus.createdAt))
    .limit(1);
  return result[0];
}

export async function getMenuHistory(userId: number, limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(generatedMenus)
    .where(eq(generatedMenus.userId, userId))
    .orderBy(desc(generatedMenus.createdAt))
    .limit(limit);
}

export async function getMenuById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(generatedMenus)
    .where(eq(generatedMenus.id, id))
    .limit(1);
  if (result.length === 0) return undefined;
  if (result[0].userId !== userId) return undefined;
  return result[0];
}

export async function updatePlanName(id: number, userId: number, planName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(generatedMenus)
    .set({ planName })
    .where(and(eq(generatedMenus.id, id), eq(generatedMenus.userId, userId)));
  return true;
}

// ===== 種目重量データ（管理者用） =====

export async function getAllExerciseWeights() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(exerciseWeights).orderBy(exerciseWeights.muscleGroup, exerciseWeights.exerciseName);
}

export async function getExerciseWeightByName(exerciseName: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(exerciseWeights).where(eq(exerciseWeights.exerciseName, exerciseName)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertExerciseWeight(data: InsertExerciseWeight) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(exerciseWeights).where(eq(exerciseWeights.exerciseName, data.exerciseName)).limit(1);
  if (existing.length > 0) {
    await db.update(exerciseWeights).set(data).where(eq(exerciseWeights.exerciseName, data.exerciseName));
    const updated = await db.select().from(exerciseWeights).where(eq(exerciseWeights.exerciseName, data.exerciseName)).limit(1);
    return updated[0];
  } else {
    await db.insert(exerciseWeights).values(data);
    const inserted = await db.select().from(exerciseWeights).where(eq(exerciseWeights.exerciseName, data.exerciseName)).limit(1);
    return inserted[0];
  }
}

export async function bulkUpsertExerciseWeights(items: InsertExerciseWeight[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (items.length === 0) return;
  const CHUNK = 50;
  for (let i = 0; i < items.length; i += CHUNK) {
    const chunk = items.slice(i, i + CHUNK);
    await db.insert(exerciseWeights).values(chunk).onDuplicateKeyUpdate({
      set: {
        muscleGroup: sql`VALUES(muscleGroup)`,
        femaleBaseWeight: sql`VALUES(femaleBaseWeight)`,
        maleBaseWeight: sql`VALUES(maleBaseWeight)`,
        noneMultiplier: sql`VALUES(noneMultiplier)`,
        beginnerMultiplier: sql`VALUES(beginnerMultiplier)`,
        intermediateMultiplier: sql`VALUES(intermediateMultiplier)`,
        advancedMultiplier: sql`VALUES(advancedMultiplier)`,
        maleNoneMultiplier: sql`VALUES(maleNoneMultiplier)`,
        maleBeginnerMultiplier: sql`VALUES(maleBeginnerMultiplier)`,
        maleIntermediateMultiplier: sql`VALUES(maleIntermediateMultiplier)`,
        maleAdvancedMultiplier: sql`VALUES(maleAdvancedMultiplier)`,
        weightRatio: sql`VALUES(weightRatio)`,
        isBodyweight: sql`VALUES(isBodyweight)`,
        notes: sql`VALUES(notes)`,
      },
    });
  }
}

export async function deleteExerciseWeight(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(exerciseWeights).where(eq(exerciseWeights.id, id));
}

// ===== グローバル設定 =====

export async function getGlobalSetting(key: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(globalSettings).where(eq(globalSettings.settingKey, key)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllGlobalSettings() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(globalSettings);
}

export async function upsertGlobalSetting(key: string, value: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(globalSettings)
    .values({ settingKey: key, settingValue: value })
    .onDuplicateKeyUpdate({ set: { settingValue: value } });
  const result = await db.select().from(globalSettings).where(eq(globalSettings.settingKey, key)).limit(1);
  return result[0];
}

// ===== 管理者：ユーザー管理 =====
export async function getAllUsers(limit = 100, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      loginMethod: users.loginMethod,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      disclaimerAgreedAt: users.disclaimerAgreedAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUserCount() {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: count() }).from(users);
  return result[0]?.count ?? 0;
}

export async function getUserDetailById(userId: number) {
  const db = await getDb();
  if (!db) return null;

  const userResult = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      loginMethod: users.loginMethod,
      role: users.role,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastSignedIn: users.lastSignedIn,
      disclaimerAgreedAt: users.disclaimerAgreedAt,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (userResult.length === 0) return null;

  const profileResult = await db
    .select()
    .from(profiles)
    .where(eq(profiles.userId, userId))
    .limit(1);

  const menuHistory = await db
    .select({
      id: generatedMenus.id,
      title: generatedMenus.title,
      planDuration: generatedMenus.planDuration,
      createdAt: generatedMenus.createdAt,
    })
    .from(generatedMenus)
    .where(eq(generatedMenus.userId, userId))
    .orderBy(desc(generatedMenus.createdAt))
    .limit(20);

  return {
    user: userResult[0],
    profile: profileResult.length > 0 ? profileResult[0] : null,
    menuHistory,
  };
}

export async function getWorkoutLogs(userId: number, menuId: number) {
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().slice(0, 10);
  // 今日の記録 + 移行前の旧データ（logged_date=''）を両方返す
  return db
    .select()
    .from(workoutLogs)
    .where(
      and(
        eq(workoutLogs.userId, userId),
        eq(workoutLogs.menuId, menuId),
        sql`(${workoutLogs.loggedDate} = ${today} OR ${workoutLogs.loggedDate} = '')`
      )
    );
}

export async function getPreviousWorkoutLogs(userId: number, exerciseNames: string[]) {
  if (exerciseNames.length === 0) return [];
  const db = await getDb();
  if (!db) return [];
  const today = new Date().toISOString().slice(0, 10);
  const results: (typeof workoutLogs.$inferSelect)[] = [];
  for (const name of exerciseNames) {
    const logs = await db
      .select()
      .from(workoutLogs)
      .where(
        and(
          eq(workoutLogs.userId, userId),
          eq(workoutLogs.exerciseName, name),
          eq(workoutLogs.completed, 1),
          sql`${workoutLogs.loggedDate} != '' AND ${workoutLogs.loggedDate} < ${today}`
        )
      )
      .orderBy(desc(workoutLogs.loggedDate), asc(workoutLogs.setIndex))
      .limit(10);
    if (logs.length > 0) {
      const maxDate = logs[0].loggedDate;
      results.push(...logs.filter((l) => l.loggedDate === maxDate));
    }
  }
  return results;
}

/**
 * ワークアウト記録を登録または更新する（upsert）
 * 同一 userId + menuId + phaseIndex + dayIndex + exerciseName + setIndex で一意
 */
export async function upsertWorkoutLog(data: InsertWorkoutLog & { userId: number }) {
  const db = await getDb();
  if (!db) return;
  const today = new Date().toISOString().slice(0, 10);
  const existingRow = await db
    .select()
    .from(workoutLogs)
    .where(
      and(
        eq(workoutLogs.userId, data.userId),
        eq(workoutLogs.menuId, data.menuId!),
        eq(workoutLogs.phaseIndex, data.phaseIndex ?? 0),
        eq(workoutLogs.dayIndex, data.dayIndex!),
        eq(workoutLogs.exerciseName, data.exerciseName!),
        eq(workoutLogs.setIndex, data.setIndex!),
        sql`(${workoutLogs.loggedDate} = ${today} OR ${workoutLogs.loggedDate} = '')`
      )
    )
    .then((rows) => rows[0]);
  if (existingRow) {
    await db
      .update(workoutLogs)
      .set({
        actualReps: data.actualReps ?? existingRow.actualReps,
        actualWeight: data.actualWeight ?? existingRow.actualWeight,
        completed: data.completed ?? existingRow.completed,
        note: data.note ?? existingRow.note,
        loggedDate: today,
      })
      .where(eq(workoutLogs.id, existingRow.id));
    return existingRow.id;
  } else {
    const result = await db.insert(workoutLogs).values({
      userId: data.userId,
      menuId: data.menuId,
      phaseIndex: data.phaseIndex ?? 0,
      dayIndex: data.dayIndex,
      exerciseName: data.exerciseName,
      setIndex: data.setIndex,
      plannedReps: data.plannedReps,
      plannedWeight: data.plannedWeight,
      actualReps: data.actualReps,
      actualWeight: data.actualWeight,
      completed: data.completed ?? 0,
      note: data.note,
      loggedDate: today,
    });
    return (result as unknown as { insertId: number }).insertId;
  }
}

export async function getWorkoutLogsByDateRange(userId: number, startDate: string, endDate: string) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(workoutLogs)
    .where(
      and(
        eq(workoutLogs.userId, userId),
        sql`${workoutLogs.loggedDate} >= ${startDate}`,
        sql`${workoutLogs.loggedDate} <= ${endDate}`,
        sql`${workoutLogs.loggedDate} != ''`
      )
    )
    .orderBy(asc(workoutLogs.loggedDate), asc(workoutLogs.dayIndex), asc(workoutLogs.setIndex));
}

/** 種目別の自己最高重量（個人記録）を取得 */
export async function getPersonalRecords(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      exerciseName: workoutLogs.exerciseName,
      maxWeight: sql<number>`MAX(${workoutLogs.actualWeight})`,
    })
    .from(workoutLogs)
    .where(
      and(
        eq(workoutLogs.userId, userId),
        eq(workoutLogs.completed, 1),
        sql`${workoutLogs.actualWeight} > 0`
      )
    )
    .groupBy(workoutLogs.exerciseName)
    .orderBy(sql`MAX(${workoutLogs.actualWeight}) DESC`)
    .limit(5);
  return rows.map((r) => ({
    exerciseName: r.exerciseName,
    maxWeight: Number(r.maxWeight),
  }));
}

/** メニューIDごとの完了セット数・総セット数・総ボリュームを集計 */
export async function getWorkoutStatsByUser(userId: number): Promise<Array<{
  menuId: number;
  completedSets: number;
  totalSets: number;
  totalVolume: number;
}>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      menuId: workoutLogs.menuId,
      completedSets: sql<number>`SUM(CASE WHEN ${workoutLogs.completed} = 1 THEN 1 ELSE 0 END)`,
      totalSets: count(),
      totalVolume: sql<number>`SUM(CASE WHEN ${workoutLogs.completed} = 1 AND ${workoutLogs.actualWeight} IS NOT NULL AND ${workoutLogs.actualReps} IS NOT NULL THEN ${workoutLogs.actualWeight} * ${workoutLogs.actualReps} ELSE 0 END)`,
    })
    .from(workoutLogs)
    .where(eq(workoutLogs.userId, userId))
    .groupBy(workoutLogs.menuId);
  return rows.map((r) => ({
    menuId: r.menuId,
    completedSets: Number(r.completedSets),
    totalSets: Number(r.totalSets),
    totalVolume: Number(r.totalVolume),
  }));
}

// ===== ストリーク =====

export const BADGES = [
  { id: "first_workout", label: "はじめの一歩",   emoji: "🎯", desc: "初めてのワークアウト記録" },
  { id: "streak_7",      label: "7日連続",         emoji: "🔥", desc: "7日連続でトレーニング" },
  { id: "streak_30",     label: "1ヶ月継続",       emoji: "💪", desc: "30日連続でトレーニング" },
  { id: "streak_100",    label: "100日の鉄人",     emoji: "⚡", desc: "100日連続でトレーニング" },
  { id: "streak_365",    label: "1年間の覚悟",     emoji: "👑", desc: "365日連続でトレーニング" },
  { id: "volume_1000",   label: "1,000kgの壁",     emoji: "🏋️", desc: "累計1,000kgを達成" },
  { id: "volume_10000",  label: "10,000kgの伝説",  emoji: "🦾", desc: "累計10,000kgを達成" },
] as const;

export type BadgeId = typeof BADGES[number]["id"];

/** ストリーク情報を取得。なければ null */
export async function getStreakByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(userStreaks).where(eq(userStreaks.userId, userId)).limit(1);
  return rows.length > 0 ? rows[0] : null;
}

/** バッジ一覧を取得 */
export async function getBadgesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userBadges).where(eq(userBadges.userId, userId));
}

/** ワークアウト完了時にストリークを更新し、獲得バッジを返す */
export async function updateStreak(userId: number, todayDate: string): Promise<{ newBadges: BadgeId[] }> {
  const db = await getDb();
  if (!db) return { newBadges: [] };

  const existing = await getStreakByUserId(userId);
  const newBadges: BadgeId[] = [];

  if (!existing) {
    // 初回記録
    await db.insert(userStreaks).values({
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastWorkoutDate: todayDate,
      freezesLeft: 2,
    });
    await _awardBadge(db, userId, "first_workout", newBadges);
    return { newBadges };
  }

  if (existing.lastWorkoutDate === todayDate) {
    // 今日はすでに記録済み → no-op
    return { newBadges: [] };
  }

  const yesterday = _offsetDate(todayDate, -1);
  let newCurrent: number;
  if (existing.lastWorkoutDate === yesterday) {
    newCurrent = existing.currentStreak + 1;
  } else {
    newCurrent = 1;
  }
  const newLongest = Math.max(newCurrent, existing.longestStreak);

  await db.update(userStreaks)
    .set({ currentStreak: newCurrent, longestStreak: newLongest, lastWorkoutDate: todayDate })
    .where(eq(userStreaks.userId, userId));

  // バッジ判定
  if (newCurrent === 1 && !existing.lastWorkoutDate) {
    await _awardBadge(db, userId, "first_workout", newBadges);
  }
  for (const [threshold, badgeId] of [[7, "streak_7"], [30, "streak_30"], [100, "streak_100"], [365, "streak_365"]] as const) {
    if (newCurrent >= threshold) await _awardBadge(db, userId, badgeId, newBadges);
  }

  // ボリューム系バッジ
  const volRows = await db.select({
    total: sql<number>`SUM(${workoutLogs.actualWeight} * ${workoutLogs.actualReps})`,
  }).from(workoutLogs).where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.completed, 1)));
  const totalVol = Number(volRows[0]?.total ?? 0);
  if (totalVol >= 10000) await _awardBadge(db, userId, "volume_10000", newBadges);
  else if (totalVol >= 1000) await _awardBadge(db, userId, "volume_1000", newBadges);

  return { newBadges };
}

/** ストリークフリーズを使用 */
export async function useStreakFreeze(userId: number): Promise<{ success: boolean; message: string }> {
  const db = await getDb();
  if (!db) return { success: false, message: "DB接続エラー" };

  const existing = await getStreakByUserId(userId);
  if (!existing) return { success: false, message: "ストリーク記録がありません" };
  if (existing.freezesLeft <= 0) return { success: false, message: "フリーズの残り回数がありません" };
  if (existing.currentStreak < 3) return { success: false, message: "3日連続以上で使用できます" };

  const thisMonth = existing.lastWorkoutDate?.slice(0, 7) ?? "";
  if (existing.lastFreezeMonth === thisMonth) {
    return { success: false, message: "今月はすでにフリーズを使用しました" };
  }

  await db.update(userStreaks)
    .set({
      freezesLeft: existing.freezesLeft - 1,
      lastFreezeMonth: thisMonth,
      lastWorkoutDate: _offsetDate(existing.lastWorkoutDate ?? "", 1),
    })
    .where(eq(userStreaks.userId, userId));

  return { success: true, message: `フリーズを使用しました（残り${existing.freezesLeft - 1}回）` };
}

// ── ヘルパー

async function _awardBadge(db: ReturnType<typeof drizzle>, userId: number, badgeId: BadgeId, collected: BadgeId[]) {
  try {
    const existing = await db.select({ id: userBadges.id })
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(userBadges).values({ userId, badgeId });
      collected.push(badgeId);
    }
  } catch {
    // 重複競合は無視
  }
}

function _offsetDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// ===== 進捗グラフ =====

/** ユーザーが記録した種目一覧（セット数降順）*/
export async function getTrackedExercises(userId: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      exerciseName: workoutLogs.exerciseName,
      sets: count(),
    })
    .from(workoutLogs)
    .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.completed, 1)))
    .groupBy(workoutLogs.exerciseName)
    .orderBy(sql`COUNT(*) DESC`)
    .limit(20);
  return rows.map((r) => r.exerciseName);
}

/** 種目別の日次最高重量・推定1RM・ボリュームの時系列 */
export async function getExerciseHistory(
  userId: number,
  exerciseName: string,
  days: number
): Promise<Array<{ date: string; maxWeight: number; estimated1RM: number; volume: number }>> {
  const db = await getDb();
  if (!db) return [];
  const since = _offsetDate(new Date().toISOString().slice(0, 10), -days);
  const rows = await db
    .select({
      date:          workoutLogs.loggedDate,
      maxWeight:     sql<number>`MAX(${workoutLogs.actualWeight})`,
      bestRepsAtMax: sql<number>`MAX(CASE WHEN ${workoutLogs.actualWeight} = (SELECT MAX(w2.actualWeight) FROM workout_logs w2 WHERE w2.userId = ${workoutLogs.userId} AND w2.exerciseName = ${workoutLogs.exerciseName} AND w2.loggedDate = ${workoutLogs.loggedDate} AND w2.completed = 1) THEN ${workoutLogs.actualReps} ELSE NULL END)`,
      volume:        sql<number>`SUM(${workoutLogs.actualWeight} * ${workoutLogs.actualReps})`,
    })
    .from(workoutLogs)
    .where(
      and(
        eq(workoutLogs.userId, userId),
        eq(workoutLogs.exerciseName, exerciseName),
        eq(workoutLogs.completed, 1),
        sql`${workoutLogs.loggedDate} >= ${since}`,
        sql`${workoutLogs.actualWeight} > 0`,
      )
    )
    .groupBy(workoutLogs.loggedDate)
    .orderBy(asc(workoutLogs.loggedDate));

  return rows.map((r) => {
    const w = Number(r.maxWeight);
    const reps = Number(r.bestRepsAtMax ?? 1);
    // Brzycki 1RM: weight × 36 / (37 - reps)。reps >= 37 は除外
    const est1RM = reps > 0 && reps < 37 ? Math.round((w * 36) / (37 - reps) * 10) / 10 : w;
    return {
      date: r.date,
      maxWeight: w,
      estimated1RM: est1RM,
      volume: Number(r.volume),
    };
  });
}

/** 週別トレーニングボリューム（直近 N 週）*/
export async function getWeeklySummary(
  userId: number,
  weeks: number
): Promise<Array<{ week: string; volume: number; sessions: number }>> {
  const db = await getDb();
  if (!db) return [];
  const since = _offsetDate(new Date().toISOString().slice(0, 10), -(weeks * 7));
  const rows = await db
    .select({
      week:     sql<string>`DATE_FORMAT(${workoutLogs.loggedDate}, '%Y-%u')`,
      volume:   sql<number>`SUM(${workoutLogs.actualWeight} * ${workoutLogs.actualReps})`,
      sessions: sql<number>`COUNT(DISTINCT ${workoutLogs.loggedDate})`,
    })
    .from(workoutLogs)
    .where(
      and(
        eq(workoutLogs.userId, userId),
        eq(workoutLogs.completed, 1),
        sql`${workoutLogs.loggedDate} >= ${since}`,
        sql`${workoutLogs.actualWeight} > 0`,
      )
    )
    .groupBy(sql`DATE_FORMAT(${workoutLogs.loggedDate}, '%Y-%u')`)
    .orderBy(sql`DATE_FORMAT(${workoutLogs.loggedDate}, '%Y-%u') ASC`);

  return rows.map((r) => ({
    week: r.week,
    volume: Number(r.volume),
    sessions: Number(r.sessions),
  }));
}

/** 種目別自己最高重量（個人記録）+ 推定1RM */
export async function getPersonalRecordsWithEstimate(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      exerciseName: workoutLogs.exerciseName,
      maxWeight:    sql<number>`MAX(${workoutLogs.actualWeight})`,
      repsAtMax:    sql<number>`MAX(CASE WHEN ${workoutLogs.actualWeight} = (SELECT MAX(w2.actualWeight) FROM workout_logs w2 WHERE w2.userId = ${workoutLogs.userId} AND w2.exerciseName = ${workoutLogs.exerciseName} AND w2.completed = 1 AND w2.actualWeight > 0) THEN ${workoutLogs.actualReps} ELSE NULL END)`,
      est1RM:       sql<number>`MAX(${workoutLogs.actualWeight} * 36.0 / GREATEST(37 - ${workoutLogs.actualReps}, 1))`,
    })
    .from(workoutLogs)
    .where(
      and(
        eq(workoutLogs.userId, userId),
        eq(workoutLogs.completed, 1),
        sql`${workoutLogs.actualWeight} > 0`,
      )
    )
    .groupBy(workoutLogs.exerciseName)
    .orderBy(sql`MAX(${workoutLogs.actualWeight}) DESC`)
    .limit(10);

  return rows.map((r) => ({
    exerciseName: r.exerciseName,
    maxWeight:    Number(r.maxWeight),
    repsAtMax:    Number(r.repsAtMax ?? 1),
    est1RM:       Math.round(Number(r.est1RM ?? r.maxWeight) * 10) / 10,
  }));
}

// ===== 体重・体脂肪 =====

/** 体重・体脂肪を今日分でアップサート */
export async function upsertBodyMeasurement(
  userId: number,
  measuredDate: string,
  weight?: number,
  bodyFat?: number,
  note?: string,
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(bodyMeasurements)
    .values({ userId, measuredDate, weight: weight ?? null, bodyFat: bodyFat ?? null, note: note ?? null })
    .onDuplicateKeyUpdate({
      set: {
        ...(weight !== undefined ? { weight } : {}),
        ...(bodyFat !== undefined ? { bodyFat } : {}),
        ...(note !== undefined ? { note } : {}),
      },
    });
}

/** 体重・体脂肪の履歴取得 */
export async function getBodyHistory(userId: number, days: number) {
  const db = await getDb();
  if (!db) return [];
  const since = _offsetDate(new Date().toISOString().slice(0, 10), -days);
  return db.select({
    measuredDate: bodyMeasurements.measuredDate,
    weight:       bodyMeasurements.weight,
    bodyFat:      bodyMeasurements.bodyFat,
    note:         bodyMeasurements.note,
  })
    .from(bodyMeasurements)
    .where(
      and(
        eq(bodyMeasurements.userId, userId),
        sql`${bodyMeasurements.measuredDate} >= ${since}`,
      )
    )
    .orderBy(asc(bodyMeasurements.measuredDate));
}

// ===== プラン管理 =====

const FREE_MONTHLY_LIMIT = 5;

/** 当月の AI メニュー生成回数を取得 */
export async function getMonthlyGenerationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const rows = await db
    .select({ cnt: count() })
    .from(generatedMenus)
    .where(
      and(
        eq(generatedMenus.userId, userId),
        sql`DATE_FORMAT(${generatedMenus.createdAt}, '%Y-%m') = ${thisMonth}`
      )
    );
  return Number(rows[0]?.cnt ?? 0);
}

/** Free プランの月次制限チェック。制限超過なら true を返す */
export async function isOverFreeLimit(userId: number): Promise<boolean> {
  const cnt = await getMonthlyGenerationCount(userId);
  return cnt >= FREE_MONTHLY_LIMIT;
}

/** 管理者がユーザーのプランを変更する */
export async function setUserPlan(
  targetUserId: number,
  planType: "free" | "premium" | "premium_plus",
  premiumUntil: Date | null
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({ userPlanType: planType, premiumUntil })
    .where(eq(users.id, targetUserId));
}

// ===== Stripe 連携 =====

/** Stripe 決済完了時にプランを有効化する */
export async function activateStripePlan(
  userId: number,
  planType: "premium" | "premium_plus",
  stripeCustomerId: string,
  stripeSubscriptionId: string
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({
      userPlanType: planType,
      premiumUntil: null,  // null = サブスクリプションが有効な限り無期限
      stripeCustomerId,
      stripeSubscriptionId,
    })
    .where(eq(users.id, userId));
}

// ===== Push 通知サブスクリプション =====

/** プッシュ通知サブスクリプションを保存（同一 endpoint は上書き） */
export async function savePushSubscription(
  userId: number,
  endpoint: string,
  p256dh: string,
  auth: string
) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pushSubscriptions)
    .values({ userId, endpoint, p256dh, auth })
    .onDuplicateKeyUpdate({ set: { userId, p256dh, auth } });
}

/** プッシュ通知サブスクリプションを削除 */
export async function deletePushSubscription(userId: number, endpoint: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(pushSubscriptions)
    .where(and(eq(pushSubscriptions.userId, userId), sql`${pushSubscriptions.endpoint} = ${endpoint}`));
}

/** ユーザーのサブスクリプション一覧を取得 */
export async function getUserPushSubscriptions(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
}

/** ストリークリマインダー用: 全サブスクリプションを lastWorkoutDate と共に返す */
export async function getPushSubscriptionsForReminder(): Promise<Array<{
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  lastWorkoutDate: string | null;
}>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      userId:          pushSubscriptions.userId,
      endpoint:        pushSubscriptions.endpoint,
      p256dh:          pushSubscriptions.p256dh,
      auth:            pushSubscriptions.auth,
      lastWorkoutDate: userStreaks.lastWorkoutDate,
    })
    .from(pushSubscriptions)
    .leftJoin(userStreaks, eq(userStreaks.userId, pushSubscriptions.userId));
  return rows;
}

/** Stripe サブスクリプションのキャンセル・失効時にプランをダウングレードする */
export async function deactivateStripePlan(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(users)
    .set({
      userPlanType: "free",
      premiumUntil: null,
      stripeSubscriptionId: null,
    })
    .where(eq(users.id, userId));
}

export { FREE_MONTHLY_LIMIT };

// ===== マイデータ統計 =====

/** ユーザーのトレーニング累計データを一括取得 */
export async function getUserSummaryStats(userId: number): Promise<{
  totalSessions: number;
  totalSets: number;
  totalVolumeKg: number;
  mostTrainedExercise: string | null;
  accountAgeDays: number;
  firstWorkoutDate: string | null;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const [sessionRow, setRow, volRow, topExRow, userRow, firstRow] = await Promise.all([
    db.select({ n: sql<number>`COUNT(DISTINCT ${workoutLogs.loggedDate})` })
      .from(workoutLogs)
      .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.completed, 1), sql`${workoutLogs.loggedDate} != ''`)),
    db.select({ n: sql<number>`COUNT(*)` })
      .from(workoutLogs)
      .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.completed, 1))),
    db.select({ total: sql<number>`SUM(${workoutLogs.actualWeight} * ${workoutLogs.actualReps})` })
      .from(workoutLogs)
      .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.completed, 1), sql`${workoutLogs.actualWeight} > 0`)),
    db.select({ exerciseName: workoutLogs.exerciseName, cnt: sql<number>`COUNT(*)` })
      .from(workoutLogs)
      .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.completed, 1)))
      .groupBy(workoutLogs.exerciseName)
      .orderBy(sql`COUNT(*) DESC`)
      .limit(1),
    db.select({ createdAt: users.createdAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1),
    db.select({ minDate: sql<string>`MIN(${workoutLogs.loggedDate})` })
      .from(workoutLogs)
      .where(and(eq(workoutLogs.userId, userId), eq(workoutLogs.completed, 1), sql`${workoutLogs.loggedDate} != ''`)),
  ]);

  const createdAt = userRow[0]?.createdAt;
  return {
    totalSessions:       Number(sessionRow[0]?.n ?? 0),
    totalSets:           Number(setRow[0]?.n ?? 0),
    totalVolumeKg:       Math.round(Number(volRow[0]?.total ?? 0)),
    mostTrainedExercise: topExRow[0]?.exerciseName ?? null,
    accountAgeDays:      createdAt ? Math.floor((Date.now() - createdAt.getTime()) / 86400000) : 0,
    firstWorkoutDate:    firstRow[0]?.minDate ?? null,
  };
}

// ===== チャレンジ =====

export async function getChallengesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(challenges).where(eq(challenges.userId, userId)).orderBy(desc(challenges.createdAt));
}

export async function createChallenge(data: {
  userId: number;
  type: "streak" | "pr" | "monthly_sessions" | "total_volume";
  title: string;
  targetValue: number;
  exerciseName?: string | null;
  startDate: string;
  endDate: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.insert(challenges).values({
    userId:       data.userId,
    type:         data.type,
    title:        data.title,
    targetValue:  data.targetValue,
    exerciseName: data.exerciseName ?? null,
    startDate:    data.startDate,
    endDate:      data.endDate,
  });
}

export async function deleteChallenge(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(challenges).where(and(eq(challenges.id, id), eq(challenges.userId, userId)));
}

export async function markChallengeCompleted(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(challenges)
    .set({ completedAt: new Date() })
    .where(and(eq(challenges.id, id), eq(challenges.userId, userId), sql`${challenges.completedAt} IS NULL`));
}

export async function computeChallengeProgress(
  challenge: { type: string; exerciseName: string | null; startDate: string; endDate: string },
  userId: number
): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  if (challenge.type === "streak") {
    const streak = await getStreakByUserId(userId);
    return streak?.currentStreak ?? 0;
  }

  if (challenge.type === "pr" && challenge.exerciseName) {
    const rows = await db
      .select({ maxWeight: sql<number>`MAX(${workoutLogs.actualWeight})` })
      .from(workoutLogs)
      .where(and(
        eq(workoutLogs.userId, userId),
        eq(workoutLogs.exerciseName, challenge.exerciseName),
        eq(workoutLogs.completed, 1),
        sql`${workoutLogs.actualWeight} > 0`
      ));
    return Number(rows[0]?.maxWeight ?? 0);
  }

  if (challenge.type === "monthly_sessions") {
    const rows = await db
      .select({ n: sql<number>`COUNT(DISTINCT ${workoutLogs.loggedDate})` })
      .from(workoutLogs)
      .where(and(
        eq(workoutLogs.userId, userId),
        eq(workoutLogs.completed, 1),
        sql`${workoutLogs.loggedDate} >= ${challenge.startDate}`,
        sql`${workoutLogs.loggedDate} <= ${challenge.endDate}`
      ));
    return Number(rows[0]?.n ?? 0);
  }

  if (challenge.type === "total_volume") {
    const rows = await db
      .select({ vol: sql<number>`SUM(${workoutLogs.actualWeight} * ${workoutLogs.actualReps})` })
      .from(workoutLogs)
      .where(and(
        eq(workoutLogs.userId, userId),
        eq(workoutLogs.completed, 1),
        sql`${workoutLogs.actualWeight} > 0`,
        sql`${workoutLogs.actualReps} > 0`,
        sql`${workoutLogs.loggedDate} >= ${challenge.startDate}`,
        sql`${workoutLogs.loggedDate} <= ${challenge.endDate}`
      ));
    return Math.round(Number(rows[0]?.vol ?? 0));
  }

  return 0;
}
