import webpush from "web-push";
import { getPushSubscriptionsForReminder } from "./db";

let vapidReady = false;

function ensureVapid() {
  if (vapidReady) return true;
  const pub   = process.env.VAPID_PUBLIC_KEY;
  const priv  = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.VAPID_EMAIL ?? "mailto:admin@m-autoplanning.com";
  if (!pub || !priv) return false;
  webpush.setVapidDetails(email, pub, priv);
  vapidReady = true;
  return true;
}

export function isPushConfigured(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: { title: string; body: string; url?: string; tag?: string }
): Promise<void> {
  if (!ensureVapid()) throw new Error("VAPID keys not configured");
  await webpush.sendNotification(
    { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
    JSON.stringify({
      title: payload.title,
      body:  payload.body,
      url:   payload.url  ?? "/calendar",
      tag:   payload.tag  ?? "default",
    })
  );
}

/** 毎日 18:00 JST に呼び出す。当日未トレーニングユーザーへリマインドを送信 */
export async function sendStreakReminders(): Promise<void> {
  if (!ensureVapid()) {
    console.warn("[Push] VAPID not configured — skipping streak reminders");
    return;
  }

  const todayJST = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = await getPushSubscriptionsForReminder();
  let sent = 0;

  for (const row of rows) {
    if (row.lastWorkoutDate === todayJST) continue; // 本日トレーニング済み

    try {
      await sendPush(
        { endpoint: row.endpoint, p256dh: row.p256dh, auth: row.auth },
        {
          title: "🔥 ストリーク維持チャンス！",
          body:  "今日まだトレーニングしていません。ストリークを守りましょう！",
          url:   "/calendar",
          tag:   "streak-reminder",
        }
      );
      sent++;
    } catch (e: any) {
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        // サブスクリプションが無効 → DBから削除してもよいが、ここでは無視
        console.warn(`[Push] Subscription expired for user ${row.userId}`);
      } else {
        console.error(`[Push] Send error for user ${row.userId}:`, e?.message);
      }
    }
  }

  console.log(`[Push] Streak reminders sent: ${sent}/${rows.length}`);
}
