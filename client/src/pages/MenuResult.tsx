import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useLocation, useParams } from "wouter";
import { ArrowRight, Clock, Loader2, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { AdBanner } from "@/components/AdBanner";
import { AffiliateCard, type AffiliateItem } from "@/components/AffiliateCard";

// アフィリエイト商材リスト
// 「トレーニング結果」ページに表示するおすすめ商品。
// ASP登録後、href を実際のアフィリエイトリンクに差し替えてください。
const AFFILIATE_ITEMS: AffiliateItem[] = [
  {
    title: "プロテインサプリメント（ホエイシープロテイン）",
    description: "トレーニング後の筋肉回復をサポート。各フレーバー展開中。",
    href: "https://www.amazon.co.jp/s?k=%E3%83%97%E3%83%AD%E3%83%86%E3%82%A4%E3%83%B3&tag=XXXXXXXX-22",
    category: "プロテイン",
    cta: "アマゾンで確認",
  },
  {
    title: "トレーニンググローブ（バーベル・ダンベル用）",
    description: "手のピンチを軽減し、ベンチプレス・デッドリフトでのグリップ力を強化。",
    href: "https://www.amazon.co.jp/s?k=%E3%83%88%E3%83%AC%E3%83%BC%E3%83%8B%E3%83%B3%E3%82%B0%E3%82%B0%E3%83%AD%E3%83%BC%E3%83%96&tag=XXXXXXXX-22",
    category: "トレーニンググッズ",
    cta: "アマゾンで確認",
  },
];

export default function MenuResult() {
  const { isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const menuId = parseInt(params.id || "0");

  const { data: menuRecord, isLoading } = trpc.menu.getById.useQuery(
    { id: menuId },
    { enabled: isAuthenticated && menuId > 0 }
  );

  const headerRef = useScrollReveal(undefined, [menuRecord]);
  const daysRef   = useScrollReveal(undefined, [menuRecord]);
  const footerRef = useScrollReveal(undefined, [menuRecord]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (!menuRecord) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">トレーニングが見つかりません</p>
          <Button onClick={() => setLocation("/profile")}>トレーニングを作成する</Button>
        </div>
      </div>
    );
  }

  const menu = menuRecord.menuData as any;

  return (
    <div className="bg-background text-foreground">
      <main className="py-12">
        <div className="container max-w-4xl">

          {/* ── タイトル（リビール） ── */}
          <div ref={headerRef} className="mb-10">
            <div className="flex items-center gap-2 mb-4 reveal">
              <div className="h-px w-8 bg-primary" />
              <p className="label-futuristic text-primary">トレーニング結果</p>
            </div>
            <h1 className="heading-futuristic text-2xl sm:text-3xl md:text-4xl mb-4 reveal reveal-delay-1">
              {menuRecord.title || "週間トレーニングメニュー"}
            </h1>
            {menu.weeklyVolume && (
              <p className="text-muted-foreground reveal reveal-delay-2">
                {menu.weeklyVolume}
              </p>
            )}
          </div>

          {/* ── 日別メニュー（スタガーリビール） ── */}
          <div ref={daysRef} className="space-y-4">
            {menu.days?.map((day: any, dayIndex: number) => {
              const showInfeedAd = dayIndex === 2; // 3日目の後にインフィード広告
              const delayClass = `reveal-delay-${Math.min(dayIndex + 1, 4) as 1 | 2 | 3 | 4}`;
              return (
                <div key={dayIndex}>
                  <div
                    className={`card-futuristic border border-primary/15 card-hover-orange reveal ${delayClass}`}
                  >
                    {/* カードヘッダー */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-primary/10">
                      <div>
                        <span className="font-bold tracking-wide">{day.dayLabel}</span>
                        {day.focus && (
                          <span className="text-muted-foreground font-normal text-sm ml-3">
                            {day.focus}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 text-primary/60" />
                        <span>約{day.estimatedDuration}分</span>
                      </div>
                    </div>

                    {/* 種目テーブル */}
                    <div className="px-6 py-4 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-primary/15">
                            <th className="text-left py-2 pr-4 label-futuristic text-muted-foreground">種目</th>
                            <th className="text-center py-2 px-2 label-futuristic text-muted-foreground">セット</th>
                            <th className="text-center py-2 px-2 label-futuristic text-muted-foreground">レップ</th>
                            <th className="text-center py-2 pl-2 label-futuristic text-muted-foreground">推奨重量</th>
                          </tr>
                        </thead>
                        <tbody>
                          {day.exercises?.map((exercise: any, exIndex: number) => (
                            <tr
                              key={exIndex}
                              className="border-b border-primary/8 last:border-0 hover:bg-primary/5 transition-snappy"
                            >
                              <td className="py-3 pr-4">
                                <span className="font-medium">{exercise.name}</span>
                                <span className="text-xs text-muted-foreground ml-2">
                                  ({exercise.muscleGroup})
                                </span>
                              </td>
                              <td className="text-center py-3 px-2 font-mono">{exercise.sets}</td>
                              <td className="text-center py-3 px-2 font-mono">{exercise.reps}</td>
                              <td className="text-center py-3 pl-2 font-mono text-primary glow-orange-text">
                                {exercise.recommendedWeight ?? "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* ── 3日目の後にインフィード AdSense ── */}
                  {showInfeedAd && (
                    <div className="flex justify-center py-3">
                      <AdBanner
                        size="leaderboard"
                        adSlot="4444444444"
                        label="インフィード"
                        className="hidden sm:flex w-full max-w-[728px]"
                      />
                      <AdBanner
                        size="mobile-banner"
                        adSlot="4444444444"
                        label="インフィード"
                        className="flex sm:hidden w-full max-w-[320px]"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── 休息日の注意 ── */}
          {menu.restDays && menu.restDays.length > 0 && (
            <div className="mt-4 border border-accent/20 bg-accent/5 px-6 py-4">
              <p className="text-sm text-muted-foreground">
                {menu.restDays.join("。")}
              </p>
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
              adSlot="5555555555"
              label="アクション前"
              className="hidden sm:flex w-full max-w-[728px]"
            />
            <AdBanner
              size="mobile-banner"
              adSlot="5555555555"
              label="アクション前"
              className="flex sm:hidden w-full max-w-[320px]"
            />
          </div>

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
                onClick={() => toast.info("モバイルアプリは現在開発中です")}
              >
                詳細
              </Button>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
