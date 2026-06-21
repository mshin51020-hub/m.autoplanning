import { Bell, BellOff, X } from "lucide-react";
import { useState } from "react";
import { usePushNotification } from "@/hooks/usePushNotification";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

export default function PushNotificationBanner() {
  const { isAuthenticated } = useAuth();
  const [dismissed, setDismissed] = useState(() =>
    sessionStorage.getItem("push-banner-dismissed") === "1"
  );

  const { data: vapidData } = trpc.push.vapidPublicKey.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: Infinity,
  });

  const { isSupported, isEnabled, isLoading, permission, enable, disable } = usePushNotification();

  // 表示しない条件
  if (!isAuthenticated) return null;
  if (!isSupported) return null;
  if (!vapidData?.enabled) return null;   // VAPID 未設定
  if (dismissed) return null;
  if (permission === "denied") return null;
  if (isEnabled) return null;             // 既に購読済み

  function handleDismiss() {
    sessionStorage.setItem("push-banner-dismissed", "1");
    setDismissed(true);
  }

  return (
    <div className="mx-4 mt-3 mb-1 flex items-center gap-3 px-3 py-2.5 rounded-lg border border-primary/30 bg-primary/5">
      <Bell className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground">ストリーク維持リマインダー</p>
        <p className="text-[11px] text-muted-foreground">毎日 18時に未トレーニング時のみ通知します</p>
      </div>
      <button
        type="button"
        onClick={enable}
        disabled={isLoading}
        className="shrink-0 px-2.5 py-1 text-[11px] font-bold rounded bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {isLoading ? "..." : "有効にする"}
      </button>
      <button
        type="button"
        onClick={handleDismiss}
        className="shrink-0 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
        aria-label="閉じる"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
