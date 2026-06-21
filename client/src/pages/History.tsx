import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { ArrowLeft, Calendar, Loader2, Pencil, Check, X, ClipboardList, Trash2 } from "lucide-react";
import { useState, useRef, useCallback, useMemo } from "react";

function PlanNameEditor({
  id,
  planName,
  fallbackTitle,
}: {
  id: number;
  planName: string | null;
  fallbackTitle: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<string>(planName || fallbackTitle || "トレーニングメニュー");
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const updateMutation = trpc.menu.updatePlanName.useMutation({
    onSuccess: () => {
      utils.menu.history.invalidate();
    },
  });

  const displayName = planName || fallbackTitle || "トレーニングメニュー";

  const startEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setValue(displayName);
      setEditing(true);
      setTimeout(() => inputRef.current?.select(), 0);
    },
    [displayName]
  );

  const save = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      const trimmed = value.trim();
      if (!trimmed) return;
      updateMutation.mutate({ id, planName: trimmed });
      setEditing(false);
    },
    [id, value, updateMutation]
  );

  const cancel = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditing(false);
  }, []);

  if (editing) {
    return (
      <div
        className="flex items-center gap-1 flex-1 min-w-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") cancel();
          }}
          className="h-7 text-sm font-bold py-0 px-2 bg-background border-primary focus-visible:ring-1"
          maxLength={255}
          autoFocus
        />
        <button
          onClick={save}
          disabled={updateMutation.isPending}
          className="shrink-0 p-1 rounded hover:bg-primary/20 text-primary transition-colors"
          aria-label="保存"
        >
          {updateMutation.isPending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={cancel}
          className="shrink-0 p-1 rounded hover:bg-destructive/20 text-muted-foreground transition-colors"
          aria-label="キャンセル"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0 group/name">
      <p className="font-bold text-sm truncate">{displayName}</p>
      <button
        onClick={startEdit}
        className="shrink-0 p-0.5 rounded opacity-70 hover:opacity-100 text-muted-foreground transition-opacity"
        aria-label="プラン名を編集"
      >
        <Pencil className="w-3 h-3" />
      </button>
    </div>
  );
}

function DeleteMenuButton({ id }: { id: number }) {
  const [confirming, setConfirming] = useState(false);
  const utils = trpc.useUtils();

  const deleteMutation = trpc.menu.deleteMenu.useMutation({
    onSuccess: () => {
      utils.menu.history.invalidate();
      utils.workoutLog.getMenuStats.invalidate();
    },
  });

  if (confirming) {
    return (
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs text-destructive whitespace-nowrap">削除しますか？</span>
        <button
          type="button"
          aria-label="削除を確定"
          disabled={deleteMutation.isPending}
          onClick={(e) => { e.stopPropagation(); deleteMutation.mutate({ id }); }}
          className="p-1 rounded text-destructive hover:bg-destructive/20 transition-colors"
        >
          {deleteMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        </button>
        <button
          type="button"
          aria-label="削除をキャンセル"
          onClick={(e) => { e.stopPropagation(); setConfirming(false); }}
          className="p-1 rounded text-muted-foreground hover:bg-secondary/50 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      title="このメニューを削除する"
      onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
      aria-label="メニューを削除"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}

export default function History() {
  const { isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();

  const { data: history, isLoading } = trpc.menu.history.useQuery(
    { limit: 50 },
    { enabled: isAuthenticated }
  );

  const { data: menuStats } = trpc.workoutLog.getMenuStats.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const statsMap = useMemo(() => {
    const m = new Map<number, { completedSets: number; totalSets: number; totalVolume: number }>();
    menuStats?.forEach((s) => m.set(s.menuId, s));
    return m;
  }, [menuStats]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const planTypeLabels: Record<string, string> = {
    weekly: "週間メニュー",
    monthly: "月間トレーニング",
    quarterly: "四半期トレーニング",
    yearly: "年間トレーニング",
  };

  const durationLabels: Record<string, string> = {
    "1week": "1週間",
    "1month": "1ヶ月",
    "3months": "3ヶ月",
    "6months": "6ヶ月",
    "12months": "12ヶ月",
  };

  return (
    <div className="bg-background text-foreground">
      <main className="py-12">
        <div className="container max-w-3xl">
          <div className="mb-10">
            <p className="subtext-brutal text-muted-foreground mb-3">作成履歴</p>
            <h1 className="heading-brutal text-3xl sm:text-4xl mb-4">作成履歴</h1>
            <p className="text-muted-foreground">
              過去に作成したトレーニングを確認できます。プラン名の鉛筆アイコンをクリックして編集できます。
            </p>
          </div>

          {!history || history.length === 0 ? (
            <div className="border border-border p-12 text-center">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">まだ作成履歴がありません</p>
              <Button
                className="btn-press"
                onClick={() => setLocation("/profile")}
              >
                トレーニングを作成する
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => {
                const targetPath = `/plan/${item.id}`;
                const stats = statsMap.get(item.id);
                const pct = stats && stats.totalSets > 0
                  ? Math.round((stats.completedSets / stats.totalSets) * 100)
                  : null;

                return (
                  <Card
                    key={item.id}
                    className="bg-card border-border hover:bg-secondary/30 transition-snappy cursor-pointer"
                    onClick={() => setLocation(targetPath)}
                  >
                    <CardContent className="py-4 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <PlanNameEditor
                          id={item.id}
                          planName={item.planName ?? null}
                          fallbackTitle={item.title ?? null}
                        />
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">
                            {item.planType ? planTypeLabels[item.planType] || item.planType : "メニュー"}
                          </span>
                          {item.planDuration && (
                            <span className="text-xs text-muted-foreground">
                              {durationLabels[item.planDuration] || item.planDuration}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                          </span>
                          {stats && stats.completedSets > 0 && (
                            <span className="text-xs font-mono text-primary border border-primary/30 px-1.5 py-0.5 leading-none">
                              {stats.completedSets}/{stats.totalSets}セット完了
                            </span>
                          )}
                        </div>
                        {pct !== null && pct > 0 && (
                          <div className="mt-2 flex items-center gap-2">
                            <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{pct}%</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          title="ワークアウトを記録する"
                          onClick={(e) => { e.stopPropagation(); setLocation(`/workout/${item.id}`); }}
                          className="flex items-center gap-1 text-xs border border-primary/30 px-2 py-1 text-primary hover:bg-primary/10 transition-snappy"
                        >
                          <ClipboardList className="w-3 h-3" />
                          <span className="hidden sm:inline">記録</span>
                        </button>
                        <DeleteMenuButton id={item.id} />
                        <ArrowLeft className="w-4 h-4 text-muted-foreground rotate-180" />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* 新規生成ボタン */}
          <div className="mt-8">
            <Button
              className="btn-press w-full py-6 font-bold tracking-wide"
              onClick={() => setLocation("/profile")}
            >
              新しいトレーニングを作成する
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
