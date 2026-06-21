import { useRef, useState, useMemo } from "react";
import html2canvas from "html2canvas";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Share2, Instagram, Copy } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { TodayShareCard, StatsShareCard, PRShareCard } from "./ShareCard";

type CardType = "today" | "stats" | "pr";

function todayLabel() {
  const d = new Date();
  const DAY = ["日", "月", "火", "水", "木", "金", "土"];
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join(".") + " " + DAY[d.getDay()];
}

function localDateStr(d: Date) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

type Props = {
  open: boolean;
  onClose: () => void;
  menuTitle?: string;
  workoutLogs?: any[];
};

export default function ShareModal({ open, onClose, menuTitle = "", workoutLogs = [] }: Props) {
  const [cardType, setCardType] = useState<CardType>("today");
  const [capturing, setCapturing] = useState(false);
  const [selectedPR, setSelectedPR] = useState<{ exerciseName: string; maxWeight: number } | null>(null);

  const todayRef = useRef<HTMLDivElement>(null);
  const statsRef  = useRef<HTMLDivElement>(null);
  const prRef     = useRef<HTMLDivElement>(null);

  const rangeStart = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 60);
    return localDateStr(d);
  }, []);
  const rangeEnd = localDateStr(new Date());

  const { data: allLogs, isLoading: logsLoading } = trpc.workoutLog.getByDateRange.useQuery(
    { startDate: rangeStart, endDate: rangeEnd },
    { enabled: open }
  );
  const { data: prs, isLoading: prsLoading } = trpc.workoutLog.personalRecords.useQuery(
    undefined,
    { enabled: open }
  );

  const dataLoading = logsLoading || prsLoading;

  const { streak, monthlySessions, monthlyVolume } = useMemo(() => {
    if (!allLogs) return { streak: 0, monthlySessions: 0, monthlyVolume: 0 };
    const today = localDateStr(new Date());
    const ym = today.slice(0, 7);

    const dateMap = new Map<string, { completedSets: number; volume: number }>();
    allLogs.forEach((log: any) => {
      if (!log.loggedDate) return;
      const e = dateMap.get(log.loggedDate) ?? { completedSets: 0, volume: 0 };
      if (log.completed === 1) {
        e.completedSets++;
        if (log.actualWeight && log.actualReps) e.volume += log.actualWeight * log.actualReps;
      }
      dateMap.set(log.loggedDate, e);
    });

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

    let sessions = 0;
    let volume = 0;
    dateMap.forEach((e, date) => {
      if (date.startsWith(ym) && e.completedSets > 0) {
        sessions++;
        volume += e.volume;
      }
    });

    return { streak: count, monthlySessions: sessions, monthlyVolume: volume };
  }, [allLogs]);

  const todayExercises = useMemo(() => {
    const today = localDateStr(new Date());
    const completed = workoutLogs.filter(
      (l: any) => l.completed === 1 && l.loggedDate === today
    );
    const map = new Map<string, Array<{ weight?: number | null; reps?: number | null }>>();
    completed.forEach((l: any) => {
      if (!map.has(l.exerciseName)) map.set(l.exerciseName, []);
      map.get(l.exerciseName)!.push({ weight: l.actualWeight, reps: l.actualReps });
    });
    return Array.from(map.entries()).map(([name, sets]) => ({ name, sets }));
  }, [workoutLogs]);

  const todayWorkoutLogs = workoutLogs.filter(
    (l: any) => l.loggedDate === localDateStr(new Date())
  );
  const completedSets = todayWorkoutLogs.filter((l: any) => l.completed === 1).length;
  const totalSets = todayWorkoutLogs.length;

  // PR カード: 未選択なら最高重量 PR をデフォルト表示
  const activePR = selectedPR ?? (prs && prs.length > 0 ? prs[0] : null);

  const todayProps = {
    date: todayLabel(),
    streak,
    menuTitle: menuTitle || "トレーニングメニュー",
    exercises: todayExercises,
    completedSets,
    totalSets,
  };
  const statsProps = {
    streak,
    monthlySessions,
    monthlyVolume,
    personalRecords: prs ?? [],
  };
  const prProps = activePR
    ? { exerciseName: activePR.exerciseName, weight: activePR.maxWeight, date: todayLabel() }
    : null;

  // Twitter/X コピーテキスト生成
  function buildTweetText() {
    if (cardType === "today") {
      const pct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
      return `本日のトレーニング完了 💪\n${completedSets}/${totalSets}セット達成（${pct}%）${streak > 0 ? `\n🔥 ${streak}日連続継続中` : ""}\n\n#筋トレ #MAutoPlanning`;
    }
    if (cardType === "stats") {
      return `今月のトレーニング記録 📊\n🔥 ${streak}日連続\n📅 今月${monthlySessions}回\n⚡ ボリューム${monthlyVolume.toLocaleString()}kg\n\n#筋トレ #MAutoPlanning`;
    }
    if (cardType === "pr" && activePR) {
      return `${activePR.exerciseName} で自己ベスト更新！🏆\n${activePR.maxWeight}kg 達成！\n\n#PR達成 #筋トレ #MAutoPlanning`;
    }
    return "";
  }

  async function copyTweetText() {
    const text = buildTweetText();
    try {
      await navigator.clipboard.writeText(text);
      toast.success("X/Twitter テキストをコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  }

  function toBlobAsync(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob returned null"));
      }, "image/png");
    });
  }

  async function capture(): Promise<HTMLCanvasElement | null> {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    const el = cardType === "today" ? todayRef.current
             : cardType === "stats" ? statsRef.current
             : prRef.current;
    if (!el) return null;
    return html2canvas(el, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: "#0b0e1a",
      logging: false,
    });
  }

  async function handleShare() {
    setCapturing(true);
    try {
      const canvas = await capture();
      if (!canvas) return;
      const blob = await toBlobAsync(canvas);
      const file = new File([blob], "my-workout.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "M. AutoPlanning - トレーニング記録" });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "my-workout.png"; a.click();
        URL.revokeObjectURL(url);
        toast.success("画像をダウンロードしました。Instagramのストーリーズから投稿してください。");
      }
    } catch (e: any) {
      if (e?.name !== "AbortError") toast.error("共有に失敗しました");
    } finally {
      setCapturing(false);
    }
  }

  async function handleDownload() {
    setCapturing(true);
    try {
      const canvas = await capture();
      if (!canvas) return;
      const blob = await toBlobAsync(canvas);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "my-workout.png"; a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("保存に失敗しました");
    } finally {
      setCapturing(false);
    }
  }

  const TAB_LABELS: Record<CardType, string> = {
    today: "今日のワークアウト",
    stats: "マイ統計",
    pr:    "PR達成",
  };

  return (
    <>
      {/*
        キャプチャ専用要素（ユーザーには見えない）
        position:fixed; top:0; left:0 → viewport(0,0)に配置 → html2canvas が正確にレンダリング
        z-index:-1 → body背景の裏に隠れて不可視
        ★ left:-9999px 等 viewport外への配置は blank になるため使用禁止
      */}
      {open && (
        <div
          aria-hidden="true"
          style={{ position: "fixed", top: 0, left: 0, width: 405, height: 720, zIndex: -1, pointerEvents: "none" }}
        >
          {cardType === "today" && <TodayShareCard ref={todayRef} {...todayProps} />}
          {cardType === "stats" && <StatsShareCard ref={statsRef} {...statsProps} />}
          {cardType === "pr" && prProps && <PRShareCard ref={prRef} {...prProps} />}
        </div>
      )}

      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-sm p-0 overflow-hidden bg-card border-border">
          <DialogHeader className="px-5 pt-5 pb-3">
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Instagram className="w-4 h-4 text-primary" />
              ストーリーズ用シェアカード
            </DialogTitle>
          </DialogHeader>

          {/* タブ切替 */}
          <div className="flex border-b border-border mx-5 mb-4">
            {(["today", "stats", "pr"] as CardType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCardType(t)}
                className={`flex-1 text-xs py-2 font-medium transition-colors border-b-2 -mb-px ${
                  cardType === t
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {/* PR タブ: PR 選択 */}
          {cardType === "pr" && prs && prs.length > 0 && (
            <div className="mx-5 mb-3">
              <p className="text-[10px] text-muted-foreground mb-1.5">種目を選択</p>
              <div className="flex flex-wrap gap-1.5">
                {prs.map((pr) => (
                  <button
                    key={pr.exerciseName}
                    onClick={() => setSelectedPR(pr)}
                    className={`text-[10px] px-2 py-1 rounded border transition-colors ${
                      activePR?.exerciseName === pr.exerciseName
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    {pr.exerciseName} <span className="font-mono font-bold">{pr.maxWeight}kg</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {cardType === "pr" && (!prs || prs.length === 0) && !dataLoading && (
            <p className="text-center text-xs text-muted-foreground pb-2 px-5">
              記録済みの自己ベストがありません
            </p>
          )}

          {/* プレビュー */}
          <div className="flex justify-center pb-4 px-5">
            <div style={{ width: 251, height: 447, overflow: "hidden", position: "relative", flexShrink: 0 }}>
              <div style={{ transform: "scale(0.62)", transformOrigin: "top left", width: 405, height: 720 }}>
                {cardType === "today" && <TodayShareCard {...todayProps} />}
                {cardType === "stats" && <StatsShareCard {...statsProps} />}
                {cardType === "pr" && prProps && <PRShareCard {...prProps} />}
                {cardType === "pr" && !prProps && (
                  <div style={{ width: 405, height: 720, background: "#0b0e1a", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: 12 }}>
                    PR データなし
                  </div>
                )}
              </div>
            </div>
          </div>

          {dataLoading && (
            <p className="text-center text-[10px] text-muted-foreground pb-2 px-5">
              データを読み込んでいます...
            </p>
          )}

          {/* X/Twitter コピー */}
          <div className="px-5 pb-2">
            <button
              type="button"
              onClick={copyTweetText}
              className="w-full flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground border border-border hover:border-primary/40 rounded py-1.5 transition-colors"
            >
              <span className="font-bold text-[10px]">𝕏</span>
              <Copy className="w-3 h-3" />
              X / Twitter 用テキストをコピー
            </button>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2 px-5 pb-4 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleDownload}
              disabled={capturing || dataLoading || (cardType === "pr" && !prProps)}
            >
              {capturing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span className="ml-1.5">保存</span>
            </Button>
            <Button
              size="sm"
              className="flex-1 glow-orange"
              onClick={handleShare}
              disabled={capturing || dataLoading || (cardType === "pr" && !prProps)}
            >
              {capturing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
              <span className="ml-1.5">シェア</span>
            </Button>
          </div>

          <p className="text-center text-[10px] text-muted-foreground pb-4 px-5">
            モバイル: 共有シートから Instagram を選択 → ストーリーズへ
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
