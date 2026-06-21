import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Settings2, Search, ChevronDown, ChevronRight, Info } from "lucide-react";

// 部位の選択肢
const MUSCLE_GROUPS = ["胸", "背中", "肩", "二頭筋", "三頭筋", "脚", "腹筋", "臀部", "前腕", "その他"];
const DIFFICULTY_OPTIONS = [
  { value: "none", label: "完全初心者" },
  { value: "beginner", label: "初心者" },
  { value: "intermediate", label: "中級者" },
  { value: "advanced", label: "上級者" },
] as const;
const DIFFICULTY_LABELS: Record<string, string> = { none: "完全初心者", beginner: "初心者", intermediate: "中級者", advanced: "上級者" };
const EQUIPMENT_LABELS: Record<string, string> = { home: "自宅", gym: "ジム", both: "両方" };
const EQUIPMENT_CATEGORY_OPTIONS = [
  { value: "dumbbell", label: "ダンベル" },
  { value: "barbell", label: "バーベル" },
  { value: "machine", label: "マシン" },
  { value: "other", label: "その他" },
] as const;
const EQUIPMENT_CATEGORY_LABELS: Record<string, string> = { dumbbell: "ダンベル", barbell: "バーベル", machine: "マシン", bodyweight: "自重", other: "その他" };

type DifficultyValue = "none" | "beginner" | "intermediate" | "advanced";

type ExerciseRow = {
  id: number;
  exerciseName: string;
  muscleGroup: string;
  femaleBaseWeight: number | null;
  maleBaseWeight: number | null;
  beginnerMultiplier: number;
  intermediateMultiplier: number;
  advancedMultiplier: number;
  maleBeginnerMultiplier: number;
  maleIntermediateMultiplier: number;
  maleAdvancedMultiplier: number;
  weightRatio: number | null;
  isBodyweight: number;
  difficulty: string;
  equipment: string;
  notes: string | null;
};

type EditForm = {
  exerciseName: string;
  muscleGroup: string;
  femaleBaseWeight: string;
  maleBaseWeight: string;
  noneMultiplier: string;
  beginnerMultiplier: string;
  intermediateMultiplier: string;
  advancedMultiplier: string;
  maleNoneMultiplier: string;
  maleBeginnerMultiplier: string;
  maleIntermediateMultiplier: string;
  maleAdvancedMultiplier: string;
  weightRatio: string;
  isBodyweight: boolean;
  difficulty: DifficultyValue[]; // 複数選択
  equipment: string;
  equipmentCategory: string;
  notes: string;
};

const defaultForm: EditForm = {
  exerciseName: "",
  muscleGroup: "胸",
  femaleBaseWeight: "",
  maleBaseWeight: "",
  noneMultiplier: "0.4",
  beginnerMultiplier: "0.6",
  intermediateMultiplier: "1.0",
  advancedMultiplier: "1.3",
  maleNoneMultiplier: "0.4",
  maleBeginnerMultiplier: "0.7",
  maleIntermediateMultiplier: "1.0",
  maleAdvancedMultiplier: "1.4",
  weightRatio: "0.5",
  isBodyweight: false,
  difficulty: ["beginner"],
  equipment: "both",
  equipmentCategory: "other",
  notes: "",
};

/** DBのカンマ区切り文字列 → 配列に変換 */
function parseDifficultyStr(str: string): DifficultyValue[] {
  const valid: DifficultyValue[] = ["beginner", "intermediate", "advanced"];
  const parts = str.split(",").map(s => s.trim()) as DifficultyValue[];
  const filtered = parts.filter(p => valid.includes(p));
  return filtered.length > 0 ? filtered : ["beginner"];
}

/** 難易度配列 → 表示用バッジラベル */
function difficultyBadgeLabel(str: string): string {
  const arr = parseDifficultyStr(str);
  return arr.map(d => DIFFICULTY_LABELS[d] ?? d).join("・");
}

function rowToForm(row: ExerciseRow): EditForm {
  return {
    exerciseName: row.exerciseName,
    muscleGroup: row.muscleGroup,
    femaleBaseWeight: row.femaleBaseWeight != null ? String(row.femaleBaseWeight) : "",
    maleBaseWeight: row.maleBaseWeight != null ? String(row.maleBaseWeight) : "",
    noneMultiplier: String((row as any).noneMultiplier ?? 0.4),
    beginnerMultiplier: String(row.beginnerMultiplier ?? 0.6),
    intermediateMultiplier: String(row.intermediateMultiplier ?? 1.0),
    advancedMultiplier: String(row.advancedMultiplier ?? 1.3),
    maleNoneMultiplier: String((row as any).maleNoneMultiplier ?? 0.4),
    maleBeginnerMultiplier: String(row.maleBeginnerMultiplier ?? 0.7),
    maleIntermediateMultiplier: String(row.maleIntermediateMultiplier ?? 1.0),
    maleAdvancedMultiplier: String(row.maleAdvancedMultiplier ?? 1.4),
    weightRatio: row.weightRatio != null ? String(row.weightRatio) : "",
    isBodyweight: row.isBodyweight === 1,
    difficulty: parseDifficultyStr(row.difficulty ?? "beginner"),
    equipment: row.equipment ?? "both",
    equipmentCategory: (row as any).equipmentCategory ?? "other",
    notes: row.notes ?? "",
  };
}

function pm(val: string, fallback: number): number {
  const n = parseFloat(val);
  if (isNaN(n) || n < 0.1) return fallback;
  return n;
}

export default function AdminExerciseWeights() {
  const { user, loading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const { data: rows = [], isLoading } = trpc.admin.getExerciseWeights.useQuery(undefined, {
    enabled: !loading && user?.role === "admin",
  });

  const { data: goalExercises = [] } = trpc.admin.getGoalExercises.useQuery(undefined, {
    enabled: !loading && user?.role === "admin",
  });

  const [search, setSearch] = useState("");
  const [filterGroup, setFilterGroup] = useState("all");
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<EditForm>(defaultForm);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [goalPoolOpen, setGoalPoolOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    femaleNoneMultiplier: "0.4",
    femaleBeginnerMultiplier: "0.6",
    femaleIntermediateMultiplier: "1.0",
    femaleAdvancedMultiplier: "1.3",
    maleNoneMultiplier: "0.4",
    maleBeginnerMultiplier: "0.7",
    maleIntermediateMultiplier: "1.0",
    maleAdvancedMultiplier: "1.4",
  });

  const upsertMutation = trpc.admin.upsertExerciseWeight.useMutation({
    onSuccess: () => {
      utils.admin.getExerciseWeights.invalidate();
      setEditOpen(false);
      toast.success(editingId ? "種目を更新しました" : "種目を追加しました");
    },
    onError: (e) => toast.error("保存に失敗しました: " + e.message),
  });

  const deleteMutation = trpc.admin.deleteExerciseWeight.useMutation({
    onSuccess: () => {
      utils.admin.getExerciseWeights.invalidate();
      toast.success("種目を削除しました");
    },
    onError: (e) => toast.error("削除に失敗しました: " + e.message),
  });

  const bulkMutation = trpc.admin.applyBulkMultipliers.useMutation({
    onSuccess: (res) => {
      utils.admin.getExerciseWeights.invalidate();
      setBulkOpen(false);
      toast.success(`${res.updatedCount}件の種目に係数を適用しました`);
    },
    onError: (e) => toast.error("一括設定に失敗しました: " + e.message),
  });

  const filtered = useMemo(() => {
    return (rows as ExerciseRow[]).filter((r) => {
      const matchGroup = filterGroup === "all" || r.muscleGroup === filterGroup;
      const matchSearch = !search || r.exerciseName.includes(search);
      return matchGroup && matchSearch;
    });
  }, [rows, filterGroup, search]);

  const groupedRows = useMemo(() => {
    const groups: Record<string, ExerciseRow[]> = {};
    for (const r of filtered) {
      if (!groups[r.muscleGroup]) groups[r.muscleGroup] = [];
      groups[r.muscleGroup].push(r);
    }
    return groups;
  }, [filtered]);

  const openAdd = () => {
    setEditingId(null);
    setForm(defaultForm);
    setEditOpen(true);
  };

  const openEdit = (row: ExerciseRow) => {
    setEditingId(row.id);
    setForm(rowToForm(row));
    setEditOpen(true);
  };

  const toggleDifficulty = (val: DifficultyValue) => {
    setForm((f) => {
      const current = f.difficulty;
      if (current.includes(val)) {
        // 最低1つは選択必須
        if (current.length === 1) return f;
        return { ...f, difficulty: current.filter(d => d !== val) };
      } else {
        return { ...f, difficulty: [...current, val] };
      }
    });
  };

  const handleSave = () => {
    if (!form.exerciseName.trim()) {
      toast.error("種目名を入力してください");
      return;
    }
    if (form.difficulty.length === 0) {
      toast.error("難易度を1つ以上選択してください");
      return;
    }
    upsertMutation.mutate({
      exerciseName: form.exerciseName.trim(),
      muscleGroup: form.muscleGroup,
      femaleBaseWeight: form.isBodyweight ? null : (parseFloat(form.femaleBaseWeight) || null),
      maleBaseWeight: form.isBodyweight ? null : (parseFloat(form.maleBaseWeight) || null),
      noneMultiplier: pm(form.noneMultiplier, 0.4),
      beginnerMultiplier: pm(form.beginnerMultiplier, 0.6),
      intermediateMultiplier: pm(form.intermediateMultiplier, 1.0),
      advancedMultiplier: pm(form.advancedMultiplier, 1.3),
      maleNoneMultiplier: pm(form.maleNoneMultiplier, 0.4),
      maleBeginnerMultiplier: pm(form.maleBeginnerMultiplier, 0.7),
      maleIntermediateMultiplier: pm(form.maleIntermediateMultiplier, 1.0),
      maleAdvancedMultiplier: pm(form.maleAdvancedMultiplier, 1.4),
      weightRatio: form.isBodyweight ? null : (parseFloat(form.weightRatio) || null),
      isBodyweight: form.isBodyweight,
      difficulty: form.difficulty,
      equipment: form.equipment as "home" | "gym" | "both",
      equipmentCategory: form.isBodyweight ? "bodyweight" : (form.equipmentCategory as "dumbbell" | "barbell" | "machine" | "bodyweight" | "other"),
      notes: form.notes || null,
    });
  };

  const handleDelete = (row: ExerciseRow) => {
    if (!confirm(`「${row.exerciseName}」を削除しますか？`)) return;
    deleteMutation.mutate({ id: row.id });
  };

  const handleBulkSave = () => {
    bulkMutation.mutate({
      femaleNoneMultiplier: pm(bulkForm.femaleNoneMultiplier, 0.4),
      femaleBeginnerMultiplier: pm(bulkForm.femaleBeginnerMultiplier, 0.6),
      femaleIntermediateMultiplier: pm(bulkForm.femaleIntermediateMultiplier, 1.0),
      femaleAdvancedMultiplier: pm(bulkForm.femaleAdvancedMultiplier, 1.3),
      maleNoneMultiplier: pm(bulkForm.maleNoneMultiplier, 0.4),
      maleBeginnerMultiplier: pm(bulkForm.maleBeginnerMultiplier, 0.7),
      maleIntermediateMultiplier: pm(bulkForm.maleIntermediateMultiplier, 1.0),
      maleAdvancedMultiplier: pm(bulkForm.maleAdvancedMultiplier, 1.4),
    });
  };

  if (loading || isLoading) {
    return <div className="flex items-center justify-center h-64 text-muted-foreground">読み込み中...</div>;
  }

  if (!user || user.role !== "admin") {
    return <div className="flex items-center justify-center h-64 text-destructive">管理者権限が必要です</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">種目管理</h1>
          <p className="text-sm text-muted-foreground mt-1">種目の追加・編集・削除と推奨重量の設定</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
            <Settings2 className="w-4 h-4 mr-1" />
            係数一括設定
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1" />
            種目を追加
          </Button>
        </div>
      </div>

      {/* 検索・フィルター */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="種目名で検索..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterGroup} onValueChange={setFilterGroup}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">すべての部位</SelectItem>
            {MUSCLE_GROUPS.map((g) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 種目一覧（部位ごとにグループ化） */}
      {Object.keys(groupedRows).length === 0 ? (
        <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
          <p className="text-lg font-medium">種目がありません</p>
          <p className="text-sm mt-1">「種目を追加」ボタンから種目を登録してください</p>
        </div>
      ) : (
        Object.entries(groupedRows).map(([group, items]) => (
          <div key={group}>
            <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">
              {group}（{items.length}件）
            </h2>
            <div className="space-y-1">
              {items.map((row) => (
                <div
                  key={row.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span className="font-medium truncate">{row.exerciseName}</span>
                    <div className="flex gap-1 flex-shrink-0 flex-wrap">
                      {row.isBodyweight === 1 && (
                        <Badge variant="secondary" className="text-xs">自重</Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {difficultyBadgeLabel(row.difficulty ?? "beginner")}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {EQUIPMENT_LABELS[row.equipment] ?? row.equipment}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                    {row.isBodyweight !== 1 && (
                      <span>
                        女{row.femaleBaseWeight != null ? `${row.femaleBaseWeight}kg` : "—"} /
                        男{row.maleBaseWeight != null ? ` ${row.maleBaseWeight}kg` : " —"}
                      </span>
                    )}
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => handleDelete(row)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* 目標別専用種目プール（コード管理・読み取り専用） */}
      <div className="border border-border rounded-lg">
        <button
          type="button"
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/20 transition-colors"
          onClick={() => setGoalPoolOpen((v) => !v)}
        >
          <div className="flex items-center gap-2">
            {goalPoolOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
            <span className="text-sm font-bold">目標別専用種目プール（コード管理）</span>
            <span className="text-xs text-muted-foreground">
              {goalExercises.reduce((sum, g) => sum + g.exercises.length, 0)}種目
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5" />
            読み取り専用
          </div>
        </button>

        {goalPoolOpen && (
          <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
            <p className="text-xs text-muted-foreground">
              fat_loss / endurance / health 目標のユーザーにのみ表示される専用種目です。コードで管理されており、DBへの登録は不要です。重量は自重換算（bodyweight）のため設定不要。
            </p>
            {goalExercises.map((group) => (
              <div key={group.goal}>
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 border-b border-border pb-1">
                  {group.label}（{group.exercises.length}種目）
                </h3>
                <div className="space-y-1">
                  {group.exercises.map((ex) => (
                    <div
                      key={ex.name}
                      className="flex items-center gap-3 px-3 py-2 rounded border border-border/50 bg-muted/20"
                    >
                      <span className="text-sm flex-1 min-w-0 truncate">{ex.name}</span>
                      <div className="flex gap-1 flex-shrink-0 flex-wrap justify-end">
                        <Badge variant="secondary" className="text-xs">自重</Badge>
                        {ex.difficulty.slice(0, 3).map((d) => (
                          <Badge key={d} variant="outline" className="text-xs">{DIFFICULTY_LABELS[d] ?? d}</Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 種目追加・編集ダイアログ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "種目を編集" : "種目を追加"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* 基本情報 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label>種目名 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="例: ベンチプレス"
                  value={form.exerciseName}
                  onChange={(e) => setForm((f) => ({ ...f, exerciseName: e.target.value }))}
                  disabled={!!editingId}
                />
                {editingId && (
                  <p className="text-xs text-muted-foreground">種目名は編集できません（削除して再登録してください）</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>部位</Label>
                <Select value={form.muscleGroup} onValueChange={(v) => setForm((f) => ({ ...f, muscleGroup: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MUSCLE_GROUPS.map((g) => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>必要設備</Label>
                <Select value={form.equipment} onValueChange={(v) => setForm((f) => ({ ...f, equipment: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="home">自宅（ダンベル等）</SelectItem>
                    <SelectItem value="gym">ジム必須</SelectItem>
                    <SelectItem value="both">両方対応</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {!form.isBodyweight && (
                <div className="space-y-1.5">
                  <Label>器具種別</Label>
                  <Select value={form.equipmentCategory} onValueChange={(v) => setForm((f) => ({ ...f, equipmentCategory: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_CATEGORY_OPTIONS.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">推奨重量の丸め計算に使用されます（ダンベル・バーベル・マシンで実在する重量に補正）</p>
                </div>
              )}

              {/* 難易度：複数選択チェックボックス */}
              <div className="col-span-2 space-y-2">
                <Label>
                  難易度
                  <span className="ml-1.5 text-xs text-muted-foreground font-normal">（複数選択可）</span>
                </Label>
                <div className="flex gap-6">
                  {DIFFICULTY_OPTIONS.map(({ value, label }) => (
                    <div key={value} className="flex items-center gap-2">
                      <Checkbox
                        id={`difficulty-${value}`}
                        checked={form.difficulty.includes(value)}
                        onCheckedChange={() => toggleDifficulty(value)}
                      />
                      <label
                        htmlFor={`difficulty-${value}`}
                        className="text-sm font-medium leading-none cursor-pointer select-none"
                      >
                        {label}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  選択した層のユーザーにこの種目が推奨されます。最低1つ選択してください。
                </p>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <Switch
                  checked={form.isBodyweight}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isBodyweight: v }))}
                />
                <Label>自重種目</Label>
              </div>
            </div>

            {/* 基礎重量（自重でない場合のみ） */}
            {!form.isBodyweight && (
              <div className="space-y-3 border border-border rounded-lg p-4">
                <p className="text-sm font-semibold">基礎重量（標準体重での目安）</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">女性基礎重量（55kg標準）kg</Label>
                    <Input
                      type="number" step="0.5" min="0" max="500"
                      placeholder="例: 30"
                      value={form.femaleBaseWeight}
                      onChange={(e) => setForm((f) => ({ ...f, femaleBaseWeight: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">男性基礎重量（64kg標準）kg</Label>
                    <Input
                      type="number" step="0.5" min="0" max="500"
                      placeholder="例: 60"
                      value={form.maleBaseWeight}
                      onChange={(e) => setForm((f) => ({ ...f, maleBaseWeight: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs">体重依存度 weightRatio（0=体重無関係 / 1=完全比例）</Label>
                    <Input
                      type="number" step="0.05" min="0" max="1"
                      placeholder="例: 0.7"
                      value={form.weightRatio}
                      onChange={(e) => setForm((f) => ({ ...f, weightRatio: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* 女性用係数 */}
            <div className="space-y-3 border border-border rounded-lg p-4">
              <p className="text-sm font-semibold">女性用トレーニング歴別係数</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">完全初心者</Label>
                  <Input type="number" step="0.05" min="0.1" max="5"
                    value={form.noneMultiplier}
                    onChange={(e) => setForm((f) => ({ ...f, noneMultiplier: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">初心者</Label>
                  <Input type="number" step="0.05" min="0.1" max="5"
                    value={form.beginnerMultiplier}
                    onChange={(e) => setForm((f) => ({ ...f, beginnerMultiplier: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">中級者</Label>
                  <Input type="number" step="0.05" min="0.1" max="5"
                    value={form.intermediateMultiplier}
                    onChange={(e) => setForm((f) => ({ ...f, intermediateMultiplier: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">上級者</Label>
                  <Input type="number" step="0.05" min="0.1" max="5"
                    value={form.advancedMultiplier}
                    onChange={(e) => setForm((f) => ({ ...f, advancedMultiplier: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* 男性用係数 */}
            <div className="space-y-3 border border-border rounded-lg p-4">
              <p className="text-sm font-semibold">男性用トレーニング歴別係数</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">完全初心者</Label>
                  <Input type="number" step="0.05" min="0.1" max="5"
                    value={form.maleNoneMultiplier}
                    onChange={(e) => setForm((f) => ({ ...f, maleNoneMultiplier: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">初心者</Label>
                  <Input type="number" step="0.05" min="0.1" max="5"
                    value={form.maleBeginnerMultiplier}
                    onChange={(e) => setForm((f) => ({ ...f, maleBeginnerMultiplier: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">中級者</Label>
                  <Input type="number" step="0.05" min="0.1" max="5"
                    value={form.maleIntermediateMultiplier}
                    onChange={(e) => setForm((f) => ({ ...f, maleIntermediateMultiplier: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">上級者</Label>
                  <Input type="number" step="0.05" min="0.1" max="5"
                    value={form.maleAdvancedMultiplier}
                    onChange={(e) => setForm((f) => ({ ...f, maleAdvancedMultiplier: e.target.value }))} />
                </div>
              </div>
            </div>

            {/* メモ */}
            <div className="space-y-1.5">
              <Label>メモ（任意）</Label>
              <Input
                placeholder="フォームの注意点など"
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>キャンセル</Button>
            <Button onClick={handleSave} disabled={upsertMutation.isPending}>
              {upsertMutation.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 係数一括設定ダイアログ */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>係数一括設定</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">登録済みの全種目に同じ係数を一括適用します。</p>

          <div className="space-y-4 py-2">
            <div className="space-y-3 border border-border rounded-lg p-4">
              <p className="text-sm font-semibold">女性用係数</p>
              <div className="grid grid-cols-4 gap-3">
                {(["femaleNoneMultiplier", "femaleBeginnerMultiplier", "femaleIntermediateMultiplier", "femaleAdvancedMultiplier"] as const).map((key, i) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{["完全初心者", "初心者", "中級者", "上級者"][i]}</Label>
                    <Input type="number" step="0.05" min="0.1" max="5"
                      value={bulkForm[key]}
                      onChange={(e) => setBulkForm((f) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-3 border border-border rounded-lg p-4">
              <p className="text-sm font-semibold">男性用係数</p>
              <div className="grid grid-cols-4 gap-3">
                {(["maleNoneMultiplier", "maleBeginnerMultiplier", "maleIntermediateMultiplier", "maleAdvancedMultiplier"] as const).map((key, i) => (
                  <div key={key} className="space-y-1.5">
                    <Label className="text-xs">{["完全初心者", "初心者", "中級者", "上級者"][i]}</Label>
                    <Input type="number" step="0.05" min="0.1" max="5"
                      value={bulkForm[key]}
                      onChange={(e) => setBulkForm((f) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>キャンセル</Button>
            <Button onClick={handleBulkSave} disabled={bulkMutation.isPending}>
              {bulkMutation.isPending ? "適用中..." : "全種目に適用"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
