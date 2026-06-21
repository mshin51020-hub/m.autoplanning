import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useMemo, useState } from "react";
import {
  ChevronLeft, ChevronRight, Flame, Dumbbell,
  CheckCircle2, Calendar, Loader2, Share2, Trophy,
} from "lucide-react";
import ShareModal from "@/components/ShareModal";

const DAY_LABELS = ["月", "火", "水", "木", "金", "土", "日"];

function localDateStr(d: Date): string {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

function localToday(): string {
  return localDateStr(new Date());
}

function getWeekDates(weekOffset: number): string[] {
  const base = new Date();
  const day = base.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(base);
  monday.setDate(base.getDate() + diffToMonday + weekOffset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return localDateStr(d);
  });
}

// ────────────────────────────────────────────────────────────────────────────
// カレンダーセル
// ────────────────────────────────────────────────────────────────────────────
function DayCell({
  date, today, entry, focus,
}: {
  date: string;
  today: string;
  entry?: { completedSets: number; totalSets: number };
  focus?: string;
}) {
  const dateNum = parseInt(date.slice(8));
  const isToday = date === today;
  const isPast = date < today;
  const allDone = entry && entry.totalSets > 0 && entry.completedSets === entry.totalSets;
  const partial = entry && entry.completedSets > 0 && !allDone;

  return (
    <div className={`flex flex-col items-center py-2 px-1 min-h-[80px] transition-colors border ${
      isToday
        ? "border-primary bg-primary/8 shadow-[0_0_8px_rgba(249,115,22,0.18)]"
        : allDone
        ? "border-primary/40 bg-primary/6"
        : partial
        ? "border-primary/30 bg-primary/3"
        : "border-border/60"
    }`}>
      {/* 日付 */}
      <span className={`text-sm font-mono leading-none mb-2 ${
        isToday ? "text-primary font-bold" : isPast ? "text-foreground/70" : "text-foreground"
      }`}>
        {dateNum}
      </span>

      {/* 状態アイコン */}
      {allDone && <CheckCircle2 className="w-4 h-4 text-primary mb-1.5 shrink-0" />}
      {partial && (
        <div className="w-4 h-4 rounded-full border-2 border-primary/70 flex items-center justify-center mb-1.5 shrink-0">
          <div className="w-1.5 h-1.5 rounded-full bg-primary/70" />
        </div>
      )}
      {!entry && isToday && <Dumbbell className="w-4 h-4 text-primary/70 mb-1.5 shrink-0" />}
      {!entry && isPast && (
        <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/30 mb-1.5 shrink-0" />
      )}
      {!entry && !isPast && !isToday && <div className="w-3.5 h-3.5 mb-1.5" />}

      {/* フォーカス部位 */}
      {focus && (
        <span className="text-[10px] text-center text-muted-foreground leading-tight line-clamp-2 px-0.5 w-full">
          {focus}
        </span>
      )}

      {/* 進捗 */}
      {entry && (
        <span className={`text-[11px] font-mono mt-auto pt-0.5 font-semibold ${
          allDone ? "text-primary" : "text-primary/80"
        }`}>
          {entry.completedSets}/{entry.totalSets}
        </span>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 空状態：プランなし
// ────────────────────────────────────────────────────────────────────────────
function EmptyPlanState({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="relative border-2 border-primary/40 bg-primary/5 p-8 mb-6 overflow-hidden">
      {/* コーナーデコレーション */}
      <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-primary/70" />
      <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-primary/70" />
      <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-primary/70" />
      <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-primary/70" />

      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 border border-primary/40 mx-auto">
          <Dumbbell className="w-7 h-7 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-foreground mb-1">プランがまだありません</h2>
          <p className="text-sm text-muted-foreground">プランを作成してワークアウトを記録しましょう</p>
        </div>

        {/* ステップ */}
        <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 border border-primary/50 text-primary text-[11px] font-bold">1</span>
            <span>プランを作成</span>
          </div>
          <div className="w-6 h-px bg-primary/30" />
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary/20 border border-primary/50 text-primary text-[11px] font-bold">2</span>
            <span>ワークアウト開始</span>
          </div>
        </div>

        <Button
          onClick={onNavigate}
          className="glow-orange px-8 font-semibold"
        >
          プランを作成する →
        </Button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────────────────────────────────────
export default function CalendarView() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [weekOffset, setWeekOffset] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const today = localToday();

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return localDateStr(d);
  }, []);
  const rangeEnd = weekDates[6];

  const { data: allLogs, isLoading: logsLoading } = trpc.workoutLog.getByDateRange.useQuery(
    { startDate: rangeStart, endDate: rangeEnd },
    { enabled: isAuthenticated }
  );

  const { data: menuHistory, isLoading: menuLoading } = trpc.menu.history.useQuery(
    { limit: 1 },
    { enabled: isAuthenticated }
  );

  const latestMenu = menuHistory?.[0];
  const plan = latestMenu?.menuData as any;
  const phases: any[] = plan?.phases ?? [];
  const days: any[] = phases[0]?.weeklyMenu?.days ?? [];
  const restDayLabels: string[] = phases[0]?.weeklyMenu?.restDays ?? [];

  const dateMap = useMemo(() => {
    const map = new Map<string, {
      dayIndex: number;
      menuId: number;
      completedSets: number;
      totalSets: number;
      volume: number;
    }>();
    (allLogs ?? []).forEach((log: any) => {
      if (!log.loggedDate) return;
      const e = map.get(log.loggedDate);
      if (!e) {
        map.set(log.loggedDate, {
          dayIndex: log.dayIndex,
          menuId: log.menuId,
          completedSets: log.completed === 1 ? 1 : 0,
          totalSets: 1,
          volume: log.completed === 1 && log.actualWeight && log.actualReps
            ? log.actualWeight * log.actualReps : 0,
        });
      } else {
        e.totalSets++;
        if (log.completed === 1) e.completedSets++;
        if (log.completed === 1 && log.actualWeight && log.actualReps) {
          e.volume += log.actualWeight * log.actualReps;
        }
      }
    });
    return map;
  }, [allLogs]);

  const streak = useMemo(() => {
    const trainingDates = new Set(
      Array.from(dateMap.entries())
        .filter(([, v]) => v.completedSets > 0)
        .map(([k]) => k)
    );
    let count = 0;
    const d = new Date();
    if (!trainingDates.has(today)) d.setDate(d.getDate() - 1);
    while (true) {
      const ds = localDateStr(d);
      if (!trainingDates.has(ds)) break;
      count++;
      d.setDate(d.getDate() - 1);
    }
    return count;
  }, [dateMap, today]);

  const FULL_DAY = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"] as const;
  const todayWeekLabel = FULL_DAY[new Date().getDay()];
  const todayPlanDay = days.find((d: any) => d.dayLabel === todayWeekLabel);
  const isTodayRestDay = restDayLabels.includes(todayWeekLabel);

  const monthStats = useMemo(() => {
    const ym = today.slice(0, 7);
    let sessions = 0;
    let volume = 0;
    dateMap.forEach((e, d) => {
      if (d.startsWith(ym) && e.completedSets > 0) {
        sessions++;
        volume += e.volume;
      }
    });
    return { sessions, volume };
  }, [dateMap, today]);

  const firstMonth = parseInt(weekDates[0].slice(5, 7));
  const lastMonth = parseInt(weekDates[6].slice(5, 7));
  const yearLabel = weekDates[0].slice(0, 4);
  const monthLabel = firstMonth === lastMonth
    ? `${yearLabel}年${firstMonth}月`
    : `${yearLabel}年${firstMonth}月〜${lastMonth}月`;

  if (authLoading || logsLoading || menuLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Calendar className="w-10 h-10 text-primary/60" />
        <p className="text-muted-foreground text-sm">カレンダーの閲覧にはログインが必要です</p>
        <Button onClick={() => setLocation("/login")} className="glow-orange">
          ログイン / 登録
        </Button>
      </div>
    );
  }

  const todayEntry = dateMap.get(today);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold tracking-tight">今日のトレーニング</h1>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <div className="flex items-center gap-1.5 bg-primary/12 border border-primary/40 px-3 py-1.5 rounded-sm">
              <Flame className="w-3.5 h-3.5 text-primary" />
              <span className="text-sm font-mono text-primary font-bold">{streak}日連続</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="flex items-center gap-1.5 text-xs border border-border px-2.5 py-1.5 text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors rounded-sm"
            title="シェアカードを作成"
          >
            <Share2 className="w-3.5 h-3.5" />
            シェア
          </button>
        </div>
      </div>

      {/* ── プランなし → 空状態 ── */}
      {!latestMenu && (
        <EmptyPlanState onNavigate={() => setLocation("/profile")} />
      )}

      {/* ── 今日のメニューカード（プランあり・今週表示時） ── */}
      {weekOffset === 0 && latestMenu && (
        <div className={`border p-4 mb-6 relative ${
          todayEntry && todayEntry.completedSets === todayEntry.totalSets
            ? "border-primary/60 bg-primary/8"
            : "border-primary/40 bg-primary/5"
        }`}>
          {/* コーナーデコ */}
          <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-primary/60" />
          <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-primary/60" />

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">
                {todayEntry ? "本日のワークアウト" : "今日のメニュー"}
              </span>
            </div>
            {todayEntry && (
              <span className="text-sm font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 border border-primary/30">
                {todayEntry.completedSets} / {todayEntry.totalSets} セット
              </span>
            )}
          </div>

          {isTodayRestDay ? (
            <div className="flex items-center gap-2 py-2">
              <Trophy className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">今日は休息日です。しっかり回復しましょう。</p>
            </div>
          ) : todayPlanDay ? (
            <>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-bold text-primary label-futuristic">
                  {todayPlanDay.dayLabel}
                </span>
                {todayPlanDay.focus && (
                  <span className="text-sm font-medium text-foreground">{todayPlanDay.focus}</span>
                )}
              </div>
              {(todayPlanDay.exercises ?? []).length > 0 && (
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                  {(todayPlanDay.exercises as any[]).slice(0, 3).map((ex: any) => ex.name).join(" · ")}
                  {(todayPlanDay.exercises as any[]).length > 3
                    ? ` 他${(todayPlanDay.exercises as any[]).length - 3}種目` : ""}
                </p>
              )}
              <Button
                onClick={() => setLocation(`/workout/${latestMenu.id}`)}
                className="glow-orange w-full sm:w-auto font-semibold"
              >
                {todayEntry ? "記録を続ける →" : "ワークアウトを開始する →"}
              </Button>
            </>
          ) : (
            <Button
              onClick={() => setLocation(`/workout/${latestMenu.id}`)}
              className="glow-orange w-full sm:w-auto font-semibold"
            >
              ワークアウトを開始する →
            </Button>
          )}
        </div>
      )}

      {/* ── 週ナビゲーション ── */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setWeekOffset(w => w - 1)}
          className="flex items-center justify-center w-9 h-9 border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors rounded-sm"
          aria-label="前の週"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-foreground">{monthLabel}</span>
        <button
          type="button"
          onClick={() => setWeekOffset(w => w + 1)}
          className="flex items-center justify-center w-9 h-9 border border-border text-muted-foreground hover:text-primary hover:border-primary/50 transition-colors rounded-sm"
          aria-label="次の週"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* ── 週カレンダー ── */}
      <div className="grid grid-cols-7 gap-1 mb-6">
        {/* 曜日ヘッダー */}
        {DAY_LABELS.map((label, i) => (
          <div key={i} className={`text-center text-xs font-medium py-1.5 ${
            i === 5 ? "text-blue-400/80" : i === 6 ? "text-red-400/80" : "text-muted-foreground"
          }`}>
            {label}
          </div>
        ))}

        {/* 日セル */}
        {weekDates.map((date) => {
          const entry = dateMap.get(date);
          let cellFocus: string | undefined;
          if (entry) {
            cellFocus = days[entry.dayIndex]?.focus;
          } else {
            const d = new Date(date + "T00:00:00");
            const weekLabel = FULL_DAY[d.getDay()];
            const matchPlanDay = days.find((pd: any) => pd.dayLabel === weekLabel);
            if (matchPlanDay && !restDayLabels.includes(weekLabel)) {
              cellFocus = matchPlanDay.focus;
            }
          }
          return (
            <DayCell
              key={date}
              date={date}
              today={today}
              entry={entry}
              focus={cellFocus}
            />
          );
        })}
      </div>

      {/* 凡例 */}
      <div className="flex items-center gap-4 mb-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
          <span>完了</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full border-2 border-primary/60 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-primary/60" />
          </div>
          <span>途中</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full border border-muted-foreground/40" />
          <span>未記録</span>
        </div>
      </div>

      {/* ── 今月の集計 ── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="border border-border bg-card px-4 py-4">
          <p className="text-[11px] text-muted-foreground mb-2 label-futuristic">今月のトレーニング</p>
          <p className="text-3xl font-mono font-black text-primary">
            {monthStats.sessions}
            <span className="text-base font-normal text-muted-foreground ml-1">日</span>
          </p>
        </div>
        <div className="border border-border bg-card px-4 py-4">
          <p className="text-[11px] text-muted-foreground mb-2 label-futuristic">今月の総ボリューム</p>
          <p className="text-3xl font-mono font-black text-primary">
            {monthStats.volume > 0 ? monthStats.volume.toLocaleString() : "—"}
            <span className="text-base font-normal text-muted-foreground ml-1">
              {monthStats.volume > 0 ? "kg" : ""}
            </span>
          </p>
        </div>
      </div>

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
      />
    </div>
  );
}
