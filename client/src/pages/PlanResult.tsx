import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useLocation, useParams } from "wouter";
import { ArrowRight, Clock, Loader2, ChevronDown, ChevronUp, AlertTriangle, Smartphone, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { AdBanner } from "@/components/AdBanner";
import { AffiliateCard, type AffiliateItem } from "@/components/AffiliateCard";

// アフィリエイト商材リスト（期間別プランページ用）
// ASP登録後、href を実際のアフィリエイトリンクに差し替えてください。
const AFFILIATE_ITEMS: AffiliateItem[] = [
  {
    title: "トレーニングノート（ワークアウトログ）",
    description: "トレーニングの進捗・重量・セット数を記録して継続力を高める。",
    href: "https://www.amazon.co.jp/s?k=%E3%83%88%E3%83%AC%E3%83%BC%E3%83%8B%E3%83%B3%E3%82%B0%E3%83%8E%E3%83%BC%E3%83%88&tag=XXXXXXXX-22",
    category: "トレーニンググッズ",
  },
  {
    title: "プロテインバー（高タンパク質スナック）",
    description: "トレーニング後のゴールデンタイムに最適。持ち達びやすいスティックタイプ。",
    href: "https://www.amazon.co.jp/s?k=%E3%83%97%E3%83%AD%E3%83%86%E3%82%A4%E3%83%B3%E3%83%90%E3%83%BC&tag=XXXXXXXX-22",
    category: "プロテイン",
  },
];

/** シェアボタンセクション */
function ShareSection({ plan, isGuest, menuId }: { plan: any; isGuest: boolean; menuId: number }) {
  const shareUrl = isGuest
    ? `${window.location.origin}/plan/guest`
    : `${window.location.origin}/plan/${menuId}`;
  const shareText = `${plan?.title ?? 'トレーニングメニュー'}を作成しました！ #筋トレ #MAutoPlanning`;

  const handleTwitter = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=400");
  };

  const handleLine = () => {
    const url = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank", "noopener,noreferrer,width=600,height=600");
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("URLをコピーしました");
    } catch {
      toast.error("コピーに失敗しました");
    }
  };

  const handleNativeShare = async () => {
    try {
      await navigator.share({
        title: plan?.title ?? 'トレーニングメニュー',
        text: shareText,
        url: shareUrl,
      });
    } catch (err: any) {
      // AbortError はユーザーがキャンセルした場合なので無視
      if (err?.name !== "AbortError") {
        toast.error("シェアに失敗しました");
      }
    }
  };

  const canNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  return (
    <div className="mt-10 border border-primary/20 bg-primary/5 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Share2 className="w-4 h-4 text-primary" />
        <p className="label-futuristic text-primary text-xs">このメニューをシェア</p>
      </div>
      <div className="flex flex-wrap gap-3">
        {/* Web Share API（モバイル優先） */}
        {canNativeShare && (
          <Button
            variant="outline"
            size="sm"
            className="btn-press border-primary/40 text-foreground hover:bg-primary/10 gap-2"
            onClick={handleNativeShare}
          >
            <Share2 className="w-4 h-4" />
            シェア
          </Button>
        )}
        {/* Twitter(X) */}
        <Button
          variant="outline"
          size="sm"
          className="btn-press border-primary/40 text-foreground hover:bg-primary/10 gap-2"
          onClick={handleTwitter}
        >
          <span className="font-bold text-sm leading-none">𝕏</span>
          X(Twitter)
        </Button>
        {/* LINE */}
        <Button
          variant="outline"
          size="sm"
          className="btn-press border-primary/40 text-foreground hover:bg-primary/10 gap-2"
          onClick={handleLine}
        >
          <span className="text-sm font-bold leading-none">LINE</span>
        </Button>
        {/* URLコピー */}
        <Button
          variant="outline"
          size="sm"
          className="btn-press border-primary/40 text-foreground hover:bg-primary/10 gap-2"
          onClick={handleCopy}
        >
          <Copy className="w-4 h-4" />
          URLをコピー
        </Button>
      </div>
    </div>
  );
}

/** 免責事項の常時表示バナー */
function DisclaimerBanner() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-yellow-500/30 bg-yellow-500/5 mb-8">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />
          <span className="text-xs font-bold tracking-wide text-yellow-600 dark:text-yellow-400">
            ご利用にあたっての注意事項
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-yellow-500/20">
          <ul className="mt-3 space-y-2">
            {[
              "生成結果はあくまで推奨値であり、確実な成果を保証するものではありません。",
              "トレーニング中に危険を感じた場合は、直ちに中止するか重量を下げて行ってください。",
              "推奨値に基づいたトレーニングにより生じた怪我・損害について、当サイトは一切の責任を負いません。",
              "当サイトのシステムは独自の算出方法で生成されたものであり、科学的根拠に基づくものではありません。",
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
                <span className="text-yellow-500 shrink-0 mt-0.5">▸</span>
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 分割法切り替えコンポーネント（ログインユーザー専用） */
function SplitSwitcher({ menuId }: { menuId: number }) {
  const utils = trpc.useUtils();
  const regen = trpc.menu.regenerateWithSplit.useMutation({
    onSuccess: () => {
      utils.menu.getById.invalidate({ id: menuId });
      toast.success("分割法を切り替えました");
    },
    onError: () => toast.error("切り替えに失敗しました"),
  });
  const options: { label: string; value: "full_body" | "body_part" | "ppl" }[] = [
    { label: "全身法", value: "full_body" },
    { label: "部位分割法", value: "body_part" },
    { label: "PPL法", value: "ppl" },
  ];
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      <span className="label-futuristic text-muted-foreground self-center text-xs">分割法を変更:</span>
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={regen.isPending}
          onClick={() => regen.mutate({ id: menuId, splitPreference: opt.value })}
          className="text-xs border border-primary/30 px-3 py-1 hover:bg-primary/10 transition-snappy disabled:opacity-50"
        >
          {regen.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : opt.label}
        </button>
      ))}
    </div>
  );
}

const REST_WEEK = ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"] as const;
const REST_SHORT = ["月", "火", "水", "木", "金", "土", "日"] as const;

/** 休息日（トレーニング曜日）変更コンポーネント */
function RestDayEditor({ menuId, currentPlan }: { menuId: number; currentPlan: any }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const currentDays: string[] = currentPlan?.phases?.[0]?.weeklyMenu?.days?.map((d: any) => d.dayLabel) ?? [];
  const [selectedDays, setSelectedDays] = useState<string[]>(currentDays);

  const updateRestDays = trpc.menu.updateRestDays.useMutation({
    onSuccess: () => {
      utils.menu.getById.invalidate({ id: menuId });
      toast.success("トレーニング曜日を更新しました");
      setOpen(false);
    },
    onError: () => toast.error("更新に失敗しました"),
  });

  const handleOpen = () => {
    setSelectedDays(currentDays);
    setOpen(true);
  };

  return (
    <div className="w-full mt-2">
      {!open ? (
        <button
          type="button"
          onClick={handleOpen}
          className="text-xs border border-primary/30 px-3 py-1 hover:bg-primary/10 transition-snappy"
        >
          休息日を変更
        </button>
      ) : (
        <div className="p-3 border border-primary/15 bg-card">
          <p className="label-futuristic text-muted-foreground text-xs mb-2">
            トレーニングする曜日を選択（現在: 週{selectedDays.length}日）
          </p>
          <div className="flex gap-1.5 mb-3">
            {REST_WEEK.map((day, i) => {
              const isSelected = selectedDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() =>
                    setSelectedDays(prev =>
                      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
                    )
                  }
                  className={`flex-1 py-2 text-xs font-bold border transition-all
                    ${isSelected
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-foreground border-border hover:border-foreground"
                    }`}
                >
                  {REST_SHORT[i]}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={selectedDays.length === 0 || updateRestDays.isPending}
              onClick={() => updateRestDays.mutate({ id: menuId, trainingDays: selectedDays as typeof REST_WEEK[number][] })}
              className="text-xs border border-primary px-4 py-1.5 font-bold hover:bg-primary/10 transition-snappy disabled:opacity-50"
            >
              {updateRestDays.isPending ? <Loader2 className="w-3 h-3 animate-spin inline" /> : "保存"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-muted-foreground hover:text-foreground px-2"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** 強度バッジ */
function intensityBadge(level: string): { label: string; className: string } {
  const map: Record<string, { label: string; className: string }> = {
    "low":    { label: "低強度",  className: "text-blue-400 border-blue-400/40" },
    "normal": { label: "標準強度", className: "text-foreground border-border" },
    "high":   { label: "高強度",  className: "text-red-400 border-red-400/40" },
  };
  return map[level] ?? { label: level, className: "text-muted-foreground border-border" };
}

export default function PlanResult() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const isGuest = params.id === "guest";
  const menuId = isGuest ? 0 : parseInt(params.id || "0");
  const [expandedPhase, setExpandedPhase] = useState<number | null>(0);

  // ゲスト時はsessionStorageからプランを取得
  const guestPlan = isGuest
    ? (() => { try { return JSON.parse(sessionStorage.getItem("guest_plan") || "null"); } catch { return null; } })()
    : null;

  const { data: menuRecord, isLoading } = trpc.menu.getById.useQuery(
    { id: menuId },
    { enabled: isAuthenticated && menuId > 0 && !isGuest }
  );

  const headerRef  = useScrollReveal(undefined, [menuRecord, guestPlan]);
  const phasesRef  = useScrollReveal(undefined, [menuRecord, guestPlan]);
  const footerRef  = useScrollReveal(undefined, [menuRecord, guestPlan]);

  if (authLoading || (!isGuest && isLoading)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ゲスト時はプランデータを直接使用
  if (isGuest && !guestPlan) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">トレーニングデータが見つかりません</p>
          <Button onClick={() => setLocation("/plan")}>トレーニングを作成する</Button>
        </div>
      </div>
    );
  }

  if (!isGuest && !menuRecord) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">トレーニングが見つかりません</p>
          <Button onClick={() => setLocation("/plan")}>トレーニングを作成する</Button>
        </div>
      </div>
    );
  }

  const plan = isGuest ? guestPlan : (menuRecord?.menuData as any);
  const totalPhases: number = plan.phases?.length ?? 1;
  const isMultiPhase = totalPhases > 1;

  return (
    <div className="bg-background text-foreground">
      <main className="py-12">
        <div className="container max-w-4xl">

          {/* 免責バナー */}
          <DisclaimerBanner />

          {/* ── ヘッダー（リビール） ── */}
          <div ref={headerRef} className="mb-10">
            <div className="flex items-center gap-2 mb-4 reveal">
              <div className="h-px w-8 bg-primary" />
              <p className="label-futuristic text-primary">トレーニング結果</p>
            </div>
            <h1 className="heading-futuristic text-2xl sm:text-3xl md:text-4xl mb-4 reveal reveal-delay-1">
              {plan.title}
            </h1>
            <p className="text-muted-foreground leading-relaxed reveal reveal-delay-2">
              {plan.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-3 reveal reveal-delay-3">
              <div className="inline-block border border-primary/25 px-4 py-2">
                <span className="label-futuristic text-muted-foreground">期間: </span>
                <span className="font-bold">{plan.duration}</span>
              </div>
              {plan.phases?.[0]?.weeklyMenu?.splitMethod && (
                <div className="inline-block border border-primary/25 px-4 py-2">
                  <span className="label-futuristic text-muted-foreground">分割法: </span>
                  <span className="font-bold">{plan.phases[0].weeklyMenu.splitMethod}</span>
                </div>
              )}
              {/* 分割法切り替え・休息日変更（ログインユーザーのみ） */}
              {isAuthenticated && !isGuest && menuRecord && (
                <>
                  <SplitSwitcher menuId={menuId} />
                  <RestDayEditor menuId={menuId} currentPlan={plan} />
                </>
              )}
            </div>
          </div>

          {/* ── フェーズ一覧（スタガーリビール） ── */}
          <div ref={phasesRef} className="space-y-4">
            {plan.phases?.map((phase: any, phaseIndex: number) => {
              const badge = intensityBadge(phase.intensityLevel);
              const isExpanded = expandedPhase === phaseIndex;
              const delayClass = `reveal-delay-${Math.min(phaseIndex + 1, 4) as 1 | 2 | 3 | 4}`;

              return (
                <div
                  key={phaseIndex}
                  className={`card-futuristic border border-primary/25 overflow-hidden card-hover-orange reveal ${delayClass}`}
                >
                  {/* フェーズヘッダー（クリックで展開） */}
                  <div
                    className="flex items-center justify-between px-6 py-5 cursor-pointer hover:bg-primary/5 transition-snappy"
                    onClick={() => setExpandedPhase(isExpanded ? null : phaseIndex)}
                  >
                    <div className="flex items-center gap-4">
                      {isMultiPhase && (
                        <span className="heading-futuristic text-2xl text-primary/20 shrink-0">
                          {String(phase.phaseNumber).padStart(2, "0")}
                        </span>
                      )}
                      <div>
                        {isMultiPhase ? (
                          <p className="text-base font-bold tracking-wide">{phase.phaseName}</p>
                        ) : (
                          <p className="text-base font-bold tracking-wide">週間トレーニングメニュー</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-sm text-muted-foreground">{phase.duration}</span>
                          <span className={`text-[11px] font-bold tracking-wider border px-2 py-0.5 label-futuristic ${badge.className}`}>
                            {badge.label}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground shrink-0" />
                    )}
                  </div>

                  {/* フェーズ展開コンテンツ */}
                  {isExpanded && (
                    <div className="border-t border-primary/25 px-6 pt-6 pb-6">
                      <div className="space-y-4">
                        {phase.weeklyMenu?.days?.map((day: any, dayIndex: number) => {
                          const FULL_DAY = ["日曜日","月曜日","火曜日","水曜日","木曜日","金曜日","土曜日"];
                          const isToday = day.dayLabel === FULL_DAY[new Date().getDay()];
                          return (
                          <div key={dayIndex} className={`border p-4 transition-snappy ${isToday ? "border-primary/50 bg-primary/5" : "border-primary/22 hover:border-primary/40"}`}>
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm">
                                  {day.dayLabel}
                                  <span className="text-muted-foreground font-normal ml-2">{day.focus}</span>
                                </span>
                                {isToday && (
                                  <span className="text-[10px] font-bold tracking-widest border border-primary text-primary px-1.5 py-0.5">
                                    TODAY
                                  </span>
                                )}
                                {day.isCircuit && (
                                   <span className="text-[10px] font-bold tracking-widest border border-primary/60 text-primary px-1.5 py-0.5">
                                     サーキット
                                   </span>
                                 )}
                                {day.isHIIT && (
                                   <span className="text-[10px] font-bold tracking-widest border border-red-400/60 text-red-400 px-1.5 py-0.5">
                                     HIIT
                                   </span>
                                 )}
                              </div>
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3 text-primary/60" />
                                <span>約{day.estimatedDuration}分</span>
                              </div>
                            </div>
                            {day.isCircuit && (
                               <p className="text-xs text-muted-foreground mb-3 border-l-2 border-primary/40 pl-2">
                                 サーキット形式：休憩を短くして連続で行います。各種目の間のインターバルは30秒以内を目指してください。
                               </p>
                             )}
                            {day.isHIIT && (
                               <p className="text-xs text-muted-foreground mb-3 border-l-2 border-red-400/60 pl-2">
                                 HIIT形式：各種目のインターバルは60秒以内に抑え、心拍数を高い状態で維持して脂肪燃焼を最大化します。
                               </p>
                             )}
                            <div className="space-y-1">
                              {day.exercises?.map((exercise: any, exIndex: number) => (
                                <div
                                  key={exIndex}
                                  className="flex items-center justify-between text-sm py-1.5 border-b border-primary/20 last:border-0 hover:bg-primary/5 transition-snappy px-1"
                                >
                                  <span>{exercise.name}</span>
                                  <span className="text-muted-foreground font-mono text-xs flex items-center gap-2">
                                    {exercise.sets}セット × {exercise.reps}回
                                    {exercise.recommendedWeight && (
                                      <span className="text-primary font-semibold glow-orange-text">
                                        {exercise.recommendedWeight}
                                      </span>
                                    )}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── 注意事項・アドバイス ── */}
          {plan.progressionNotes && plan.progressionNotes.length > 0 && (
            <div className="mt-6 border border-primary/25 bg-primary/8 px-6 py-5">
              <p className="label-futuristic text-primary mb-4">注意事項・アドバイス</p>
              <ul className="space-y-2">
                {plan.progressionNotes.map((note: string, index: number) => (
                  <li key={index} className="text-sm text-muted-foreground flex gap-2">
                    <span className="text-primary shrink-0">—</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── アフィリエイトカード ── */}
          <AffiliateCard
            items={AFFILIATE_ITEMS}
            title="トレーニングにおすすめ"
            className="mt-8"
          />

          {/* ── アクションボタン前 AdSense バナー ── */}
          <div className="flex justify-center mt-6">
            <AdBanner
              size="leaderboard"
              adSlot="6666666666"
              label="アクション前"
              className="hidden sm:flex w-full max-w-[728px]"
            />
            <AdBanner
              size="mobile-banner"
              adSlot="6666666666"
              label="アクション前"
              className="flex sm:hidden w-full max-w-[320px]"
            />
          </div>

          {/* ── ワークアウト記録バナー（ログインユーザーのみ） ── */}
          {isAuthenticated && !isGuest && menuRecord && (
            <div className="mb-6 border border-primary/30 bg-primary/5 px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-primary mb-0.5">実際のトレーニングを記録しますか？</p>
                <p className="text-xs text-muted-foreground">重量・レップ数・完了チェックはワークアウト記録画面で管理できます。</p>
              </div>
              <a
                href={`/workout/${menuId}`}
                className="shrink-0 inline-flex items-center gap-2 border border-primary bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-snappy"
              >
                記録はこちら
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          )}
          {/* ── シェアボタン（リビール） ── */}
          <ShareSection plan={plan} isGuest={isGuest} menuId={menuId} />

          {/* ── アクション・フッター（リビール） ── */}
          <div ref={footerRef}>
            <div className="flex flex-col sm:flex-row gap-4 mt-10 reveal">
              <Button
                className="btn-press flex-1 glow-orange"
                onClick={() => setLocation("/profile")}
              >
                条件を変えて再作成
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                className="btn-press flex-1 border-primary/40 text-foreground hover:bg-primary/10"
                onClick={() => setLocation("/history")}
              >
                履歴を確認
              </Button>
            </div>

            {/* ゲスト時のログイン促進バナー */}
            {isGuest && (
              <div className="mt-8 border border-primary/30 bg-primary/5 p-6 flex items-center gap-4 card-hover-orange reveal reveal-delay-1">
                <div className="w-8 h-8 text-primary shrink-0 flex items-center justify-center text-2xl">🔓</div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-primary">ログインして履歴を保存しましょう</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    無料登録でトレーニング履歴の保存・確認ができます
                  </p>
                </div>
                <Button
                  size="sm"
                  className="shrink-0 glow-orange"
                  onClick={() => setLocation("/login")}
                >
                  登録・ログイン
                </Button>
              </div>
            )}

            {/* モバイルアプリCTA */}
            <div className="mt-8 border border-accent/20 bg-accent/5 p-6 flex items-center gap-4 card-hover-cyan reveal reveal-delay-1">
              <Smartphone className="w-8 h-8 text-accent shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold">アプリでトレーニングを記録しませんか？</p>
                <p className="text-xs text-muted-foreground mt-1">
                  進捗管理やリマインダー機能でトレーニングを継続できます
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 text-accent hover:bg-accent/10"
                disabled
              >
                近日公開
              </Button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
