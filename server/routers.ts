import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { contactRouter } from "./routers/contact";
import { exerciseRouter } from "./routers/exercise";
import { challengeRouter } from "./routers/challenge";
import { z } from "zod";
import { getProfileByUserId, upsertProfile, saveGeneratedMenu, getMenuHistory, getMenuById, updatePlanName, getAllExerciseWeights, upsertExerciseWeight, deleteExerciseWeight, bulkUpsertExerciseWeights, getAllGlobalSettings, upsertGlobalSetting, getDb, getAllUsers, getUserCount, getUserDetailById, getWorkoutLogs, getPreviousWorkoutLogs, upsertWorkoutLog, getWorkoutLogsByDateRange, getWorkoutStatsByUser, getPersonalRecords, getStreakByUserId, getBadgesByUserId, updateStreak, useStreakFreeze, BADGES, getTrackedExercises, getExerciseHistory, getWeeklySummary, getPersonalRecordsWithEstimate, upsertBodyMeasurement, getBodyHistory, isOverFreeLimit, setUserPlan, getMonthlyGenerationCount, FREE_MONTHLY_LIMIT, activateStripePlan, deactivateStripePlan, savePushSubscription, deletePushSubscription, getUserPushSubscriptions, getUserSummaryStats } from "./db";
import { PLAN_KEYS, type PlanKey, planKeyToType, createCheckoutSession, retrieveCompletedSession, createPortalSession, retrieveSubscription } from "./stripe";
import { isPushConfigured } from "./push";
import { startCronJobs } from "./cron";

// サーバー起動時に CRON ジョブを開始
startCronJobs();
import { users, generatedMenus, workoutLogs } from "../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generateTrainingPlan, generateMenuTitle, dbExerciseToTemplate, getGoalSpecificExercises, getCandidatesForExercise, findExerciseTemplate, buildExercise, type UserProfile, type ExerciseWeightData } from "./training-engine";

const WEEK_DAYS = ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"] as const;

/** admin は常に通過。premium / premium_plus かつ有効期限内も通過。 */
function checkIsPremium(user: { role: string; userPlanType: string; premiumUntil: Date | null }): boolean {
  if (user.role === "admin") return true;
  if (user.userPlanType === "free") return false;
  if (user.premiumUntil === null) return true; // 無期限
  return user.premiumUntil > new Date();
}

const premiumProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (!checkIsPremium(ctx.user)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "この機能は Premium プランが必要です。/pricing からアップグレードできます。" });
  }
  return next({ ctx });
});

const profileInputSchema = z.object({
  height: z.number().min(100).max(250),
  weight: z.number().min(30).max(300),
  age: z.number().min(13).max(100),
  gender: z.enum(["male", "female", "other"]),
  experienceLevel: z.enum(["none", "beginner", "intermediate", "advanced"]),
  goal: z.enum(["muscle_gain", "fat_loss", "strength", "endurance", "health"]),
  trainingDays: z.array(z.enum(WEEK_DAYS)).min(1).max(7),
  availableDaysPerWeek: z.number().min(1).max(7).optional(),
  dailyMinutes: z.number().min(15).max(240).optional(),
  equipmentAccess: z.enum(["home", "gym", "both"]),
  targetMuscles: z.array(z.string()).optional(),
  intensityLevel: z.enum(["low", "normal", "high"]).optional(),
  splitPreference: z.enum(["auto", "full_body", "body_part", "ppl"]).optional(),
  oneRepMax: z.object({
    squat: z.number().min(0).max(500).optional(),
    deadlift: z.number().min(0).max(500).optional(),
    benchPress: z.number().min(0).max(500).optional(),
  }).optional(),
  weekSeed: z.number().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  contact: contactRouter,
  exercise: exerciseRouter,
  challenge: challengeRouter,

  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return getProfileByUserId(ctx.user.id);
    }),

    upsert: protectedProcedure
      .input(
        z.object({
          height: z.number().min(100).max(250).optional(),
          weight: z.number().min(30).max(300).optional(),
          age: z.number().min(13).max(100).optional(),
          gender: z.enum(["male", "female", "other"]).optional(),
          experienceLevel: z.enum(["none", "beginner", "intermediate", "advanced"]).optional(),
          goal: z.enum(["muscle_gain", "fat_loss", "strength", "endurance", "health"]).optional(),
          trainingDays: z.array(z.enum(WEEK_DAYS)).min(1).max(7).optional(),
          availableDaysPerWeek: z.number().min(1).max(7).optional(),
          dailyMinutes: z.number().min(15).max(240).optional(),
          equipmentAccess: z.enum(["home", "gym", "both"]).optional(),
          targetMuscles: z.array(z.string()).optional(),
          notes: z.string().max(500).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return upsertProfile({
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),

  // 管理者専用ルーター（role === 'admin'のみアクセス可能）
  admin: router({
    // ユーザー一覧取得（管理者専用）
    getUsers: adminProcedure
      .input(z.object({ limit: z.number().min(1).max(200).optional(), offset: z.number().min(0).optional() }).optional())
      .query(async ({ input }) => {
        const limit = input?.limit ?? 100;
        const offset = input?.offset ?? 0;
        const [userList, total] = await Promise.all([
          getAllUsers(limit, offset),
          getUserCount(),
        ]);
        return { users: userList, total };
      }),
    // ユーザー詳細取得（管理者専用）
    getUserDetail: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return getUserDetailById(input.userId);
      }),
    // 種目重量一覧取得
    getExerciseWeights: adminProcedure.query(async () => {
      return getAllExerciseWeights();
    }),

    // 目標別専用種目プール（EXERCISE_DBのgoalTags種目）取得
    getGoalExercises: adminProcedure.query(() => {
      return getGoalSpecificExercises();
    }),

    // 種目重量の一件登録・更新
    upsertExerciseWeight: adminProcedure
      .input(
        z.object({
          exerciseName: z.string().min(1).max(255),
          muscleGroup: z.string().min(1).max(64),
          femaleBaseWeight: z.number().min(0).nullable().optional(),
          maleBaseWeight: z.number().min(0).nullable().optional(),
          noneMultiplier: z.number().min(0.1).max(5.0).optional(),
          beginnerMultiplier: z.number().min(0.1).max(5.0).optional(),
          intermediateMultiplier: z.number().min(0.1).max(5.0).optional(),
          advancedMultiplier: z.number().min(0.1).max(5.0).optional(),
          maleNoneMultiplier: z.number().min(0.1).max(5.0).optional(),
          maleBeginnerMultiplier: z.number().min(0.1).max(5.0).optional(),
          maleIntermediateMultiplier: z.number().min(0.1).max(5.0).optional(),
          maleAdvancedMultiplier: z.number().min(0.1).max(5.0).optional(),
          weightRatio: z.number().min(0).max(10).nullable().optional(),
          isBodyweight: z.boolean().optional(),
          difficulty: z.array(z.enum(["none", "beginner", "intermediate", "advanced"])).optional(),
          equipment: z.enum(["home", "gym", "both"]).optional(),
          equipmentCategory: z.enum(["dumbbell", "barbell", "machine", "bodyweight", "other"]).optional(),
          notes: z.string().max(500).nullable().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return upsertExerciseWeight({
          ...input,
          femaleBaseWeight: input.femaleBaseWeight ?? null,
          maleBaseWeight: input.maleBaseWeight ?? null,
          weightRatio: input.weightRatio ?? null,
          notes: input.notes ?? null,
          isBodyweight: input.isBodyweight ? 1 : 0,
          difficulty: input.difficulty ? input.difficulty.join(",") : "beginner",
          equipment: input.equipment ?? "both",
          equipmentCategory: input.equipmentCategory ?? null,
          noneMultiplier: input.noneMultiplier ?? 0.4,
          maleNoneMultiplier: input.maleNoneMultiplier ?? 0.4,
          maleBeginnerMultiplier: input.maleBeginnerMultiplier ?? 0.7,
          maleIntermediateMultiplier: input.maleIntermediateMultiplier ?? 1.0,
          maleAdvancedMultiplier: input.maleAdvancedMultiplier ?? 1.4,
        });
      }),

    // 種目重量の一括登録（初期データ投入用）
    bulkUpsertExerciseWeights: adminProcedure
      .input(
        z.array(
          z.object({
            exerciseName: z.string().min(1).max(255),
            muscleGroup: z.string().min(1).max(64),
            femaleBaseWeight: z.number().min(0).nullable().optional(),
            maleBaseWeight: z.number().min(0).nullable().optional(),
            beginnerMultiplier: z.number().min(0.1).max(5.0).optional(),
            intermediateMultiplier: z.number().min(0.1).max(5.0).optional(),
            advancedMultiplier: z.number().min(0.1).max(5.0).optional(),
            weightRatio: z.number().min(0).max(5).nullable().optional(),
            isBodyweight: z.boolean().optional(),
            notes: z.string().max(500).nullable().optional(),
          })
        )
      )
      .mutation(async ({ input }) => {
        await bulkUpsertExerciseWeights(
          input.map((item) => ({
            ...item,
            femaleBaseWeight: item.femaleBaseWeight ?? null,
            maleBaseWeight: item.maleBaseWeight ?? null,
            weightRatio: item.weightRatio ?? null,
            notes: item.notes ?? null,
            isBodyweight: item.isBodyweight ? 1 : 0,
          }))
        );
        return { success: true };
      }),

    // 種目重量の削除
    deleteExerciseWeight: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteExerciseWeight(input.id);
        return { success: true };
      }),

    // グローバル設定取得
    getGlobalSettings: adminProcedure.query(async () => {
      return getAllGlobalSettings();
    }),

    // グローバル設定保存（一括係数設定等）
    upsertGlobalSetting: adminProcedure
      .input(
        z.object({
          key: z.string().min(1).max(128),
          value: z.unknown(),
        })
      )
      .mutation(async ({ input }) => {
        return upsertGlobalSetting(input.key, input.value);
      }),

    // 一括係数を全種目に適用
    applyBulkMultipliers: adminProcedure
      .input(
        z.object({
          // 女性用
          femaleNoneMultiplier: z.number().min(0.1).max(5.0),
          femaleBeginnerMultiplier: z.number().min(0.1).max(5.0),
          femaleIntermediateMultiplier: z.number().min(0.1).max(5.0),
          femaleAdvancedMultiplier: z.number().min(0.1).max(5.0),
          // 男性用
          maleNoneMultiplier: z.number().min(0.1).max(5.0),
          maleBeginnerMultiplier: z.number().min(0.1).max(5.0),
          maleIntermediateMultiplier: z.number().min(0.1).max(5.0),
          maleAdvancedMultiplier: z.number().min(0.1).max(5.0),
        })
      )
      .mutation(async ({ input }) => {
        // global_settingsに保存
        await upsertGlobalSetting("default_multipliers", input);
        // 全種目に適用
        const all = await getAllExerciseWeights();
        for (const ex of all) {
          await upsertExerciseWeight({
            ...ex,
            noneMultiplier: input.femaleNoneMultiplier,
            beginnerMultiplier: input.femaleBeginnerMultiplier,
            intermediateMultiplier: input.femaleIntermediateMultiplier,
            advancedMultiplier: input.femaleAdvancedMultiplier,
            maleNoneMultiplier: input.maleNoneMultiplier,
            maleBeginnerMultiplier: input.maleBeginnerMultiplier,
            maleIntermediateMultiplier: input.maleIntermediateMultiplier,
            maleAdvancedMultiplier: input.maleAdvancedMultiplier,
          });
        }
        return { success: true, updatedCount: all.length };
      }),
  }),

  menu: router({
    // 統合された生成API: 常にプラン形式で生成（分割法ベース）
    // ゲスト利用可能（ログイン時のみ履歴保存）
    generate: publicProcedure
      .input(
        profileInputSchema.extend({
          duration: z.enum(["1week", "1month", "3months", "6months", "12months"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { duration, ...profileInput } = input;
        // fat_loss / endurance / health は全身法強制のため、targetMusclesをサーバー側でクリアする
        const FULL_BODY_GOALS = ["fat_loss", "endurance", "health"] as const;
        const normalizedInput = FULL_BODY_GOALS.includes(profileInput.goal as typeof FULL_BODY_GOALS[number])
          ? { ...profileInput, targetMuscles: undefined, splitPreference: "full_body" as const }
          : profileInput;
        const profile: UserProfile = {
          ...normalizedInput,
          availableDaysPerWeek: normalizedInput.trainingDays?.length ?? normalizedInput.availableDaysPerWeek ?? 3,
        };

        // DBから種目重量データを取得してMapとdbExercisesを構築
        const exerciseWeightRows = await getAllExerciseWeights();
        const weightMap = new Map<string, ExerciseWeightData>(
          exerciseWeightRows.map((row) => [row.exerciseName, row as ExerciseWeightData])
        );
        // DBに種目が登録されている場合はそちらを使用（未登録の場合はtraining-engineのデフォルトを使用）
        const dbExercises = exerciseWeightRows.length > 0
          ? exerciseWeightRows
              .filter((row) => row.muscleGroup) // muscleGroupが設定されている種目のみ
              .map((row) => dbExerciseToTemplate(row as ExerciseWeightData))
          : undefined;

        const plan = generateTrainingPlan(profile, duration, weightMap, dbExercises);
        const title = plan.title;

        // プラン名を「ユーザー名さんの部位 目的トレーニングプラン」形式で自動生成
        const goalLabelsForName: Record<string, string> = {
          muscle_gain: "筋肥大",
          fat_loss: "脂肪燃焼",
          strength: "筋力向上",
          endurance: "持久力向上",
          health: "健康維持",
        };
        const targetMusclesLabel =
          FULL_BODY_GOALS.includes(profile.goal as typeof FULL_BODY_GOALS[number])
            ? "全身" // fat_loss/endurance/healthは常に全身
            : (profile.targetMuscles && profile.targetMuscles.length > 0
              ? profile.targetMuscles.join("・")
              : "全身");
        const goalLabel = goalLabelsForName[profile.goal] ?? profile.goal;

        const planTypeMap: Record<string, "weekly" | "monthly" | "quarterly" | "yearly"> = {
          "1week": "weekly",
          "1month": "monthly",
          "3months": "quarterly",
          "6months": "quarterly",
          "12months": "yearly",
        };

        // Free プランの月次生成制限チェック（admin は除外）
        if (ctx.user && ctx.user.role !== "admin" && !checkIsPremium(ctx.user)) {
          const over = await isOverFreeLimit(ctx.user.id);
          if (over) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: `無料プランのAI生成は月${FREE_MONTHLY_LIMIT}回までです。Premium プランにアップグレードすると無制限になります。`,
            });
          }
        }

        // ログイン時のみ履歴を保存する
        let savedId: number | undefined;
        if (ctx.user) {
          // ユーザー名を取得してプラン名を生成
          const db = await getDb();
          let userName = "";
          if (db) {
            const userRows = await db.select({ name: users.name }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
            userName = userRows[0]?.name ?? "";
          }
          const planName = userName
            ? `${userName}さんの${targetMusclesLabel} ${goalLabel}トレーニングプラン`
            : `${targetMusclesLabel} ${goalLabel}トレーニングプラン`;

          const saved = await saveGeneratedMenu({
            userId: ctx.user.id,
            profileSnapshot: profileInput,
            menuData: plan,
            planType: planTypeMap[duration],
            planDuration: duration,
            title,
            planName,
          });
          savedId = saved?.id;
        }

        return { plan, id: savedId };
      }),

    history: protectedProcedure
      .input(z.object({ limit: z.number().min(1).max(50).optional() }).optional())
      .query(async ({ ctx, input }) => {
        return getMenuHistory(ctx.user.id, input?.limit ?? 20);
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return getMenuById(input.id, ctx.user.id);
      }),
    // 分割法を切り替えて再生成（ログインユーザーのみ）
    regenerateWithSplit: protectedProcedure
      .input(z.object({
        id: z.number(),
        splitPreference: z.enum(["auto", "full_body", "body_part", "ppl"]),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getMenuById(input.id, ctx.user.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        const snapshot = existing.profileSnapshot as any;
        if (!snapshot) throw new TRPCError({ code: "BAD_REQUEST", message: "プロフィール情報が見つかりません" });
        const FULL_BODY_GOALS_REGEN = ["fat_loss", "endurance", "health"] as const;
        const isFullBodyGoalRegen = FULL_BODY_GOALS_REGEN.includes(snapshot.goal);
        const profile: UserProfile = isFullBodyGoalRegen
          ? { ...snapshot, targetMuscles: undefined, splitPreference: "full_body" }
          : { ...snapshot, splitPreference: input.splitPreference };
        const exerciseWeightRows = await getAllExerciseWeights();
        const weightMap = new Map<string, ExerciseWeightData>(
          exerciseWeightRows.map((row) => [row.exerciseName, row as ExerciseWeightData])
        );
        const dbExercises = exerciseWeightRows.length > 0
          ? exerciseWeightRows.filter((row) => row.muscleGroup).map((row) => dbExerciseToTemplate(row as ExerciseWeightData))
          : undefined;
        const duration = (existing.planDuration ?? "1week") as "1week" | "1month" | "3months" | "6months" | "12months";
        const plan = generateTrainingPlan(profile, duration, weightMap, dbExercises);
        // 既存レコードのmenuDataを更新
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(generatedMenus)
          .set({ menuData: plan as any, profileSnapshot: profile as any })
          .where(eq(generatedMenus.id, input.id));
        
        return { plan };
      }),

    updatePlanName: protectedProcedure
      .input(z.object({ id: z.number(), planName: z.string().min(1).max(255) }))
      .mutation(async ({ ctx, input }) => {
        await updatePlanName(input.id, ctx.user.id, input.planName);
        return { success: true };
      }),

    // メニューを削除する（関連するワークアウトログも同時削除）
    deleteMenu: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // 所有者確認
        const existing = await getMenuById(input.id, ctx.user.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "メニューが見つかりません" });
        // 関連ログを先に削除してから本体を削除
        await db.delete(workoutLogs).where(and(eq(workoutLogs.userId, ctx.user.id), eq(workoutLogs.menuId, input.id)));
        await db.delete(generatedMenus).where(and(eq(generatedMenus.userId, ctx.user.id), eq(generatedMenus.id, input.id)));
        return { success: true };
      }),
    shuffleExercise: protectedProcedure
      .input(z.object({
        id: z.number(),
        phaseIndex: z.number(),
        dayIndex: z.number(),
        exerciseName: z.string(),
        targetExerciseName: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getMenuById(input.id, ctx.user.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        const snapshot = existing.profileSnapshot as any;
        if (!snapshot) throw new TRPCError({ code: "BAD_REQUEST", message: "プロフィール情報が見つかりません" });
        const exerciseWeightRows = await getAllExerciseWeights();
        const weightMap = new Map<string, ExerciseWeightData>(
          exerciseWeightRows.map((row) => [row.exerciseName, row as ExerciseWeightData])
        );
        const dbExercises = exerciseWeightRows.length > 0
          ? exerciseWeightRows.filter((row) => row.muscleGroup).map((row) => dbExerciseToTemplate(row as ExerciseWeightData))
          : undefined;
        const menuData = existing.menuData as any;
        const updatedMenuData = JSON.parse(JSON.stringify(menuData));
        const day = updatedMenuData?.phases?.[input.phaseIndex]?.weeklyMenu?.days?.[input.dayIndex];
        if (!day) throw new TRPCError({ code: "NOT_FOUND", message: "プランの日が見つかりません" });
        const FULL_BODY_GOALS_SHUFFLE = ["fat_loss", "endurance", "health"] as const;
        const isFullBodyGoalShuffle = FULL_BODY_GOALS_SHUFFLE.includes(snapshot.goal);
        const profile: UserProfile = isFullBodyGoalShuffle
          ? { ...snapshot, targetMuscles: undefined, splitPreference: "full_body" as const }
          : { ...snapshot };

        if (input.targetExerciseName) {
          // ユーザーが選択した特定の種目に1対1で差し替え
          const template = findExerciseTemplate(input.targetExerciseName, dbExercises);
          if (!template) throw new TRPCError({ code: "NOT_FOUND", message: "指定された種目が見つかりません" });
          const newExercise = buildExercise(template, profile, weightMap);
          const exIdx = (day.exercises ?? []).findIndex((e: any) => e.name === input.exerciseName);
          if (exIdx === -1) throw new TRPCError({ code: "NOT_FOUND", message: "入れ替え対象の種目が見つかりません" });
          day.exercises[exIdx] = newExercise;
        } else {
          // targetExerciseName未指定: 旧来のDay全体再生成（後方互換）
          const currentExercises: string[] = (day.exercises ?? []).map((e: any) => e.name);
          const duration = (existing.planDuration ?? "1week") as "1week" | "1month" | "3months" | "6months" | "12months";
          const newPlan = generateTrainingPlan(profile, duration, weightMap, dbExercises, currentExercises);
          const newDay = newPlan.phases[input.phaseIndex]?.weeklyMenu?.days?.[input.dayIndex];
          if (!newDay) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "種目の差し替えに失敗しました" });
          updatedMenuData.phases[input.phaseIndex].weeklyMenu.days[input.dayIndex] = newDay;
        }

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(generatedMenus)
          .set({ menuData: updatedMenuData as any })
          .where(eq(generatedMenus.id, input.id));
        return { day: updatedMenuData.phases[input.phaseIndex].weeklyMenu.days[input.dayIndex] };
      }),

    // 種目入れ替え候補を取得（同部位・プロフィール適合・重複除外）
    getCandidateExercises: protectedProcedure
      .input(z.object({
        id: z.number(),
        phaseIndex: z.number(),
        dayIndex: z.number(),
        exerciseName: z.string(),
      }))
      .query(async ({ ctx, input }) => {
        const existing = await getMenuById(input.id, ctx.user.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        const snapshot = existing.profileSnapshot as any;
        if (!snapshot) throw new TRPCError({ code: "BAD_REQUEST" });
        const menuData = existing.menuData as any;
        const day = menuData?.phases?.[input.phaseIndex]?.weeklyMenu?.days?.[input.dayIndex];
        const currentExercises: string[] = (day?.exercises ?? []).map((e: any) => e.name);
        const targetEx = (day?.exercises ?? []).find((e: any) => e.name === input.exerciseName);
        if (!targetEx) throw new TRPCError({ code: "NOT_FOUND", message: "種目が見つかりません" });
        const muscleGroup: string = targetEx.muscleGroup ?? "全身";
        const exerciseWeightRows = await getAllExerciseWeights();
        const dbExercises = exerciseWeightRows.length > 0
          ? exerciseWeightRows.filter((row) => row.muscleGroup).map((row) => dbExerciseToTemplate(row as ExerciseWeightData))
          : undefined;
        const profile: UserProfile = { ...snapshot };
        return getCandidatesForExercise(muscleGroup, profile, currentExercises, dbExercises, 6);
      }),
    excludeExercise: protectedProcedure
      .input(z.object({
        id: z.number(),
        phaseIndex: z.number(),
        dayIndex: z.number(),
        exerciseName: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getMenuById(input.id, ctx.user.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        const snapshot = existing.profileSnapshot as any;
        if (!snapshot) throw new TRPCError({ code: "BAD_REQUEST", message: "プロフィール情報が見つかりません" });
        const exerciseWeightRows = await getAllExerciseWeights();
        const weightMap = new Map<string, ExerciseWeightData>(
          exerciseWeightRows.map((row) => [row.exerciseName, row as ExerciseWeightData])
        );
        const dbExercises = exerciseWeightRows.length > 0
          ? exerciseWeightRows.filter((row) => row.muscleGroup).map((row) => dbExerciseToTemplate(row as ExerciseWeightData))
          : undefined;
        const menuData = existing.menuData as any;
        const phase = menuData?.phases?.[input.phaseIndex];
        const day = phase?.weeklyMenu?.days?.[input.dayIndex];
        const currentExercises: string[] = (day?.exercises ?? []).map((e: any) => e.name);
        const excludedExercises = Array.from(new Set([...currentExercises, input.exerciseName]));
        const FULL_BODY_GOALS_EXCL = ["fat_loss", "endurance", "health"] as const;
        const isFullBodyGoalExcl = FULL_BODY_GOALS_EXCL.includes(snapshot.goal);
        const profile: UserProfile = isFullBodyGoalExcl
          ? { ...snapshot, targetMuscles: undefined, splitPreference: "full_body" as const }
          : { ...snapshot };
        const duration = (existing.planDuration ?? "1week") as "1week" | "1month" | "3months" | "6months" | "12months";
        const newPlan = generateTrainingPlan(profile, duration, weightMap, dbExercises, excludedExercises);
        const newDay = newPlan.phases[input.phaseIndex]?.weeklyMenu?.days?.[input.dayIndex];
        if (!newDay) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "種目の除外に失敗しました" });
        const updatedMenuData = JSON.parse(JSON.stringify(menuData));
        updatedMenuData.phases[input.phaseIndex].weeklyMenu.days[input.dayIndex] = newDay;
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(generatedMenus)
          .set({ menuData: updatedMenuData as any })
          .where(eq(generatedMenus.id, input.id));
        return { day: newDay };
      }),
    // 休息日（トレーニング曜日）を変更してmenuDataを更新
    updateRestDays: protectedProcedure
      .input(z.object({
        id: z.number(),
        trainingDays: z.array(z.enum(WEEK_DAYS)).min(1).max(7),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getMenuById(input.id, ctx.user.id);
        if (!existing) throw new TRPCError({ code: "NOT_FOUND" });
        const menuData = existing.menuData as any;
        if (!menuData?.phases) throw new TRPCError({ code: "BAD_REQUEST", message: "メニューデータが不正です" });

        const ALL_WEEK = ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"] as const;
        const newRestDays = ALL_WEEK.filter(d => !input.trainingDays.includes(d));
        const updatedMenuData = JSON.parse(JSON.stringify(menuData));

        for (const phase of updatedMenuData.phases) {
          if (!phase.weeklyMenu) continue;
          const days: any[] = phase.weeklyMenu.days ?? [];
          days.forEach((day, i) => {
            if (input.trainingDays[i]) day.dayLabel = input.trainingDays[i];
          });
          phase.weeklyMenu.restDays = newRestDays;
        }

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        await db.update(generatedMenus)
          .set({ menuData: updatedMenuData as any })
          .where(eq(generatedMenus.id, input.id));

        return { plan: updatedMenuData };
      }),
    }),
  workoutLog: router({
    // 特定メニューの記録を取得
    getByMenu: protectedProcedure
      .input(z.object({ menuId: z.number() }))
      .query(async ({ ctx, input }) => {
        return getWorkoutLogs(ctx.user.id, input.menuId);
      }),
    // ワークアウト記録を登録または更新（upsert）
    upsert: protectedProcedure
      .input(z.object({
        menuId: z.number(),
        phaseIndex: z.number().default(0),
        dayIndex: z.number(),
        exerciseName: z.string(),
        setIndex: z.number(),
        plannedReps: z.number().int().min(0).optional(),
        plannedWeight: z.number().min(0).optional(),
        actualReps: z.number().min(0).max(999).optional(),
        actualWeight: z.number().min(0).max(999).optional(),
        completed: z.number().min(0).max(1).optional(),
        note: z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertWorkoutLog({ ...input, userId: ctx.user.id });
        return { success: true };
      }),
    // 前回セッションの記録を取得（前回比較用）
    getPreviousLogs: protectedProcedure
      .input(z.object({ exerciseNames: z.array(z.string()).max(100) }))
      .query(async ({ ctx, input }) => {
        return getPreviousWorkoutLogs(ctx.user.id, input.exerciseNames);
      }),
    // 日付範囲でログを取得（カレンダー用）
    getByDateRange: protectedProcedure
      .input(z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      }))
      .query(async ({ ctx, input }) => {
        return getWorkoutLogsByDateRange(ctx.user.id, input.startDate, input.endDate);
      }),
    // メニューIDごとの完了セット・総セット・総ボリューム集計（履歴一覧用）
    getMenuStats: protectedProcedure.query(async ({ ctx }) => {
      return getWorkoutStatsByUser(ctx.user.id);
    }),
    // 種目別自己最高重量（シェアカード用）
    personalRecords: protectedProcedure.query(async ({ ctx }) => {
      return getPersonalRecords(ctx.user.id);
    }),
  }),

  streak: router({
    /** 自分のストリーク情報 + バッジ定義一覧を返す（Premium限定） */
    get: premiumProcedure.query(async ({ ctx }) => {
      const streak = await getStreakByUserId(ctx.user.id);
      const earned = await getBadgesByUserId(ctx.user.id);
      const earnedSet = new Set(earned.map((b) => b.badgeId));
      return {
        currentStreak:   streak?.currentStreak   ?? 0,
        longestStreak:   streak?.longestStreak   ?? 0,
        lastWorkoutDate: streak?.lastWorkoutDate ?? null,
        freezesLeft:     streak?.freezesLeft     ?? 2,
        badges: BADGES.map((b) => ({ ...b, earned: earnedSet.has(b.id) })),
      };
    }),

    /** ワークアウト完了時に呼ぶ（Premium限定） */
    update: premiumProcedure
      .input(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }))
      .mutation(async ({ ctx, input }) => {
        return updateStreak(ctx.user.id, input.date);
      }),

    /** ストリークフリーズを消費（Premium限定） */
    useFreeze: premiumProcedure.mutation(async ({ ctx }) => {
      return useStreakFreeze(ctx.user.id);
    }),
  }),

  progress: router({
    /** 記録済み種目の一覧（Premium限定） */
    trackedExercises: premiumProcedure.query(async ({ ctx }) => {
      return getTrackedExercises(ctx.user.id);
    }),

    /** 種目別の重量・ボリューム推移（Premium限定） */
    exerciseHistory: premiumProcedure
      .input(z.object({
        exerciseName: z.string().min(1).max(255),
        days: z.number().int().min(7).max(365).default(90),
      }))
      .query(async ({ ctx, input }) => {
        return getExerciseHistory(ctx.user.id, input.exerciseName, input.days);
      }),

    /** 週別ボリュームサマリー（Premium限定） */
    weeklySummary: premiumProcedure
      .input(z.object({ weeks: z.number().int().min(4).max(52).default(12) }))
      .query(async ({ ctx, input }) => {
        return getWeeklySummary(ctx.user.id, input.weeks);
      }),

    /** 種目別個人記録（Premium限定） */
    personalRecords: premiumProcedure.query(async ({ ctx }) => {
      return getPersonalRecordsWithEstimate(ctx.user.id);
    }),
  }),

  body: router({
    /** 体重・体脂肪のアップサート（Premium限定） */
    upsert: premiumProcedure
      .input(z.object({
        measuredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        weight:   z.number().min(20).max(300).optional(),
        bodyFat:  z.number().min(1).max(70).optional(),
        note:     z.string().max(500).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await upsertBodyMeasurement(ctx.user.id, input.measuredDate, input.weight, input.bodyFat, input.note);
        return { success: true };
      }),

    /** 体重・体脂肪の履歴（Premium限定） */
    getHistory: premiumProcedure
      .input(z.object({ days: z.number().int().min(7).max(365).default(90) }))
      .query(async ({ ctx, input }) => {
        return getBodyHistory(ctx.user.id, input.days);
      }),
  }),

  plan: router({
    /** 自分のプラン情報と今月の生成回数を返す */
    myPlan: protectedProcedure.query(async ({ ctx }) => {
      const monthlyCount = await getMonthlyGenerationCount(ctx.user.id);
      return {
        planType:      ctx.user.userPlanType,
        premiumUntil:  ctx.user.premiumUntil,
        isPremium:     checkIsPremium(ctx.user),
        isAdmin:       ctx.user.role === "admin",
        monthlyCount,
        monthlyLimit:  FREE_MONTHLY_LIMIT,
      };
    }),

    /** 管理者がユーザーのプランを変更する */
    setUserPlan: adminProcedure
      .input(z.object({
        userId:       z.number().int(),
        planType:     z.enum(["free", "premium", "premium_plus"]),
        premiumUntil: z.string().datetime().optional().nullable(),
      }))
      .mutation(async ({ input }) => {
        const until = input.premiumUntil ? new Date(input.premiumUntil) : null;
        await setUserPlan(input.userId, input.planType, until);
        return { success: true };
      }),
  }),

  push: router({
    /** VAPID 公開鍵を返す（クライアントの PushManager.subscribe に必要） */
    vapidPublicKey: publicProcedure.query(() => ({
      key: process.env.VAPID_PUBLIC_KEY ?? null,
      enabled: isPushConfigured(),
    })),

    /** プッシュ通知を購読する */
    subscribe: protectedProcedure
      .input(z.object({
        endpoint: z.string().url(),
        p256dh:   z.string().min(1),
        auth:     z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        await savePushSubscription(ctx.user.id, input.endpoint, input.p256dh, input.auth);
        return { success: true };
      }),

    /** プッシュ通知の購読を解除する */
    unsubscribe: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .mutation(async ({ ctx, input }) => {
        await deletePushSubscription(ctx.user.id, input.endpoint);
        return { success: true };
      }),

    /** ユーザーが既に購読済みかチェック */
    isSubscribed: protectedProcedure
      .input(z.object({ endpoint: z.string() }))
      .query(async ({ ctx, input }) => {
        const subs = await getUserPushSubscriptions(ctx.user.id);
        return { subscribed: subs.some(s => s.endpoint === input.endpoint) };
      }),
  }),

  stats: router({
    /** 全ユーザーが閲覧できる累計データサマリー */
    mySummary: protectedProcedure.query(async ({ ctx }) => {
      return getUserSummaryStats(ctx.user.id);
    }),
  }),

  stripe: router({
    /** Stripe Checkout セッションを作成して URL を返す */
    createSession: protectedProcedure
      .input(z.object({
        planKey: z.enum(PLAN_KEYS),
      }))
      .mutation(async ({ ctx, input }) => {
        const proto = (ctx.req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0].trim() ?? "https";
        const host  = (ctx.req.headers["x-forwarded-host"] as string | undefined) ?? (ctx.req.headers.host as string) ?? "m-autoplanning.com";
        const origin = `${proto}://${host}`;

        return createCheckoutSession({
          planKey:            input.planKey,
          userId:             ctx.user.id,
          userEmail:          ctx.user.email,
          existingCustomerId: ctx.user.stripeCustomerId,
          successUrl: `${origin}/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl:  `${origin}/pricing?checkout=cancelled`,
        });
      }),

    /** 支払い完了後にセッションを検証してプランを有効化する */
    activatePlan: protectedProcedure
      .input(z.object({ sessionId: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const session = await retrieveCompletedSession(input.sessionId);

        if (session.payment_status !== "paid") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "支払いが完了していません" });
        }
        if (session.metadata?.userId !== String(ctx.user.id)) {
          throw new TRPCError({ code: "FORBIDDEN", message: "不正なセッションです" });
        }

        const planType  = (session.metadata?.planType ?? "premium") as "premium" | "premium_plus";
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id ?? "";
        const sub        = session.subscription as any;
        const subscriptionId = typeof sub === "string" ? sub : sub?.id ?? "";

        await activateStripePlan(ctx.user.id, planType, customerId, subscriptionId);
        return { success: true, planType };
      }),

    /** Stripe Billing Portal URL を返す（プラン変更・解約） */
    createPortal: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user.stripeCustomerId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe カスタマーが見つかりません。サポートにお問い合わせください。" });
        }
        const proto  = (ctx.req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0].trim() ?? "https";
        const host   = (ctx.req.headers["x-forwarded-host"] as string | undefined) ?? (ctx.req.headers.host as string) ?? "m-autoplanning.com";
        const origin = `${proto}://${host}`;

        return createPortalSession({
          customerId: ctx.user.stripeCustomerId,
          returnUrl:  `${origin}/pricing?portal=return`,
        });
      }),

    /** Stripe からサブスクリプション状態を同期する */
    syncStatus: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user.stripeSubscriptionId) {
          return { synced: false, planType: ctx.user.userPlanType };
        }

        const sub = await retrieveSubscription(ctx.user.stripeSubscriptionId);
        const isActive = sub.status === "active" || sub.status === "trialing";

        if (!isActive) {
          await deactivateStripePlan(ctx.user.id);
          return { synced: true, planType: "free" as const };
        }

        return { synced: true, planType: ctx.user.userPlanType };
      }),
  }),
});
export type AppRouter = typeof appRouter;
