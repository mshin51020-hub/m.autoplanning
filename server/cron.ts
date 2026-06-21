import cron from "node-cron";
import { sendStreakReminders } from "./push";

let started = false;

export function startCronJobs() {
  if (started) return;
  started = true;

  // 毎日 18:00 JST (= 09:00 UTC) にストリークリマインダーを送信
  cron.schedule("0 9 * * *", async () => {
    console.log("[Cron] Running streak reminders...");
    try {
      await sendStreakReminders();
    } catch (e) {
      console.error("[Cron] Streak reminder failed:", e);
    }
  });

  console.log("[Cron] Jobs scheduled (streak reminder: 18:00 JST daily)");
}
