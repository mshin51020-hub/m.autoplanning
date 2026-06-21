import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { contacts } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

// お問い合わせ送信のレートリミット：1IPあたり1時間に5件まで
const CONTACT_RATE_WINDOW_MS = 60 * 60 * 1000;
const CONTACT_RATE_MAX = 5;
const contactRateStore = new Map<string, { count: number; resetAt: number }>();

function checkContactRateLimit(ip: string): void {
  const now = Date.now();

  // Map が大きくなりすぎたら期限切れエントリを掃除する
  // setInterval は Cloud Run で使えないため、リクエスト時にオンデマンドで実行する
  if (contactRateStore.size > 500) {
    for (const [key, e] of Array.from(contactRateStore.entries())) {
      if (now > e.resetAt) contactRateStore.delete(key);
    }
  }

  const entry = contactRateStore.get(ip);
  if (!entry || now > entry.resetAt) {
    contactRateStore.set(ip, { count: 1, resetAt: now + CONTACT_RATE_WINDOW_MS });
    return;
  }
  entry.count += 1;
  if (entry.count > CONTACT_RATE_MAX) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "送信回数の上限（1時間に5件）に達しました。しばらく経ってから再度お試しください。",
    });
  }
}

export const contactRouter = router({
  /**
   * お問い合わせを送信（誰でも利用可能）
   */
  submit: publicProcedure
    .input(
      z.object({
        name: z.string().min(1, "お名前を入力してください").max(128),
        email: z.string().email("有効なメールアドレスを入力してください").max(320),
        category: z.enum(["feature", "bug", "other"]),
        message: z.string().min(10, "10文字以上入力してください").max(2000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      checkContactRateLimit(ctx.req.ip ?? ctx.req.socket.remoteAddress ?? "unknown");
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB接続エラー" });
      await db.insert(contacts).values({
        name: input.name,
        email: input.email,
        category: input.category,
        message: input.message,
        isRead: 0,
      });
      return { success: true };
    }),

  /**
   * お問い合わせ一覧を取得（管理者のみ）
   */
  list: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB接続エラー" });
    const rows = await db
      .select()
      .from(contacts)
      .orderBy(desc(contacts.createdAt));
    return rows;
  }),

  /**
   * 既読にする（管理者のみ）
   */
  markAsRead: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB接続エラー" });
      await db
        .update(contacts)
        .set({ isRead: 1 })
        .where(eq(contacts.id, input.id));
      return { success: true };
    }),

  /**
   * 未読件数を取得（管理者のみ）
   */
  unreadCount: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) return { count: 0 };
    const rows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.isRead, 0));
    return { count: rows.length };
  }),
});
