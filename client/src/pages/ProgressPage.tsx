import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, Trophy, BarChart3, Dumbbell } from "lucide-react";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import BodyMeasurementSection from "@/components/BodyMeasurement";
import PremiumGate from "@/components/PremiumGate";
import { usePlan } from "@/hooks/usePlan";

const RANGE_OPTIONS = [
  { label: "1M",  days: 30 },
  { label: "3M",  days: 90 },
  { label: "6M",  days: 180 },
  { label: "1Y",  days: 365 },
] as const;

const CHART_COLORS = {
  maxWeight:    "#f97316",
  estimated1RM: "#38bdf8",
  volume:       "#22c55e",
};

const TOOLTIP_STYLE = {
  contentStyle: { background: "#111827", border: "1px solid #1e293b", borderRadius: 8, fontSize: 12 },
  labelStyle:   { color: "#f1f5f9" },
  itemStyle:    { fontSize: 12 },
};

function ProgressPageInner() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [days, setDays] = useState<30 | 90 | 180 | 365>(90);

  const { data: exercises, isLoading: loadingEx } = trpc.progress.trackedExercises.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const activeExercise = selectedExercise ?? exercises?.[0] ?? null;

  const { data: history, isLoading: loadingHist } = trpc.progress.exerciseHistory.useQuery(
    { exerciseName: activeExercise ?? "", days },
    { enabled: isAuthenticated && !!activeExercise }
  );

  const { data: weeklySummary } = trpc.progress.weeklySummary.useQuery(
    { weeks: 12 },
    { enabled: isAuthenticated }
  );

  const { data: prs } = trpc.progress.personalRecords.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (authLoading) {
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
          <p className="text-muted-foreground">進捗を確認するにはログインが必要です</p>
          <Button onClick={() => setLocation("/login")}>ログイン / 登録</Button>
        </div>
      </div>
    );
  }

  const hasHistory = (history?.length ?? 0) > 0;
  const hasWeekly  = (weeklySummary?.length ?? 0) > 0;
  const hasPRs     = (prs?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">

        {/* ── ヘッダー ── */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-primary" />
            <h1 className="text-xl font-black tracking-tight">進捗グラフ</h1>
          </div>
          <p className="text-sm text-muted-foreground">種目ごとの重量推移・ボリューム・個人記録を確認できます</p>
        </div>

        {/* ── 種目別グラフ ── */}
        <section className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Dumbbell className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-bold">種目別 重量推移</h2>
          </div>

          {/* 種目セレクター */}
          {loadingEx ? (
            <div className="flex gap-2 flex-wrap">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-7 w-24 rounded bg-border/30 animate-pulse" />
              ))}
            </div>
          ) : (exercises?.length ?? 0) === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              まだ記録がありません。ワークアウトを完了するとここに表示されます。
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {exercises!.slice(0, 12).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedExercise(name)}
                  className={`px-2.5 py-1 text-xs rounded border transition-colors ${
                    activeExercise === name
                      ? "border-primary bg-primary/10 text-primary font-semibold"
                      : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          {/* 期間セレクター */}
          {activeExercise && (
            <div className="flex gap-1.5">
              {RANGE_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setDays(opt.days)}
                  className={`px-2.5 py-1 text-xs rounded border font-mono transition-colors ${
                    days === opt.days
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* 重量推移チャート */}
          {loadingHist ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : hasHistory ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={history} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#64748b" }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "#64748b" }} unit="kg" />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend
                    iconSize={10}
                    wrapperStyle={{ fontSize: 11, color: "#94a3b8" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="maxWeight"
                    name="最大重量"
                    stroke={CHART_COLORS.maxWeight}
                    strokeWidth={2}
                    dot={{ r: 3, fill: CHART_COLORS.maxWeight }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="estimated1RM"
                    name="推定1RM"
                    stroke={CHART_COLORS.estimated1RM}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>

              {/* ボリュームチャート */}
              <p className="text-xs text-muted-foreground pt-2">セッション別ボリューム</p>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={history} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 9, fill: "#64748b" }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis tick={{ fontSize: 9, fill: "#64748b" }} unit="kg" />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar
                    dataKey="volume"
                    name="ボリューム"
                    fill={CHART_COLORS.volume}
                    radius={[2, 2, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </>
          ) : activeExercise ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              この期間のデータがありません
            </p>
          ) : null}
        </section>

        {/* ── 週別ボリューム ── */}
        {hasWeekly && (
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold">週別トレーニングボリューム（直近12週）</h2>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={weeklySummary} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 9, fill: "#64748b" }}
                  tickFormatter={(v) => v.split("-")[1] ? `W${v.split("-")[1]}` : v}
                />
                <YAxis tick={{ fontSize: 9, fill: "#64748b" }} unit="kg" />
                <Tooltip
                  {...TOOLTIP_STYLE}
                  formatter={(value, name) =>
                    name === "volume" ? [`${Number(value).toLocaleString()}kg`, "ボリューム"] : [value, name]
                  }
                />
                <Bar
                  dataKey="volume"
                  name="volume"
                  fill={CHART_COLORS.maxWeight}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* ── 個人記録 ── */}
        {hasPRs && (
          <section className="rounded-xl border border-border bg-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="text-sm font-bold">個人記録（PR）</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-muted-foreground font-medium">種目</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">最大重量</th>
                    <th className="text-right py-2 text-muted-foreground font-medium">推定1RM</th>
                  </tr>
                </thead>
                <tbody>
                  {prs!.map((pr) => (
                    <tr key={pr.exerciseName} className="border-b border-border/50 hover:bg-primary/3 transition-colors">
                      <td className="py-2.5 text-foreground font-medium">{pr.exerciseName}</td>
                      <td className="py-2.5 text-right font-mono text-primary">{pr.maxWeight}kg</td>
                      <td className="py-2.5 text-right font-mono text-muted-foreground">{pr.est1RM}kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── 体重・体脂肪 ── */}
        <BodyMeasurementSection />

      </div>
    </div>
  );
}

export default function ProgressPage() {
  const { isPremium, isLoading } = usePlan();
  if (isLoading) return null;
  if (!isPremium) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="max-w-sm w-full">
          <PremiumGate feature="進捗グラフ・体重記録" />
        </div>
      </div>
    );
  }
  return <ProgressPageInner />;
}
