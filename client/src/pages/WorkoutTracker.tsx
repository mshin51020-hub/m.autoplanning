import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import {
  Loader2, CheckCircle2, Circle, RefreshCw, Trash2,
  ChevronDown, ChevronUp, ArrowLeft, Dumbbell, BarChart3,
  Plus, Minus, AlertTriangle, Share2, Youtube, TrendingUp,
} from "lucide-react";
import ShareModal from "@/components/ShareModal";
import StreakWidget from "@/components/StreakWidget";
import { toast } from "sonner";
import { useConfetti } from "@/hooks/useConfetti";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// ────────────────────────────────────────────────────────────────────────────
// CircularRestTimer：ドラッグ移動・時間調整・コンパクトモード付きインターバルタイマー
// ────────────────────────────────────────────────────────────────────────────
function CircularRestTimer({
  seconds,
  total,
  exerciseName,
  isCompact,
  position,
  onSkip,
  onAdjustDuration,
  onToggleCompact,
  onPositionChange,
}: {
  seconds: number;
  total: number;
  exerciseName?: string;
  isCompact: boolean;
  position: { x: number; y: number } | null;
  onSkip: () => void;
  onAdjustDuration: (delta: number) => void;
  onToggleCompact: () => void;
  onPositionChange: (pos: { x: number; y: number }) => void;
}) {
  const pct = total > 0 ? seconds / total : 0;
  const ringColor = pct > 0.5 ? "#22c55e" : pct > 0.25 ? "#f97316" : "#ef4444";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  const totalLabel = total >= 60
    ? `${Math.floor(total / 60)}:${(total % 60).toString().padStart(2, "0")}`
    : `${total}s`;

  const elemRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const dragStart = useRef({ px: 0, py: 0, ex: 0, ey: 0 });

  const onHandlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    const rect = elemRef.current?.getBoundingClientRect();
    dragStart.current = {
      px: e.clientX, py: e.clientY,
      ex: rect ? rect.left : (position?.x ?? window.innerWidth - 148),
      ey: rect ? rect.top  : (position?.y ?? window.innerHeight - 200),
    };
  };
  const onHandlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const W = isCompact ? 80 : 148;
    const H = isCompact ? 80 : 210;
    const newX = Math.max(0, Math.min(window.innerWidth  - W, dragStart.current.ex + e.clientX - dragStart.current.px));
    const newY = Math.max(0, Math.min(window.innerHeight - H, dragStart.current.ey + e.clientY - dragStart.current.py));
    onPositionChange({ x: newX, y: newY });
  };
  const onHandlePointerUp = () => { isDragging.current = false; };

  const posStyle: React.CSSProperties = position
    ? { left: position.x, top: position.y, right: "auto", bottom: "auto" }
    : { right: 16, bottom: 24 };

  // ── コンパクトモード（小円のみ）
  if (isCompact) {
    const r2 = 28; const c2 = 2 * Math.PI * r2;
    return (
      <div
        ref={elemRef}
        style={{ ...posStyle, position: "fixed", zIndex: 50, width: 72, height: 72, borderRadius: "50%", cursor: "grab", touchAction: "none" }}
        className="bg-background/96 backdrop-blur-sm border border-primary/40 shadow-2xl flex items-center justify-center"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
        onClick={onToggleCompact}
        title="タップして展開"
      >
        <div className="relative w-[60px] h-[60px]">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r={r2} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="4" />
            <circle cx="32" cy="32" r={r2} fill="none" stroke={ringColor} strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={c2}
              strokeDashoffset={c2 * (1 - pct)}
              style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[12px] font-black font-mono" style={{ color: ringColor }}>
              {mins}:{secs.toString().padStart(2, "0")}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── 通常モード
  const r = 34; const circ = 2 * Math.PI * r;
  return (
    <div
      ref={elemRef}
      style={{ ...posStyle, position: "fixed", zIndex: 50, width: 148, borderRadius: 14, touchAction: "none" }}
      className="bg-background/96 backdrop-blur-sm border border-primary/40 shadow-2xl p-3"
    >
      {/* ドラッグハンドル */}
      <div
        className="flex items-center justify-between mb-1.5 cursor-grab active:cursor-grabbing select-none"
        onPointerDown={onHandlePointerDown}
        onPointerMove={onHandlePointerMove}
        onPointerUp={onHandlePointerUp}
      >
        <span className="text-[9px] text-muted-foreground/40 label-futuristic tracking-widest">⠿⠿ ドラッグ</span>
        <button type="button" onClick={onToggleCompact}
          className="text-[9px] text-muted-foreground/50 hover:text-primary transition-colors px-1"
          title="コンパクト表示に切り替え"
        >◻</button>
      </div>

      {exerciseName && (
        <p className="text-[9px] text-muted-foreground/70 label-futuristic text-center mb-1 leading-tight truncate px-1">
          {exerciseName} 完了
        </p>
      )}

      {/* 円形プログレスリング */}
      <div className="relative w-[80px] h-[80px] mx-auto">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
          <circle cx="38" cy="38" r={r} fill="none" stroke={ringColor} strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct)}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[16px] font-black font-mono" style={{ color: ringColor }}>
            {mins}:{secs.toString().padStart(2, "0")}
          </span>
        </div>
      </div>

      {/* インターバル時間調整 */}
      <div className="flex items-center justify-between mt-2.5 gap-1">
        <button type="button" onClick={() => onAdjustDuration(-30)}
          className="flex-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors py-1 border border-border/20 hover:border-primary/30 rounded"
        >−30s</button>
        <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 text-center w-10">{totalLabel}</span>
        <button type="button" onClick={() => onAdjustDuration(+30)}
          className="flex-1 text-[10px] font-mono text-muted-foreground hover:text-primary transition-colors py-1 border border-border/20 hover:border-primary/30 rounded"
        >+30s</button>
      </div>

      <p className="text-[9px] text-center text-muted-foreground/50 mt-1 label-futuristic">インターバル</p>
      <button type="button" onClick={onSkip}
        className="w-full text-[10px] text-muted-foreground hover:text-primary transition-colors mt-1.5 py-1 border border-border/20 hover:border-primary/30 rounded"
      >スキップ</button>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// calcProgressionSuggestion：前回全セット完了なら+2.5kgを提案
// ────────────────────────────────────────────────────────────────────────────
function calcProgressionSuggestion(
  exerciseName: string,
  totalSets: number,
  prevLogMap: Map<string, any>,
): { suggestedWeight: number; prevWeight: number } | null {
  if (totalSets === 0) return null;
  let allCompleted = true;
  let prevWeight: number | null = null;

  for (let i = 0; i < totalSets; i++) {
    const log = prevLogMap.get(`${exerciseName}-${i}`);
    if (!log || log.completed !== 1 || !log.actualWeight) { allCompleted = false; break; }
    if (i === 0) prevWeight = Number(log.actualWeight);
  }
  if (!allCompleted || prevWeight === null) return null;
  return { prevWeight, suggestedWeight: Math.round((prevWeight + 2.5) * 10) / 10 };
}

// ────────────────────────────────────────────────────────────────────────────
// WorkoutLogRow：1セット分の記録行（1タップ完了フロー）
// ────────────────────────────────────────────────────────────────────────────
function WorkoutLogRow({
  menuId, phaseIndex, dayIndex, exerciseName, setIndex,
  plannedReps, plannedWeight,
  log, previousLog,
  onSave, onSetCompleted,
}: {
  menuId: number; phaseIndex: number; dayIndex: number;
  exerciseName: string; setIndex: number;
  plannedReps?: number; plannedWeight?: number;
  log?: { actualReps?: number | null; actualWeight?: number | null; completed?: number | null };
  previousLog?: { actualReps?: number | null; actualWeight?: number | null } | null;
  onSave: () => void;
  onSetCompleted: () => void;
}) {
  const initWeight = (log?.actualWeight ?? previousLog?.actualWeight ?? plannedWeight ?? 0) as number;
  const initReps = (log?.actualReps ?? previousLog?.actualReps ?? plannedReps ?? 0) as number;
  const [weight, setWeight] = useState<number>(initWeight);
  const [reps, setReps] = useState<number>(initReps);
  const isCompleted = (log?.completed ?? 0) === 1;

  const upsert = trpc.workoutLog.upsert.useMutation({
    onSuccess: (_data, variables) => {
      onSave();
      if (variables.completed === 1) onSetCompleted();
    },
    onError: () => toast.error("記録の保存に失敗しました"),
  });

  const handleToggle = () => {
    upsert.mutate({
      menuId, phaseIndex, dayIndex, exerciseName, setIndex,
      plannedReps, plannedWeight,
      actualReps: reps || undefined,
      actualWeight: weight || undefined,
      completed: isCompleted ? 0 : 1,
    });
  };

  // 完了済み：コンパクト表示
  if (isCompleted) {
    return (
      <div className="flex items-center justify-between py-2 px-3 border-b border-primary/20 last:border-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggle}
            disabled={upsert.isPending}
            className="shrink-0 text-primary hover:text-muted-foreground transition-colors"
          >
            {upsert.isPending
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <CheckCircle2 className="w-4 h-4" />}
          </button>
          <span className="text-sm text-muted-foreground line-through">{setIndex + 1}セット目</span>
        </div>
        <span className="text-sm font-mono text-primary font-semibold">
          {log?.actualWeight != null ? `${log.actualWeight}kg × ` : ""}
          {log?.actualReps != null ? `${log.actualReps}回` : "—"}
        </span>
      </div>
    );
  }

  // 未完了：編集UI
  return (
    <div className="py-3 px-3 border-b border-primary/20 last:border-0">
      {/* セット番号 & 参考値 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{setIndex + 1}セット目</span>
        <div className="text-right">
          {(plannedWeight || plannedReps) && (
            <span className="text-xs text-muted-foreground font-mono">
              目標: {plannedWeight ? `${plannedWeight}kg × ` : ""}{plannedReps ? `${plannedReps}回` : ""}
            </span>
          )}
          {previousLog?.actualReps != null && (
            <span className="block text-xs text-primary/70 font-mono">
              前回: {previousLog.actualWeight != null ? `${previousLog.actualWeight}kg × ` : ""}
              {previousLog.actualReps}回
            </span>
          )}
        </div>
      </div>

      {/* 重量・回数 ± ボタン + 完了ボタン */}
      <div className="flex items-center gap-2">
        {/* 重量 */}
        <div className="flex items-center gap-1 bg-primary/8 border border-primary/30 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setWeight(w => Math.max(0, Math.round((w - 2.5) * 10) / 10))}
            className="text-muted-foreground hover:text-primary transition-colors p-0.5"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm font-mono w-14 text-center select-none">{weight}kg</span>
          <button
            type="button"
            onClick={() => setWeight(w => Math.round((w + 2.5) * 10) / 10)}
            className="text-muted-foreground hover:text-primary transition-colors p-0.5"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <span className="text-muted-foreground text-xs">×</span>

        {/* 回数 */}
        <div className="flex items-center gap-1 bg-primary/8 border border-primary/30 px-2 py-1.5">
          <button
            type="button"
            onClick={() => setReps(r => Math.max(0, r - 1))}
            className="text-muted-foreground hover:text-primary transition-colors p-0.5"
          >
            <Minus className="w-4 h-4" />
          </button>
          <span className="text-sm font-mono w-10 text-center select-none">{reps}回</span>
          <button
            type="button"
            onClick={() => setReps(r => r + 1)}
            className="text-muted-foreground hover:text-primary transition-colors p-0.5"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* 完了ボタン */}
        <button
          type="button"
          onClick={handleToggle}
          disabled={upsert.isPending}
          className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 hover:border-primary/60 text-primary text-sm font-medium py-1.5 transition-all disabled:opacity-50"
        >
          {upsert.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <><Circle className="w-3.5 h-3.5" /> 完了</>}
        </button>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 種目入れ替えモーダル（候補一覧から選択方式）
// ────────────────────────────────────────────────────────────────────────────
function ShuffleModal({
  open, onClose,
  menuId, phaseIndex, dayIndex, exerciseName,
  isPending, onConfirm,
}: {
  open: boolean; onClose: () => void;
  menuId: number; phaseIndex: number; dayIndex: number; exerciseName: string;
  isPending: boolean; onConfirm: (targetName: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const { data: candidates = [], isLoading: candidatesLoading } =
    trpc.menu.getCandidateExercises.useQuery(
      { id: menuId, phaseIndex, dayIndex, exerciseName },
      { enabled: open }
    );

  // モーダルを閉じるたびに選択をリセット
  const handleClose = () => { setSelected(null); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">種目を入れ替える</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground mb-3">
          <span className="font-medium text-foreground">{exerciseName}</span> の代わりに行う種目を選んでください。
        </p>

        {candidatesLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            代替候補がありません
          </p>
        ) : (
          <div className="space-y-1.5">
            {candidates.map((c: any) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setSelected(c.name)}
                className={`w-full text-left px-3 py-2.5 border text-sm transition-colors ${
                  selected === c.name
                    ? "border-primary bg-primary/10 text-primary font-semibold"
                    : "border-border hover:border-primary/50 text-foreground"
                }`}
              >
                <span className="font-medium">{c.name}</span>
                {c.compound && (
                  <span className="text-xs text-muted-foreground ml-2">複合種目</span>
                )}
              </button>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={handleClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            size="sm"
            onClick={() => selected && onConfirm(selected)}
            disabled={isPending || !selected}
            className="glow-orange"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "入れ替える"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 種目除外 確認ダイアログ
// ────────────────────────────────────────────────────────────────────────────
function ExcludeConfirmModal({
  open, onClose, exerciseName, onConfirm, isPending,
}: {
  open: boolean; onClose: () => void; exerciseName: string; onConfirm: () => void; isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive" />
            種目を除外しますか？
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{exerciseName}</span> を除外して、今日の他の種目を再生成します。
          除外した種目は今後のメニューに含まれなくなります。
        </p>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isPending}>
            キャンセル
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "除外して再生成"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// メインページ
// ────────────────────────────────────────────────────────────────────────────
export default function WorkoutTracker() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { fireSides } = useConfetti();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const menuId = parseInt(params.id || "0");

  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const initialDaySet = useRef(false);
  const [excludingEx, setExcludingEx] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [excludeTarget, setExcludeTarget] = useState<{
    phaseIndex: number; dayIndex: number; exerciseName: string;
  } | null>(null);
  const [shuffleTarget, setShuffleTarget] = useState<{
    phaseIndex: number; dayIndex: number; exerciseName: string; muscleGroup: string;
  } | null>(null);

  // インターバルタイマー
  const [restSeconds, setRestSeconds] = useState(0);
  const restIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevRestSecondsRef = useRef(0);
  const lastExerciseRef = useRef<string>("");

  // タイマー設定（localStorage に永続化）
  const [restDuration, setRestDuration] = useState<number>(() => {
    try { return Math.max(30, parseInt(localStorage.getItem("m-rest-dur") || "90") || 90); } catch { return 90; }
  });
  const restDurationRef = useRef(restDuration);
  useEffect(() => { restDurationRef.current = restDuration; }, [restDuration]);

  const [timerPos, setTimerPos] = useState<{ x: number; y: number } | null>(() => {
    try { const s = localStorage.getItem("m-timer-pos"); return s ? JSON.parse(s) : null; } catch { return null; }
  });
  const [timerCompact, setTimerCompact] = useState<boolean>(() =>
    localStorage.getItem("m-timer-compact") === "1"
  );

  const startRestTimer = useCallback((exerciseName?: string) => {
    if (exerciseName) lastExerciseRef.current = exerciseName;
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    setRestSeconds(restDurationRef.current);
    restIntervalRef.current = setInterval(() => {
      setRestSeconds(prev => {
        if (prev <= 1) {
          clearInterval(restIntervalRef.current!);
          restIntervalRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const stopRestTimer = useCallback(() => {
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    restIntervalRef.current = null;
    setRestSeconds(0);
  }, []);

  // インターバル時間を増減（設定値 + 残り秒数の両方を更新）
  const adjustDuration = useCallback((delta: number) => {
    setRestDuration(prev => {
      const next = Math.max(30, Math.min(300, prev + delta));
      restDurationRef.current = next;
      localStorage.setItem("m-rest-dur", String(next));
      return next;
    });
    setRestSeconds(prev => prev > 0 ? Math.max(1, prev + delta) : prev);
  }, []);

  const handleTimerPosChange = useCallback((pos: { x: number; y: number }) => {
    setTimerPos(pos);
    localStorage.setItem("m-timer-pos", JSON.stringify(pos));
  }, []);

  const handleToggleCompact = useCallback(() => {
    setTimerCompact(prev => {
      const next = !prev;
      localStorage.setItem("m-timer-compact", next ? "1" : "0");
      return next;
    });
  }, []);

  useEffect(() => () => stopRestTimer(), [stopRestTimer]);

  // タイマー終了時にトースト
  useEffect(() => {
    if (prevRestSecondsRef.current > 0 && restSeconds === 0) {
      toast.success("インターバル終了！次のセットへ");
    }
    prevRestSecondsRef.current = restSeconds;
  }, [restSeconds]);

  const { data: menuRecord, isLoading } = trpc.menu.getById.useQuery(
    { id: menuId },
    { enabled: isAuthenticated && menuId > 0 }
  );

  const { data: workoutLogs, refetch: refetchLogs } = trpc.workoutLog.getByMenu.useQuery(
    { menuId },
    { enabled: isAuthenticated && menuId > 0 }
  );

  const plan = (menuRecord?.menuData as any) ?? null;
  const phases: any[] = plan?.phases ?? [];

  // プランロード後、今日の曜日に対応する日を自動展開
  const FULL_DAY_WT = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"] as const;
  useEffect(() => {
    if (!plan || initialDaySet.current) return;
    const todayLabel = FULL_DAY_WT[new Date().getDay()];
    const phase0Days: any[] = plan?.phases?.[0]?.weeklyMenu?.days ?? [];
    const idx = phase0Days.findIndex((d: any) => d.dayLabel === todayLabel);
    setExpandedDay(idx >= 0 ? `0-${idx}` : "0-0");
    initialDaySet.current = true;
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  // 全種目名（重複除去）
  const allExerciseNames = phases.flatMap((ph: any) =>
    (ph.weeklyMenu?.days ?? []).flatMap((d: any) =>
      (d.exercises ?? []).map((ex: any) => ex.name as string)
    )
  ).filter((name: string, i: number, arr: string[]) => arr.indexOf(name) === i);

  const { data: previousLogs } = trpc.workoutLog.getPreviousLogs.useQuery(
    { exerciseNames: allExerciseNames },
    { enabled: isAuthenticated && allExerciseNames.length > 0 }
  );

  // 前回記録マップ: "exerciseName-setIndex" → log
  const prevLogMap = useCallback(() => {
    const map = new Map<string, any>();
    (previousLogs ?? []).forEach((log: any) => {
      const key = `${log.exerciseName}-${log.setIndex}`;
      if (!map.has(key)) map.set(key, log);
    });
    return map;
  }, [previousLogs])();

  // 今日の記録マップ: "phaseIndex-dayIndex-exerciseName-setIndex" → log
  const logMap = useCallback(() => {
    const map = new Map<string, any>();
    (workoutLogs ?? []).forEach((log: any) => {
      const key = `${log.phaseIndex}-${log.dayIndex}-${log.exerciseName}-${log.setIndex}`;
      map.set(key, log);
    });
    return map;
  }, [workoutLogs])();

  const utils = trpc.useUtils();

  const streakUpdateMutation = trpc.streak.update.useMutation({
    onSuccess: (res) => {
      if (res.newBadges.length > 0) {
        fireSides();
        toast.success(`🏆 新しいバッジを獲得！`, { duration: 4000 });
      }
      utils.streak.get.invalidate();
    },
  });

  const todayDate = (() => {
    const d = new Date();
    const offset = 9 * 60;
    const jst = new Date(d.getTime() + (offset - d.getTimezoneOffset()) * 60000);
    return jst.toISOString().slice(0, 10);
  })();

  const handleSetCompleted = useCallback((exerciseName: string) => {
    streakUpdateMutation.mutate({ date: todayDate });
    startRestTimer(exerciseName);
  }, [todayDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const shuffleMutation = trpc.menu.shuffleExercise.useMutation({
    onSuccess: () => {
      utils.menu.getById.invalidate({ id: menuId });
      toast.success("種目を入れ替えました");
      setShuffleTarget(null);
    },
    onError: () => { toast.error("種目の入れ替えに失敗しました"); setShuffleTarget(null); },
  });

  const excludeMutation = trpc.menu.excludeExercise.useMutation({
    onMutate: ({ phaseIndex, dayIndex, exerciseName }) =>
      setExcludingEx(`${phaseIndex}-${dayIndex}-${exerciseName}`),
    onSuccess: () => {
      utils.menu.getById.invalidate({ id: menuId });
      toast.success("種目を除外して再生成しました");
      setExcludingEx(null);
    },
    onError: () => { toast.error("種目の除外に失敗しました"); setExcludingEx(null); },
  });

  if (authLoading || isLoading) {
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
          <p className="text-muted-foreground">ワークアウト記録にはログインが必要です</p>
          <Button onClick={() => setLocation("/login")}>ログイン / 登録</Button>
        </div>
      </div>
    );
  }

  if (!menuRecord) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-muted-foreground">プランが見つかりません</p>
          <Button onClick={() => setLocation("/history")}>履歴に戻る</Button>
        </div>
      </div>
    );
  }

  // 進捗集計
  const totalSets = (workoutLogs ?? []).length;
  const completedSets = (workoutLogs ?? []).filter((l: any) => l.completed === 1).length;
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
  const totalVolume = (workoutLogs ?? [])
    .filter((l: any) => l.completed === 1 && l.actualWeight && l.actualReps)
    .reduce((sum: number, l: any) => sum + l.actualWeight * l.actualReps, 0);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8">

        {/* ── ヘッダー ── */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => setLocation(`/plan/${menuId}`)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            プランに戻る
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Dumbbell className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold tracking-tight flex-1">
              {menuRecord.planName ?? "ワークアウト記録"}
            </h1>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 text-xs border border-primary/30 px-2.5 py-1.5 text-primary hover:bg-primary/10 transition-colors"
              title="シェアカードを作成"
            >
              <Share2 className="w-3.5 h-3.5" />
              シェア
            </button>
          </div>
          <p className="text-sm text-muted-foreground">
            重量・回数を調整して「完了」をタップ。セット完了後にインターバルタイマーが自動で起動します。
          </p>
        </div>

        {/* ── ストリーク ── */}
        <StreakWidget />

        {/* ── 進捗バー ── */}
        {totalSets > 0 && (
          <div className="mb-6 border border-primary/30 bg-primary/8 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">本日の進捗</span>
              </div>
              <div className="text-right">
                <span className="text-sm font-mono text-primary">{completedSets} / {totalSets} セット完了</span>
                {totalVolume > 0 && (
                  <span className="block text-xs text-muted-foreground font-mono">
                    総ボリューム {totalVolume.toLocaleString()}kg
                  </span>
                )}
              </div>
            </div>
            <div className="w-full h-1.5 bg-primary/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* ── フェーズ一覧 ── */}
        {phases.map((phase: any, phaseIndex: number) => (
          <div key={phaseIndex} className="mb-6">
            {phases.length > 1 && (
              <button
                type="button"
                onClick={() => setExpandedPhase(expandedPhase === phaseIndex ? null : phaseIndex)}
                className="w-full flex items-center justify-between py-2 mb-3 border-b border-primary/20 text-left"
              >
                <span className="label-futuristic text-primary text-sm">
                  {phase.phaseName ?? `フェーズ ${phaseIndex + 1}`}
                </span>
                {expandedPhase === phaseIndex
                  ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
            )}

            {(phases.length === 1 || expandedPhase === phaseIndex) && (
              <div className="space-y-4">
                {(phase.weeklyMenu?.days ?? []).map((day: any, dayIndex: number) => {
                  const dayKey = `${phaseIndex}-${dayIndex}`;
                  const isExpanded = expandedDay === dayKey;
                  const isToday = phaseIndex === 0 && day.dayLabel === FULL_DAY_WT[new Date().getDay()];
                  const isRestDay = (phase.weeklyMenu?.restDays ?? []).includes(day.dayLabel);
                  const dayExercises: any[] = day.exercises ?? [];
                  const daySets = dayExercises.reduce((acc: number, ex: any) => acc + (ex.sets ?? 1), 0);
                  const dayCompleted = dayExercises.reduce((acc: number, ex: any) => {
                    for (let s = 0; s < (ex.sets ?? 1); s++) {
                      if (logMap.get(`${phaseIndex}-${dayIndex}-${ex.name}-${s}`)?.completed === 1) acc++;
                    }
                    return acc;
                  }, 0);
                  const dayDone = daySets > 0 && dayCompleted === daySets;
                  const dayVolume = dayExercises.reduce((sum: number, ex: any) => {
                    for (let s = 0; s < (ex.sets ?? 1); s++) {
                      const l = logMap.get(`${phaseIndex}-${dayIndex}-${ex.name}-${s}`);
                      if (l?.completed === 1 && l?.actualWeight && l?.actualReps) {
                        sum += l.actualWeight * l.actualReps;
                      }
                    }
                    return sum;
                  }, 0);

                  return (
                    <div key={dayIndex} className={`border transition-snappy ${
                      dayDone
                        ? "border-primary/40 bg-primary/3"
                        : isToday
                        ? "border-primary/50 bg-primary/5"
                        : "border-primary/25"
                    }`}>
                      {/* 日ヘッダー */}
                      <button
                        type="button"
                        onClick={() => setExpandedDay(isExpanded ? null : dayKey)}
                        className="w-full flex items-center justify-between px-4 py-3 text-left"
                      >
                        <div className="flex items-center gap-3">
                          {dayDone
                            ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                            : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                          <div>
                            <span className="font-medium text-sm">{day.dayLabel ?? `Day ${dayIndex + 1}`}</span>
                            {isToday && (
                              <span className={`text-[9px] font-mono px-1.5 py-0.5 ml-2 align-middle ${
                                isRestDay
                                  ? "text-muted-foreground border border-muted-foreground/30"
                                  : "text-background bg-primary"
                              }`}>
                                {isRestDay ? "休息日" : "TODAY"}
                              </span>
                            )}
                            {day.focus && (
                              <span className="text-xs text-muted-foreground ml-2">{day.focus}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground">{dayCompleted}/{daySets}</span>
                          {isExpanded
                            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {/* Day完了サマリー */}
                      {dayDone && isExpanded && (
                        <div className="px-4 pb-2 flex items-center gap-3 text-xs font-mono text-primary">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Day 完了！</span>
                          {dayVolume > 0 && <span>総ボリューム {dayVolume.toLocaleString()}kg</span>}
                          <span>{dayCompleted}セット</span>
                        </div>
                      )}

                      {isExpanded && (
                        <div className="border-t border-primary/20">
                          {isRestDay ? (
                            <p className="text-sm text-muted-foreground px-4 py-3">休息日</p>
                          ) : (
                            <div className="divide-y divide-primary/20">
                              {dayExercises.map((exercise: any, exIndex: number) => {
                                const exKey = `${phaseIndex}-${dayIndex}-${exercise.name}`;
                                const isExcluding = excludingEx === exKey;
                                const isShuffling = shuffleMutation.isPending &&
                                  shuffleTarget?.phaseIndex === phaseIndex &&
                                  shuffleTarget?.dayIndex === dayIndex &&
                                  shuffleTarget?.exerciseName === exercise.name;
                                const plannedRepsNum = typeof exercise.reps === "number"
                                  ? exercise.reps : parseInt(exercise.reps);
                                const _pw = exercise.recommendedWeight
                                  ? parseFloat(exercise.recommendedWeight) : undefined;
                                const plannedWeightNum = (_pw !== undefined && !isNaN(_pw)) ? _pw : undefined;

                                const progression = calcProgressionSuggestion(
                                  exercise.name, exercise.sets ?? 1, prevLogMap
                                );

                                return (
                                  <div key={exIndex} className="px-4 py-3">
                                    {/* 種目名・操作ボタン */}
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="font-medium text-sm">{exercise.name}</span>
                                          {progression && (
                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-mono text-green-400 border border-green-400/30 bg-green-400/8 px-1.5 py-0.5 rounded-sm shrink-0">
                                              <TrendingUp className="w-2.5 h-2.5" />
                                              {progression.suggestedWeight}kg 目標
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-xs text-muted-foreground font-mono">
                                          {exercise.sets}セット × {exercise.reps}回
                                          {exercise.recommendedWeight && (
                                            <span className="text-primary ml-1">{exercise.recommendedWeight}</span>
                                          )}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 shrink-0">
                                        {/* フォーム確認：YouTube検索 */}
                                        <a
                                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(exercise.name + ' やり方 フォーム')}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          title="フォームを動画で確認（YouTube）"
                                          className="text-muted-foreground hover:text-red-400 transition-colors p-1"
                                        >
                                          <Youtube className="w-3.5 h-3.5" />
                                        </a>
                                        <button
                                          type="button"
                                          title="別の種目に入れ替える"
                                          disabled={shuffleMutation.isPending || excludeMutation.isPending}
                                          onClick={() => setShuffleTarget({
                                            phaseIndex, dayIndex,
                                            exerciseName: exercise.name,
                                            muscleGroup: exercise.muscleGroup ?? "",
                                          })}
                                          className="text-muted-foreground hover:text-primary transition-colors disabled:opacity-40 p-1"
                                        >
                                          {isShuffling
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <RefreshCw className="w-3.5 h-3.5" />}
                                        </button>
                                        <button
                                          type="button"
                                          title="この種目を除外して再生成"
                                          disabled={shuffleMutation.isPending || excludeMutation.isPending}
                                          onClick={() => setExcludeTarget({ phaseIndex, dayIndex, exerciseName: exercise.name })}
                                          className="text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-40 p-1"
                                        >
                                          {isExcluding
                                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            : <Trash2 className="w-3.5 h-3.5" />}
                                        </button>
                                      </div>
                                    </div>

                                    {/* セット別記録 */}
                                    <div className="border border-primary/25 bg-background/50">
                                      {Array.from({ length: exercise.sets ?? 1 }).map((_, setIdx) => {
                                        const logKey = `${phaseIndex}-${dayIndex}-${exercise.name}-${setIdx}`;
                                        const prevKey = `${exercise.name}-${setIdx}`;
                                        return (
                                          <WorkoutLogRow
                                            key={setIdx}
                                            menuId={menuId}
                                            phaseIndex={phaseIndex}
                                            dayIndex={dayIndex}
                                            exerciseName={exercise.name}
                                            setIndex={setIdx}
                                            plannedReps={isNaN(plannedRepsNum) ? undefined : plannedRepsNum}
                                            plannedWeight={plannedWeightNum}
                                            log={logMap.get(logKey)}
                                            previousLog={prevLogMap.get(prevKey)}
                                            onSave={() => refetchLogs()}
                                            onSetCompleted={() => handleSetCompleted(exercise.name)}
                                          />
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}

        {/* ── フッター ── */}
        <div className="mt-8 pt-6 border-t border-primary/30 flex flex-col sm:flex-row gap-3">
          <Button
            variant="outline"
            onClick={() => setLocation(`/plan/${menuId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            プランに戻る
          </Button>
          <Button variant="outline" onClick={() => setLocation("/history")}>
            履歴一覧
          </Button>
        </div>
      </div>

      {/* ── インターバルタイマー ── */}
      {restSeconds > 0 && (
        <CircularRestTimer
          seconds={restSeconds}
          total={restDuration}
          exerciseName={lastExerciseRef.current || undefined}
          isCompact={timerCompact}
          position={timerPos}
          onSkip={stopRestTimer}
          onAdjustDuration={adjustDuration}
          onToggleCompact={handleToggleCompact}
          onPositionChange={handleTimerPosChange}
        />
      )}

      {/* ── 種目入れ替え確認ダイアログ ── */}
      {excludeTarget && (
        <ExcludeConfirmModal
          open={!!excludeTarget}
          onClose={() => setExcludeTarget(null)}
          exerciseName={excludeTarget.exerciseName}
          isPending={excludeMutation.isPending}
          onConfirm={() => {
            excludeMutation.mutate({
              id: menuId,
              phaseIndex: excludeTarget.phaseIndex,
              dayIndex: excludeTarget.dayIndex,
              exerciseName: excludeTarget.exerciseName,
            });
            setExcludeTarget(null);
          }}
        />
      )}

      {shuffleTarget && (
        <ShuffleModal
          open={!!shuffleTarget}
          onClose={() => setShuffleTarget(null)}
          menuId={menuId}
          phaseIndex={shuffleTarget.phaseIndex}
          dayIndex={shuffleTarget.dayIndex}
          exerciseName={shuffleTarget.exerciseName}
          isPending={shuffleMutation.isPending}
          onConfirm={(targetName) => {
            shuffleMutation.mutate({
              id: menuId,
              phaseIndex: shuffleTarget.phaseIndex,
              dayIndex: shuffleTarget.dayIndex,
              exerciseName: shuffleTarget.exerciseName,
              targetExerciseName: targetName,
            });
          }}
        />
      )}

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        menuTitle={menuRecord.planName ?? menuRecord.title ?? "トレーニングメニュー"}
        workoutLogs={workoutLogs ?? []}
      />
    </div>
  );
}
