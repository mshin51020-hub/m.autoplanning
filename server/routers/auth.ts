/**
 * 独自認証ルーター（メール＋パスワード）
 * - register: 会員登録
 * - login: ログイン
 * - logout: ログアウト
 * - me: 現在のユーザー情報
 * - disclaimerStatus: 免責事項同意状態
 * - agreeDisclaimer: 免責事項に同意
 * - updateName: 表示名変更
 * - updatePassword: パスワード変更
 * - deleteAccount: アカウント削除
 */

import { z } from "zod";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getSessionCookieOptions } from "../_core/cookies";
import { sdk } from "../_core/sdk";
import { getDb } from "../db";
import { users, profiles, generatedMenus, workoutLogs } from "../../drizzle/schema";
import { ONE_YEAR_MS } from "@shared/const";
import { COOKIE_NAME } from "@shared/const";

const BCRYPT_ROUNDS = 12;

/** 管理者専用メールアドレス（このメールのみadminSetPasswordを許可） */
const ADMIN_EMAIL = "mshin5.1020@gmail.com";

// ── インメモリ レートリミッター ──────────────────────────────────────────────
// login / register エンドポイントへのブルートフォース攻撃を防ぐ。
// IPアドレスごとに試行回数と最後のリセット時刻を記録し、
// 15分間に10回を超えるリクエストをブロックする。
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15分
const RATE_LIMIT_MAX = 10;                     // 最大試行回数

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): void {
  const now = Date.now();

  // Map が大きくなりすぎたら期限切れエントリを掃除する
  // setInterval は Cloud Run で使えないため、リクエスト時にオンデマンドで実行する
  if (rateLimitStore.size > 500) {
    for (const [key, e] of Array.from(rateLimitStore.entries())) {
      if (now > e.resetAt) rateLimitStore.delete(key);
    }
  }

  const entry = rateLimitStore.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return;
  }

  entry.count += 1;
  if (entry.count > RATE_LIMIT_MAX) {
    const waitMin = Math.ceil((entry.resetAt - now) / 60000);
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `試行回数が多すぎます。${waitMin}分後に再度お試しください。`,
    });
  }
}

export const authRouter = router({
  /** 現在のログインユーザー情報を返す（未ログインはnull） */
  me: publicProcedure.query(opts => opts.ctx.user),

  /** 会員登録 */
  register: publicProcedure
    .input(z.object({
      email: z.string().email("有効なメールアドレスを入力してください"),
      password: z.string().min(8, "パスワードは8文字以上で入力してください"),
      name: z.string().min(1, "名前を入力してください").max(64),
    }))
    .mutation(async ({ input, ctx }) => {
      checkRateLimit(ctx.req.ip ?? ctx.req.socket.remoteAddress ?? "unknown");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "データベースに接続できません" });

      // メールアドレスの重複チェック
      const existing = await db.select({ id: users.id })
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT", message: "このメールアドレスはすでに登録されています" });
      }

      // パスワードハッシュ化
      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

      // openIdはemailベースで生成（独自認証ユーザーの識別子）
      const openId = `email_${crypto.randomBytes(16).toString("hex")}`;

      const now = new Date();
      await db.insert(users).values({
        openId,
        email: input.email,
        name: input.name,
        passwordHash,
        loginMethod: "email",
        role: "user",
        lastSignedIn: now,
      });

      const newUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      if (!newUser[0]) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "ユーザーの作成に失敗しました" });

      // セッションクッキーを発行
      const token = await sdk.createSessionToken(openId, { name: input.name });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true, user: { id: newUser[0].id, email: newUser[0].email, name: newUser[0].name, role: newUser[0].role } };
    }),

  /** ログイン */
  login: publicProcedure
    .input(z.object({
      email: z.string().email("有効なメールアドレスを入力してください"),
      password: z.string().min(1, "パスワードを入力してください"),
    }))
    .mutation(async ({ input, ctx }) => {
      checkRateLimit(ctx.req.ip ?? ctx.req.socket.remoteAddress ?? "unknown");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "データベースに接続できません" });

      const userRows = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
      const user = userRows[0];

      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "メールアドレスまたはパスワードが正しくありません" });
      }

      // 管理者でパスワード未設定の場合は専用設定ページへ誘導
      if (!user.passwordHash && user.role === "admin" && user.email === ADMIN_EMAIL) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "ADMIN_PASSWORD_NOT_SET",
        });
      }

      if (!user.passwordHash) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "メールアドレスまたはパスワードが正しくありません" });
      }

      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "メールアドレスまたはパスワードが正しくありません" });
      }

      // lastSignedIn更新
      await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, user.id));

      // セッションクッキーを発行
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }),

  /** ログアウト */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),

  /**
   * 管理者専用パスワード初期設定
   * - ADMIN_EMAILのみ許可
   * - passwordHashが未設定の場合のみ実行可能（初回設定専用）
   * - 設定後は自動ログイン
   */
  adminSetPassword: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8, "パスワードは8文字以上で入力してください"),
      confirmPassword: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      // 管理者メール以外は拒否
      if (input.email !== ADMIN_EMAIL) {
        throw new TRPCError({ code: "FORBIDDEN", message: "この操作は許可されていません" });
      }

      if (input.password !== input.confirmPassword) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "パスワードが一致しません" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "データベースに接続できません" });

      const userRows = await db.select().from(users).where(eq(users.email, ADMIN_EMAIL)).limit(1);
      const user = userRows[0];

      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "管理者アカウントが見つかりません" });
      }

      // すでにパスワードが設定済みの場合は拒否（再設定はresetPasswordを使う）
      if (user.passwordHash) {
        throw new TRPCError({ code: "CONFLICT", message: "パスワードはすでに設定済みです。ログイン画面からログインしてください" });
      }

      const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
      await db.update(users)
        .set({ passwordHash, loginMethod: "email", lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      // 自動ログイン
      const token = await sdk.createSessionToken(user.openId, { name: user.name ?? "" });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return { success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
    }),

  /** 免責事項の同意状態を取得する */
  disclaimerStatus: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { agreed: false, agreedAt: null };
    const row = await db.select({ disclaimerAgreedAt: users.disclaimerAgreedAt })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    const agreedAt = row[0]?.disclaimerAgreedAt ?? null;
    return { agreed: agreedAt !== null, agreedAt };
  }),

  /** 免責事項に同意する */
  agreeDisclaimer: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    await db.update(users)
      .set({ disclaimerAgreedAt: new Date() })
      .where(eq(users.id, ctx.user.id));
    return { success: true };
  }),

  /** 表示名を変更する */
  updateName: protectedProcedure
    .input(z.object({ name: z.string().min(1, "名前を入力してください").max(64) }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "データベースに接続できません" });
      await db.update(users).set({ name: input.name }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  /** パスワードを変更する（現在のパスワードによる確認を要求） */
  updatePassword: protectedProcedure
    .input(z.object({
      currentPassword: z.string().min(1, "現在のパスワードを入力してください"),
      newPassword: z.string().min(8, "新しいパスワードは8文字以上で入力してください"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "データベースに接続できません" });
      const userRows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const user = userRows[0];
      if (!user?.passwordHash) throw new TRPCError({ code: "BAD_REQUEST", message: "パスワードが設定されていません" });
      const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
      if (!isValid) throw new TRPCError({ code: "UNAUTHORIZED", message: "現在のパスワードが正しくありません" });
      const passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_ROUNDS);
      await db.update(users).set({ passwordHash }).where(eq(users.id, ctx.user.id));
      return { success: true };
    }),

  /**
   * アカウント削除
   * パスワード確認を要求し、一致した場合のみ
   * workout_logs → generated_menus → profiles → users の順に削除する。
   * 管理者アカウントは削除不可。
   */
  deleteAccount: protectedProcedure
    .input(z.object({
      password: z.string().min(1, "パスワードを入力してください"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "データベースに接続できません" });

      const userRows = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      const user = userRows[0];
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "ユーザーが見つかりません" });

      if (user.role === "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "管理者アカウントは削除できません" });
      }

      if (!user.passwordHash) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "パスワードが設定されていないアカウントは削除できません。お問い合わせください" });
      }

      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "パスワードが正しくありません" });
      }

      // 関連データを順に削除（外部キー制約に配慮した順序）
      await db.delete(workoutLogs).where(eq(workoutLogs.userId, ctx.user.id));
      await db.delete(generatedMenus).where(eq(generatedMenus.userId, ctx.user.id));
      await db.delete(profiles).where(eq(profiles.userId, ctx.user.id));
      await db.delete(users).where(eq(users.id, ctx.user.id));

      // セッションクッキーを削除
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

      return { success: true };
    }),
});
