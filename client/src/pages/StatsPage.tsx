import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { usePlan } from "@/hooks/usePlan";
import PremiumGate from "@/components/PremiumGate";
import { Loader2, Flame, Trophy, Dumbbell, BarChart3, CalendarDays, Zap, Crown, Lock } from "lucide-react";
import { useLocation } from "wouter";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

// ── アニメーション付き数値カウンター ──────────────────────────────────
function AnimatedCounter({
  value,
  decimals = 0,
}: {
  value: number;
  decimals?: number;
}) {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { damping: 22, stiffness: 40 });
  const display = useTransform(spring, (v) => {
    const n = decimals > 0 ? v.toFixed(decimals) : Math.round(v);
    return Number(n).toLocaleString("ja-JP");
  });

  useEffect(() => {
    const t = setTimeout(() => mv.set(value), 120);
    return () => clearTimeout(t);
  }, [value, mv]);

  return <motion.span>{display}</motion.span>;
}

// ── 個別スタットカード ────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color = "primary",
  delay = 0,
  decimals = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  unit?: string;
  color?: "primary" | "blue" | "green" | "yellow";
  delay?: number;
  decimals?: number;
}) {
  const colorMap = {
    primary: { text: "text-primary", bg: "bg-primary/8", border: "border-primary/25", icon: "text-primary" },
    blue:    { text: "text-blue-400", bg: "bg-blue-400/8", border: "border-blue-400/25", icon: "text-blue-400" },
    green:   { text: "text-green-400", bg: "bg-green-400/8", border: "border-green-400/25", icon: "text-green-400" },
    yellow:  { text: "text-yellow-400", bg: "bg-yellow-400/8", border: "border-yellow-400/25", icon: "text-yellow-400" },
  };
  const c = colorMap[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className={`rounded-lg border ${c.border} ${c.bg} p-4 flex flex-col gap-2`}
    >
      <div className="flex items-center gap-2">
        <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
        <span className="text-[10px] text-muted-foreground label-futuristic">{label}</span>
      </div>
      <div className={`text-3xl font-black font-mono tracking-tight ${c.text}`}>
        <AnimatedCounter value={value} decimals={decimals} />
        {unit && <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>}
      </div>
    </motion.div>
  );
}

// ── メインコンポーネント ──────────────────────────────────────────────
export default function StatsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { isPremium, isAdmin, isLoading: planLoading } = usePlan();
  const showPremium = isPremium || isAdmin;

  const { data: summary, isLoading: summaryLoading } = trpc.stats.mySummary.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: streakData, isLoading: streakLoading } = trpc.streak.get.useQuery(undefined, {
    enabled: isAuthenticated && showPremium,
    retry: false,
  });

  const { data: prs } = trpc.progress.personalRecords.useQuery(undefined, {
    enabled: isAuthenticated && showPremium,
  });

  if (authLoading || planLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">データを確認するにはログインが必要です</p>
          <button
            onClick={() => setLocation("/login")}
            className="px-4 py-2 rounded border border-primary/40 bg-primary/10 text-primary text-sm hover:bg-primary/20 transition-colors"
          >
            ログイン / 登録
          </button>
        </div>
      </div>
    );
  }

  const isLoading = summaryLoading;
  const volumeTons = summary ? summary.totalVolumeKg / 1000 : 0;

  // バッジ獲得数
  const earnedBadgeCount = streakData
    ? streakData.badges.filter((b) => b.earned).length
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* ── ヘッダー ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="label-futuristic text-primary/60 text-[10px] mb-1">M. AUTOPLANNING</div>
          <h1 className="heading-futuristic text-2xl font-black glow-orange-text">MY DATA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {summary?.firstWorkoutDate
              ? `${summary.firstWorkoutDate} からの累計記録`
              : "あなたのトレーニングデータ"}
          </p>
        </motion.div>

        {/* ── 基本スタット（全ユーザー） ── */}
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-lg bg-card/60 animate-pulse border border-border/30" />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                icon={CalendarDays}
                label="トレーニング回数"
                value={summary?.totalSessions ?? 0}
                unit="回"
                color="primary"
                delay={0.05}
              />
              <StatCard
                icon={Zap}
                label="完了セット数"
                value={summary?.totalSets ?? 0}
                unit="セット"
                color="blue"
                delay={0.1}
              />
              <StatCard
                icon={BarChart3}
                label="累計挙上重量"
                value={volumeTons}
                unit="t"
                color="green"
                delay={0.15}
                decimals={1}
              />
              <StatCard
                icon={CalendarDays}
                label="利用開始から"
                value={summary?.accountAgeDays ?? 0}
                unit="日"
                color="yellow"
                delay={0.2}
              />
            </div>

            {/* 最もよくトレーニングした種目 */}
            {summary?.mostTrainedExercise && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="rounded-lg border border-border bg-card/60 px-4 py-3 flex items-center gap-3"
              >
                <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-muted-foreground label-futuristic mb-0.5">最も鍛えた種目</p>
                  <p className="text-sm font-bold text-foreground truncate">{summary.mostTrainedExercise}</p>
                </div>
              </motion.div>
            )}
          </>
        )}

        {/* ── Premium セクション ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* セクション区切り */}
          <div className="flex items-center gap-3 mb-4">
            <div className="h-px flex-1 bg-border/50" />
            <div className="flex items-center gap-1.5 text-[10px] text-primary/70 label-futuristic">
              <Crown className="w-3 h-3" />
              PREMIUM DATA
            </div>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          {!showPremium ? (
            /* ── 無料ユーザー: Premiumティーザー ── */
            <div className="relative rounded-xl border border-primary/20 bg-card/40 overflow-hidden">
              {/* ぼかしオーバーレイ */}
              <div className="absolute inset-0 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-3 bg-background/60">
                <Lock className="w-5 h-5 text-primary/70" />
                <p className="text-sm font-bold text-foreground">Premium でさらに詳しく</p>
                <p className="text-xs text-muted-foreground text-center max-w-[200px]">
                  ストリーク記録・バッジ・個人記録が解放されます
                </p>
                <button
                  onClick={() => setLocation("/pricing")}
                  className="px-4 py-2 rounded border border-primary bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors"
                >
                  Premium にアップグレード
                </button>
              </div>
              {/* ティーザーコンテンツ（ぼかし） */}
              <div className="p-4 space-y-3 blur-[3px] select-none pointer-events-none">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-[10px] text-muted-foreground">現在のストリーク</p>
                    <p className="text-3xl font-black font-mono text-primary">--</p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                    <p className="text-[10px] text-muted-foreground">最長ストリーク</p>
                    <p className="text-3xl font-black font-mono text-primary">--</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-card/60 p-3">
                  <p className="text-xs text-muted-foreground">バッジ: 🏆 🔥 💪 ⚡</p>
                </div>
              </div>
            </div>
          ) : (
            /* ── Premium ユーザー: 全データ表示 ── */
            <div className="space-y-4">
              {/* ストリーク */}
              {streakLoading ? (
                <div className="h-24 rounded-lg bg-card/60 animate-pulse border border-border/30" />
              ) : streakData ? (
                <div className="grid grid-cols-2 gap-3">
                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.35, duration: 0.4 }}
                    className="rounded-lg border border-primary/25 bg-primary/8 p-4"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Flame className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] text-muted-foreground label-futuristic">現在のストリーク</span>
                    </div>
                    <div className="text-3xl font-black font-mono text-primary">
                      <AnimatedCounter value={streakData.currentStreak} />
                      <span className="text-sm font-normal text-muted-foreground ml-1">日</span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="rounded-lg border border-yellow-400/25 bg-yellow-400/8 p-4"
                  >
                    <div className="flex items-center gap-1.5 mb-2">
                      <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-[10px] text-muted-foreground label-futuristic">最長ストリーク</span>
                    </div>
                    <div className="text-3xl font-black font-mono text-yellow-400">
                      <AnimatedCounter value={streakData.longestStreak} />
                      <span className="text-sm font-normal text-muted-foreground ml-1">日</span>
                    </div>
                  </motion.div>
                </div>
              ) : null}

              {/* バッジ */}
              {streakData && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45, duration: 0.4 }}
                  className="rounded-lg border border-border bg-card/60 p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                      <span className="text-xs font-bold">獲得バッジ</span>
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {earnedBadgeCount} / {streakData.badges.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {streakData.badges.map((badge) => (
                      <div
                        key={badge.id}
                        title={badge.desc}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-all ${
                          badge.earned
                            ? "border-primary/30 bg-primary/8 text-foreground"
                            : "border-border/20 bg-card/20 text-muted-foreground/30"
                        }`}
                      >
                        <span>{badge.emoji}</span>
                        <span className="font-medium">{badge.label}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* 個人記録 TOP5 */}
              {prs && prs.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                  className="rounded-lg border border-border bg-card/60 p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="w-3.5 h-3.5 text-primary" />
                    <span className="text-xs font-bold">個人記録 (PR)</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-1.5 text-muted-foreground font-medium">種目</th>
                        <th className="text-right py-1.5 text-muted-foreground font-medium">最大重量</th>
                        <th className="text-right py-1.5 text-muted-foreground font-medium">推定1RM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prs.slice(0, 5).map((pr) => (
                        <tr key={pr.exerciseName} className="border-b border-border/40">
                          <td className="py-2 text-foreground font-medium truncate max-w-[120px]">{pr.exerciseName}</td>
                          <td className="py-2 text-right font-mono text-primary">{pr.maxWeight}kg</td>
                          <td className="py-2 text-right font-mono text-muted-foreground">{pr.est1RM}kg</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </motion.div>
              )}
            </div>
          )}
        </motion.div>

        {/* ── フッター ── */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-[10px] text-muted-foreground/60 text-center label-futuristic pb-4"
        >
          M. AUTOPLANNING — PERSONAL DATA REPORT
        </motion.p>

      </div>
    </div>
  );
}
