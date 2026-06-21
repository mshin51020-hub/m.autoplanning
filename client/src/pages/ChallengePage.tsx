import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Trophy, Flame, Dumbbell, BarChart2, CheckCircle2 } from "lucide-react";

type ChallengeType = "streak" | "pr" | "monthly_sessions" | "total_volume";

const TYPE_META: Record<ChallengeType, {
  label: string;
  icon: React.FC<{ className?: string }>;
  unit: string;
  placeholder: string;
  needsExercise?: boolean;
}> = {
  streak:            { label: "連続継続",     icon: Flame,      unit: "日",  placeholder: "30" },
  pr:                { label: "種目PR達成",   icon: Dumbbell,   unit: "kg",  placeholder: "100", needsExercise: true },
  monthly_sessions:  { label: "月間トレーニング回数", icon: BarChart2, unit: "回", placeholder: "20" },
  total_volume:      { label: "総ボリューム", icon: Trophy,     unit: "kg",  placeholder: "50000" },
};

function localToday() {
  const d = new Date();
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
}

function monthEnd() {
  const d = new Date();
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return [last.getFullYear(), String(last.getMonth() + 1).padStart(2, "0"), String(last.getDate()).padStart(2, "0")].join("-");
}

function pct(current: number, target: number) {
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

function fmtValue(type: ChallengeType, value: number) {
  if (type === "total_volume") return value.toLocaleString() + "kg";
  if (type === "pr") return value + "kg";
  if (type === "streak") return value + "日";
  return value + "回";
}

export default function ChallengePage() {
  const { data: challenges = [], isLoading, refetch } = trpc.challenge.list.useQuery();
  const createMut   = trpc.challenge.create.useMutation({ onSuccess: () => { refetch(); setOpen(false); toast.success("チャレンジを作成しました"); } });
  const deleteMut   = trpc.challenge.delete.useMutation({ onSuccess: () => { refetch(); toast.success("チャレンジを削除しました"); } });
  const completeMut = trpc.challenge.complete.useMutation({ onSuccess: () => { refetch(); toast.success("🏆 チャレンジを達成済みにしました！"); } });

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ChallengeType>("streak");
  const [title, setTitle] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [startDate, setStartDate] = useState(localToday);
  const [endDate, setEndDate] = useState(monthEnd);

  function openCreate() {
    setType("streak");
    setTitle("");
    setTargetValue("");
    setExerciseName("");
    setStartDate(localToday());
    setEndDate(monthEnd());
    setOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tv = parseFloat(targetValue);
    if (!title.trim() || isNaN(tv) || tv <= 0) {
      toast.error("タイトルと目標値を入力してください");
      return;
    }
    if (TYPE_META[type].needsExercise && !exerciseName.trim()) {
      toast.error("種目名を入力してください");
      return;
    }
    createMut.mutate({
      type,
      title: title.trim(),
      targetValue: tv,
      exerciseName: TYPE_META[type].needsExercise ? exerciseName.trim() : undefined,
      startDate,
      endDate,
    });
  }

  const active    = challenges.filter((c) => !c.completedAt);
  const completed = challenges.filter((c) => !!c.completedAt);

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-2">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-futuristic text-lg text-primary glow-orange-text">CHALLENGES</h1>
          <p className="text-xs text-muted-foreground mt-0.5">目標を設定して継続力を高めよう</p>
        </div>
        <Button size="sm" className="glow-orange" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          新規チャレンジ
        </Button>
      </div>

      {isLoading && (
        <div className="text-center text-sm text-muted-foreground py-12">読み込み中...</div>
      )}

      {/* アクティブなチャレンジ */}
      {!isLoading && active.length === 0 && completed.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">チャレンジがまだありません</p>
          <Button variant="outline" size="sm" onClick={openCreate}>最初のチャレンジを作成</Button>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          {active.map((c) => {
            const meta = TYPE_META[c.type as ChallengeType];
            const Icon = meta.icon;
            const p = pct(c.currentValue, c.targetValue);
            const isAchieved = c.currentValue >= c.targetValue;

            return (
              <div key={c.id} className={`relative border rounded-lg p-4 transition-colors ${
                isAchieved
                  ? "border-primary/60 bg-primary/5"
                  : "border-border bg-card"
              }`}>
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  {isAchieved ? (
                    <div className="flex items-center gap-1 text-primary text-xs font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      達成！
                    </div>
                  ) : (
                    <button
                      onClick={() => completeMut.mutate({ id: c.id })}
                      disabled={completeMut.isPending}
                      title="達成済みにする"
                      className="text-xs text-muted-foreground hover:text-primary border border-border/60 hover:border-primary/50 px-1.5 py-0.5 transition-colors disabled:opacity-40"
                    >
                      達成済みにする
                    </button>
                  )}
                  <button
                    onClick={() => deleteMut.mutate({ id: c.id })}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-start gap-3 mb-3 pr-28">
                  <div className={`p-2 rounded-lg ${isAchieved ? "bg-primary/15" : "bg-muted/50"}`}>
                    <Icon className={`w-4 h-4 ${isAchieved ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm leading-tight">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {meta.label}
                      {c.exerciseName ? ` — ${c.exerciseName}` : ""}
                      <span className="mx-1.5 opacity-40">|</span>
                      {c.startDate} 〜 {c.endDate}
                    </div>
                  </div>
                </div>

                {/* 進捗バー */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">進捗</span>
                    <span className={`font-mono font-bold ${isAchieved ? "text-primary" : ""}`}>
                      {fmtValue(c.type as ChallengeType, c.currentValue)} / {fmtValue(c.type as ChallengeType, c.targetValue)}
                      <span className="ml-1.5 text-muted-foreground">({p}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${p}%`,
                        background: isAchieved
                          ? "linear-gradient(to right, #f97316, #fb923c)"
                          : "linear-gradient(to right, #f97316aa, #f97316)",
                        boxShadow: isAchieved ? "0 0 8px rgba(249,115,22,0.5)" : "none",
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 達成済み */}
      {completed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground label-futuristic">達成済み</p>
          {completed.map((c) => {
            const meta = TYPE_META[c.type as ChallengeType];
            return (
              <div key={c.id} className="flex items-center gap-3 border border-border/70 rounded-lg px-4 py-3 opacity-80">
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{meta.label} — {fmtValue(c.type as ChallengeType, c.targetValue)}</div>
                </div>
                <button onClick={() => deleteMut.mutate({ id: c.id })} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 作成ダイアログ */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">新規チャレンジ</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* タイプ選択 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">タイプ</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(TYPE_META) as [ChallengeType, typeof TYPE_META[ChallengeType]][]).map(([t, m]) => {
                  const Icon = m.icon;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs transition-colors ${
                        type === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* タイトル */}
            <div className="space-y-1.5">
              <Label htmlFor="ch-title" className="text-xs text-muted-foreground">チャレンジ名</Label>
              <Input
                id="ch-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例: 30日連続トレーニング"
                className="text-sm h-9"
              />
            </div>

            {/* 種目名（PRタイプのみ） */}
            {TYPE_META[type].needsExercise && (
              <div className="space-y-1.5">
                <Label htmlFor="ch-exercise" className="text-xs text-muted-foreground">種目名</Label>
                <Input
                  id="ch-exercise"
                  value={exerciseName}
                  onChange={(e) => setExerciseName(e.target.value)}
                  placeholder="例: ベンチプレス"
                  className="text-sm h-9"
                />
              </div>
            )}

            {/* 目標値 */}
            <div className="space-y-1.5">
              <Label htmlFor="ch-target" className="text-xs text-muted-foreground">
                目標値 ({TYPE_META[type].unit})
              </Label>
              <Input
                id="ch-target"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder={TYPE_META[type].placeholder}
                min={1}
                className="text-sm h-9"
              />
            </div>

            {/* 期間 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ch-start" className="text-xs text-muted-foreground">開始日</Label>
                <Input
                  id="ch-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ch-end" className="text-xs text-muted-foreground">終了日</Label>
                <Input
                  id="ch-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="text-sm h-9"
                />
              </div>
            </div>

            <Button type="submit" className="w-full glow-orange" disabled={createMut.isPending}>
              {createMut.isPending ? "作成中..." : "チャレンジを作成"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
