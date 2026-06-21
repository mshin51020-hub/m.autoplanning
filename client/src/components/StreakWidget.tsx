import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Flame, ShieldCheck, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import PremiumGate from "@/components/PremiumGate";
import { usePlan } from "@/hooks/usePlan";

function todayJST(): string {
  const d = new Date();
  const offset = 9 * 60;
  const jst = new Date(d.getTime() + (offset - d.getTimezoneOffset()) * 60000);
  return jst.toISOString().slice(0, 10);
}

function StreakWidgetInner() {
  const { isAuthenticated } = useAuth();
  const [showBadges, setShowBadges] = useState(false);

  const { data, refetch } = trpc.streak.get.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  const freezeMutation = trpc.streak.useFreeze.useMutation({
    onSuccess: (res) => {
      toast.success(res.message);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated || !data) return null;

  const { currentStreak, longestStreak, freezesLeft, badges } = data;
  const earnedBadges = badges.filter((b) => b.earned);
  const isOnFire = currentStreak >= 7;

  return (
    <div className="border border-border bg-card/60 mb-6">
      {/* ── メイン行 ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* フレームアイコン */}
        <div
          className={`relative flex items-center justify-center w-10 h-10 rounded-full border ${
            isOnFire
              ? "border-primary/50 bg-primary/10"
              : currentStreak > 0
              ? "border-border bg-card"
              : "border-border/40 bg-card/40"
          }`}
        >
          <Flame
            className={`w-5 h-5 transition-colors ${
              isOnFire ? "text-primary" : currentStreak > 0 ? "text-orange-400/70" : "text-muted-foreground/30"
            }`}
          />
          {isOnFire && (
            <span
              className="absolute inset-0 rounded-full animate-ping opacity-20"
              style={{ background: "var(--primary)" }}
            />
          )}
        </div>

        {/* テキスト */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-black font-mono tracking-tight ${
                currentStreak > 0 ? "text-primary" : "text-muted-foreground/40"
              }`}
            >
              {currentStreak}
            </span>
            <span className="text-sm text-muted-foreground">日連続</span>
            {longestStreak > 0 && (
              <span className="text-xs text-muted-foreground/60 ml-1">
                最高 {longestStreak}日
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {currentStreak === 0
              ? "今日トレーニングを始めよう"
              : currentStreak < 7
              ? `あと${7 - currentStreak}日で🔥バッジ獲得`
              : isOnFire
              ? "継続中！この調子で続けよう"
              : "継続中"}
          </p>
        </div>

        {/* バッジ数 + フリーズボタン */}
        <div className="flex items-center gap-2 shrink-0">
          {earnedBadges.length > 0 && (
            <button
              type="button"
              onClick={() => setShowBadges((v) => !v)}
              className="flex items-center gap-1 px-2 py-1 border border-border/60 hover:border-primary/40 text-muted-foreground hover:text-primary transition-colors rounded"
            >
              <Trophy className="w-3 h-3" />
              <span className="text-xs font-mono">{earnedBadges.length}</span>
            </button>
          )}
          {freezesLeft > 0 && currentStreak >= 3 && (
            <button
              type="button"
              onClick={() => freezeMutation.mutate()}
              disabled={freezeMutation.isPending}
              title={`ストリークフリーズを使用（残り${freezesLeft}回）`}
              className="flex items-center gap-1 px-2 py-1 border border-blue-400/30 text-blue-400 hover:bg-blue-400/10 transition-colors rounded text-xs"
            >
              <ShieldCheck className="w-3 h-3" />
              <span className="font-mono">{freezesLeft}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── バッジ展開パネル ── */}
      {showBadges && (
        <div className="border-t border-border px-4 py-3">
          <p className="text-xs text-muted-foreground mb-2 label-futuristic">獲得バッジ</p>
          <div className="flex flex-wrap gap-2">
            {badges.map((badge) => (
              <div
                key={badge.id}
                title={badge.desc}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-opacity ${
                  badge.earned
                    ? "border-primary/30 bg-primary/8 text-foreground"
                    : "border-border/30 bg-card/30 text-muted-foreground/30 opacity-40"
                }`}
              >
                <span>{badge.emoji}</span>
                <span className="font-medium">{badge.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StreakWidget() {
  const { isPremium } = usePlan();
  if (!isPremium) {
    return <PremiumGate feature="ストリーク・バッジ" />;
  }
  return <StreakWidgetInner />;
}
