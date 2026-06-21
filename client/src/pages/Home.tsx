import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowRight, History, Zap, Shield, BarChart3, ChevronRight, Clock, Dumbbell, Plus, Flame, Trophy, TrendingUp } from "lucide-react";
import { AdBanner } from "@/components/AdBanner";
import { trpc } from "@/lib/trpc";

const NEW_ICON = "/manus-storage/icon-fist-v4-transparent_856cda0b.png";

export default function Home() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, setLocation] = useLocation();

  // スクロールリビール対象コンテナ
  const featureRef = useScrollReveal(undefined, [true]);
  const howtoRef  = useScrollReveal(undefined, [true]);
  const ctaRef    = useScrollReveal(undefined, [true]);

  // 最新メニュー履歴（ログイン済みのみ取得）
  const { data: recentMenus } = trpc.menu.history.useQuery(
    { limit: 3 },
    { enabled: isAuthenticated && !loading }
  );

  // 今日の曜日ラベル（"月曜日" etc）
  const FULL_DAY_LABELS = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
  const todayDayLabel = FULL_DAY_LABELS[new Date().getDay()];

  // 最新プランから今日の曜日に対応するメニューを取得
  const latestMenu = recentMenus?.[0];
  const planData = latestMenu?.menuData as any;
  const planDays: any[] = planData?.phases?.[0]?.weeklyMenu?.days ?? [];
  const planRestDays: string[] = planData?.phases?.[0]?.weeklyMenu?.restDays ?? [];
  const todayPlanDay = planDays.find((d: any) => d.dayLabel === todayDayLabel);
  const isTodayRest = planRestDays.includes(todayDayLabel);

  // ナビバー スクロール連動
  const [scrolled, setScrolled] = useState(false);
  // SEO: ページタイトルとmeta descriptionを動的に設定
  useEffect(() => {
    document.title = "M. AutoPlanning - 無料パーソナルトレーニングメニュー自動作成";
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute("content", "身体情報と目標を入力するだけで、推奨重量・セット数・レップ数まで自動算出。種目の入れ替え・ワークアウト記録・履歴管理まで、トレーニングをまるごとサポートする無料サービスです。");
    }
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="hex-bg min-h-screen bg-background text-foreground">
      {/* ── ナビゲーションバー ── */}
      <header
        className={[
          "sticky top-0 z-50 border-b backdrop-blur supports-[backdrop-filter]:backdrop-blur-md",
          "transition-[background-color,border-color,box-shadow] duration-300 ease-out",
          scrolled
            ? "border-primary/30 bg-background shadow-[0_2px_20px_oklch(0.68_0.20_45/0.08)]"
            : "border-primary/20 bg-background/80",
        ].join(" ")}
      >
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={NEW_ICON} alt="M. AutoPlanning" className="w-8 h-8 object-contain" />
            <span className="heading-futuristic text-sm text-primary glow-orange-text">
              M. AutoPlanning
            </span>
          </div>
          <nav className="flex items-center gap-3">
            <Link href="/about" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              このサービスについて
            </Link>
            <Link href="/contact" className="hidden sm:block text-sm text-muted-foreground hover:text-foreground transition-colors">
              お問い合わせ
            </Link>
            {isAuthenticated ? (
              <Button
                size="sm"
                className="btn-press font-bold tracking-wide glow-orange"
                onClick={() => setLocation("/calendar")}
              >
                今日のトレーニングへ
                <ArrowRight className="ml-1.5 w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="sm"
                className="btn-press font-bold tracking-wide glow-orange"
                onClick={() => setLocation("/login")}
              >
                ログイン / 登録
                <ArrowRight className="ml-1.5 w-4 h-4" />
              </Button>
            )}
          </nav>
        </div>
      </header>

      <main>
        {/* ── ヒーローセクション（スキャンライン付き） ── */}
        <section className="scanline relative min-h-[88vh] flex items-center overflow-hidden">
          {/* 背景装飾 */}
          <div className="absolute inset-0 pointer-events-none" aria-hidden>
            <div className="absolute top-1/3 right-[5%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px]" />
            <div className="absolute bottom-0 left-[10%] w-[300px] h-[300px] rounded-full bg-accent/5 blur-[80px]" />
            <div className="absolute top-0 right-[30%] w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
            <div className="absolute top-0 right-[60%] w-px h-full bg-gradient-to-b from-transparent via-primary/10 to-transparent" />
          </div>

          <div className="container relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* テキスト — スタガーフェードイン */}
              <div>
                <div className="flex items-center gap-2 mb-6 animate-fade-up delay-0">
                  <div className="h-px w-8 bg-primary" />
                  <p className="label-futuristic text-primary glow-orange-text">
                    パーソナルトレーニングメニュー生成
                  </p>
                </div>

                <h1 className="heading-futuristic text-4xl sm:text-5xl md:text-6xl text-foreground mb-6 leading-tight animate-fade-up delay-100">
                  あなたに最速で
                  <br />
                  <span className="text-primary glow-orange-text">トレーニング</span>
                  <br />
                  メニューを作成
                </h1>

                <p className="text-base sm:text-lg text-muted-foreground max-w-xl mb-10 leading-relaxed animate-fade-up delay-200">
                  身体情報と目標を入力するだけで、全身法・部位分割法に基づいたパーソナライズされたメニューを即座に生成。
                  推奨重量まで自動算出し、種目の入れ替えやワークアウト記録にも対応します。
                </p>

                <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-300">
                  {isAuthenticated ? (
                    <Button
                      size="lg"
                      className="btn-press text-base px-8 py-6 font-bold tracking-wide glow-orange"
                      onClick={() => setLocation("/profile")}
                    >
                      <img src={NEW_ICON} alt="" aria-hidden="true" role="presentation" className="w-5 h-5 object-contain mr-2" />
                      トレーニングを作成する
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="btn-press text-base px-8 py-6 font-bold tracking-wide glow-orange"
                      onClick={() => setLocation("/login")}
                    >
                      <img src={NEW_ICON} alt="" aria-hidden="true" role="presentation" className="w-5 h-5 object-contain mr-2" />
                      無料で始める
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  )}
                </div>

                {/* ログイン済み: 今日のトレーニング */}
                {isAuthenticated && latestMenu && (
                  <div className="mt-8 animate-fade-up delay-350">
                    <div className="flex items-center gap-2 mb-3">
                      <Flame className="w-4 h-4 text-primary" />
                      <span className="label-futuristic text-primary text-xs">TODAY — {todayDayLabel}</span>
                    </div>

                    {isTodayRest ? (
                      <div className="rounded-lg border border-primary/15 bg-card/50 px-4 py-3 text-sm text-muted-foreground">
                        今日は休息日です。しっかり回復しましょう。
                      </div>
                    ) : todayPlanDay ? (
                      <div className="rounded-lg border border-primary/40 bg-primary/5 px-4 py-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-bold text-sm">{todayPlanDay.dayLabel}</span>
                            {todayPlanDay.focus && (
                              <span className="text-sm text-muted-foreground ml-2">{todayPlanDay.focus}</span>
                            )}
                          </div>
                          {todayPlanDay.estimatedDuration && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />約{todayPlanDay.estimatedDuration}分
                            </span>
                          )}
                        </div>
                        {(todayPlanDay.exercises as any[])?.length > 0 && (
                          <p className="text-xs text-muted-foreground mb-3">
                            {(todayPlanDay.exercises as any[]).slice(0, 3).map((ex: any) => ex.name).join(" · ")}
                            {(todayPlanDay.exercises as any[]).length > 3
                              ? ` 他${(todayPlanDay.exercises as any[]).length - 3}種目` : ""}
                          </p>
                        )}
                        <button
                          onClick={() => setLocation(`/workout/${latestMenu.id}`)}
                          className="flex items-center gap-1.5 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
                        >
                          ワークアウトを開始する <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-lg border border-primary/15 bg-card/50 px-4 py-3 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">プランを確認して今日のトレーニングを開始しましょう</p>
                        <button
                          onClick={() => setLocation(`/plan/${latestMenu.id}`)}
                          className="text-xs text-primary hover:text-primary/80 ml-3 shrink-0"
                        >
                          プランを見る →
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ログイン済み: 最新メニュークイックアクセス */}
                {isAuthenticated && recentMenus && recentMenus.length > 0 && (
                  <div className="mt-6 animate-fade-up delay-350">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        <span className="label-futuristic">最近のメニュー</span>
                      </div>
                      <button
                        onClick={() => setLocation("/history")}
                        className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                      >
                        すべて見る <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                      {recentMenus.slice(0, 3).map((menu) => (
                        <button
                          key={menu.id}
                          onClick={() => setLocation(`/plan/${menu.id}`)}
                          className="flex items-center justify-between w-full rounded-lg border border-primary/15 bg-card/50 px-4 py-3 hover:border-primary/40 hover:bg-card/80 transition-all text-left group"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Dumbbell className="w-4 h-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {menu.planName || menu.title || "プラン"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(menu.createdAt).toLocaleDateString("ja-JP", { month: "numeric", day: "numeric" })}
                                {menu.planDuration && <span className="ml-2">{menu.planDuration}</span>}
                              </p>
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setLocation("/profile")}
                      className="flex items-center gap-2 mt-2 w-full rounded-lg border border-dashed border-primary/20 px-4 py-2.5 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      新しいメニューを作る
                    </button>
                  </div>
                )}

                <div className="flex gap-8 mt-10 pt-8 border-t border-primary/15 animate-fade-up delay-400">
                  {[
                    { value: "5", label: "トレーニング目標" },
                    { value: "100+", label: "収録種目" },
                    { value: "3", label: "強度レベル" },
                    { value: "4", label: "チャレンジ種別" },
                  ].map((stat) => (
                    <div key={stat.label}>
                      <p className="heading-futuristic text-2xl text-primary glow-orange-text">{stat.value}</p>
                      <p className="label-futuristic text-muted-foreground mt-1">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* アイコン — フローティング */}
              <div className="hidden lg:flex items-center justify-center animate-fade-up delay-200">
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-[60px] scale-110 animate-pulse-glow" />
                  <div className="absolute inset-0 rounded-full border border-primary/20" style={{ transform: "scale(1.05)" }} />
                  <img
                    src={NEW_ICON}
                    alt="M. AutoPlanning"
                    className="relative w-72 h-72 object-contain drop-shadow-[0_0_40px_rgba(255,107,0,0.4)] animate-float"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── ヒーロー直下 AdSense バナー ── */}
        <div className="py-4 border-b border-primary/10 bg-background/60">
          <div className="container flex justify-center">
            {/* PC: leaderboard (728×90) / モバイル: mobile-banner (320×50) */}
            <AdBanner
              size="leaderboard"
              adSlot="1111111111"
              label="ヒーロー直下"
              className="hidden sm:flex w-full max-w-[728px]"
            />
            <AdBanner
              size="mobile-banner"
              adSlot="1111111111"
              label="ヒーロー直下"
              className="flex sm:hidden w-full max-w-[320px]"
            />
          </div>
        </div>

        {/* ── 登録不要・ゲスト案内バナー ── */}
        {!isAuthenticated && (
          <section className="py-10 border-t border-primary/15 bg-primary/5">
            <div className="container">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 rounded-xl border border-primary/20 bg-card/60 px-8 py-6 shadow-sm">
                <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/15 shrink-0">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground text-base">
                      登録不要ですぐに始められます
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      アカウントなしで、あなたに最適なトレーニングメニューを今すぐ作成。無料で全機能をお試しいただけます。
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="btn-press shrink-0 font-bold tracking-wide glow-orange px-8"
                  onClick={() => setLocation("/profile")}
                >
                  無料でメニューを作る
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* ── 機能セクション（スクロールリビール） ── */}
        <section className="py-24 border-t border-primary/15">
          <div className="container">
            {/* セクションヘッダー */}
            <div ref={featureRef}>
              <div className="flex items-center gap-2 mb-4 reveal">
                <div className="h-px w-8 bg-primary" />
                <p className="label-futuristic text-primary">機能</p>
              </div>
              <h2 className="heading-futuristic text-3xl sm:text-4xl mb-16 text-foreground reveal reveal-delay-1">
                機能紹介
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-0">
                {[
                  {
                    icon: "fist",
                    title: "推奨重量まで自動算出",
                    description: "体重・年齢・トレーニング歴・強度レベルをもとに、種目ごとの推奨重量・セット数・レップ数を自動で算出します。",
                    glowClass: "card-hover-orange",
                    iconAccent: "orange",
                    delay: "reveal-delay-1",
                  },
                  {
                    icon: Dumbbell,
                    title: "ワークアウト記録 & タイマー",
                    description: "重量・回数をセットごとに記録。セット完了後はインターバルタイマーが自動起動し、次のセットまでの休憩を管理します。",
                    glowClass: "card-hover-cyan",
                    iconAccent: "cyan",
                    delay: "reveal-delay-2",
                  },
                  {
                    icon: Flame,
                    title: "ストリーク & チャレンジ",
                    description: "連続トレーニング日数をストリークで記録。30日連続・PR達成・月間ボリュームなど自分だけのチャレンジ目標を設定できます。",
                    glowClass: "card-hover-orange",
                    iconAccent: "orange",
                    delay: "reveal-delay-3",
                  },
                  {
                    icon: TrendingUp,
                    title: "進捗グラフ & データ管理",
                    description: "種目ごとの重量推移・週別ボリューム・個人記録（PR）をグラフで可視化。体重・体脂肪の推移も記録できます。",
                    glowClass: "card-hover-cyan",
                    iconAccent: "cyan",
                    delay: "reveal-delay-4",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className={`card-futuristic border border-primary/15 p-8 group ${feature.glowClass} reveal ${feature.delay}`}
                  >
                    <div className="mb-6">
                      {feature.icon === "fist" ? (
                        <img
                          src={NEW_ICON}
                          alt="メニュー自動生成アイコン"
                          className="w-10 h-10 object-contain opacity-80 group-hover:opacity-100 transition-snappy group-hover:drop-shadow-[0_0_8px_rgba(255,107,0,0.7)]"
                        />
                      ) : (
                        <feature.icon
                          className={`w-8 h-8 transition-snappy ${
                            feature.iconAccent === "orange"
                              ? "text-primary group-hover:drop-shadow-[0_0_8px_rgba(255,107,0,0.7)]"
                              : "text-accent group-hover:drop-shadow-[0_0_8px_rgba(0,212,255,0.7)]"
                          }`}
                        />
                      )}
                    </div>
                    <h3 className="text-base font-bold mb-3 tracking-wide">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 使い方セクション（スクロールリビール） ── */}
        <section className="py-24 border-t border-primary/15">
          <div className="container">
            <div ref={howtoRef}>
              <div className="flex items-center gap-2 mb-4 reveal">
                <div className="h-px w-8 bg-primary" />
                <p className="label-futuristic text-primary">使い方</p>
              </div>
              <h2 className="heading-futuristic text-3xl sm:text-4xl mb-16 text-foreground reveal reveal-delay-1">
                使い方
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
                {[
                  {
                    step: "01",
                    title: "情報を入力",
                    description: "身長・体重・年齢・トレーニング歴・強度レベル・鍛えたい部位を入力します。登録不要でゲストとしても利用できます。",
                    icon: BarChart3,
                    delay: "reveal-delay-1",
                  },
                  {
                    step: "02",
                    title: "トレーニングを作成",
                    description: "入力情報をもとに、全身法または部位分割法で種目・セット数・レップ数・推奨重量が即座に生成されます。",
                    icon: Zap,
                    delay: "reveal-delay-2",
                  },
                  {
                    step: "03",
                    title: "トレーニング開始",
                    description: "プランに沿ってトレーニングを実施し、実際の重量・回数をセットごとに記録。種目が合わなければ入れ替えも自由です。",
                    icon: Shield,
                    delay: "reveal-delay-3",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className={`relative border border-primary/15 p-10 card-hover-orange group reveal ${item.delay}`}
                  >
                    <span className="heading-futuristic text-7xl text-primary/10 block mb-6 group-hover:text-primary/20 transition-snappy select-none">
                      {item.step}
                    </span>
                    <item.icon className="w-6 h-6 text-primary mb-4 group-hover:drop-shadow-[0_0_6px_rgba(255,107,0,0.6)] transition-snappy" />
                    <h3 className="text-lg font-bold mb-3 tracking-wide">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
                    {index < 2 && (
                      <div className="hidden md:block absolute top-1/2 -right-px w-px h-8 bg-primary/30 -translate-y-1/2" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA セクション（スクロールリビール） ── */}
        <section className="py-24 border-t border-primary/15">
          <div className="container">
            <div ref={ctaRef}>
              <div className="card-futuristic border border-primary/25 p-10 sm:p-16 text-center relative overflow-hidden reveal">
                <div className="absolute inset-0 pointer-events-none" aria-hidden>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] bg-primary/8 blur-[80px] rounded-full" />
                </div>
                <div className="relative z-10">
                  <img
                    src={NEW_ICON}
                    alt="M. AutoPlanning"
                    className="w-16 h-16 object-contain mx-auto mb-6 drop-shadow-[0_0_20px_rgba(255,107,0,0.5)]"
                  />
                  <h2 className="heading-futuristic text-3xl sm:text-4xl mb-4 text-foreground">
                    今すぐ始めよう
                  </h2>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    無料で登録して、あなただけの最適なトレーニングメニューを作成しましょう。
                  </p>
                  {isAuthenticated ? (
                    <Button
                      size="lg"
                      className="btn-press text-base px-10 py-6 font-bold tracking-wide glow-orange"
                      onClick={() => setLocation("/profile")}
                    >
                      トレーニングを作成する
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  ) : (
                    <Button
                      size="lg"
                      className="btn-press text-base px-10 py-6 font-bold tracking-wide glow-orange"
                      onClick={() => setLocation("/login")}
                    >
                      無料で始める
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── フッター上 AdSense バナー ── */}
        <div className="py-6 border-t border-primary/10">
          <div className="container flex justify-center">
            <AdBanner
              size="leaderboard"
              adSlot="2222222222"
              label="フッター上"
              className="hidden sm:flex w-full max-w-[728px]"
            />
            <AdBanner
              size="mobile-banner"
              adSlot="2222222222"
              label="フッター上"
              className="flex sm:hidden w-full max-w-[320px]"
            />
          </div>
        </div>

        {/* ── モバイル スティッキーフッター広告 ── */}
        {/* スマホ画面下部に固定表示。ページコンテンツと重ならないよう pb-14 をフッターに追加済み */}
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center sm:hidden bg-background/90 backdrop-blur border-t border-primary/20 py-1">
          <AdBanner
            size="mobile-banner"
            adSlot="3333333333"
            label="スティッキー"
            className="w-full max-w-[320px]"
          />
        </div>

        {/* ── フッター ── */}
        <footer className="py-10 pb-16 sm:pb-10 border-t border-primary/15">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={NEW_ICON} alt="M. AutoPlanning" className="w-7 h-7 object-contain" />
              <span className="heading-futuristic text-xs text-primary glow-orange-text">
                M. AutoPlanning
              </span>
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground">
              <span>© {new Date().getFullYear()} Shingo Morikawa</span>
              <Link href="/privacy" className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                プライバシーポリシー
              </Link>
              <Link href="/terms" className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                利用規約
              </Link>
              <Link href="/about" className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                このサービスについて
              </Link>
              <Link href="/contact" className="hover:text-primary transition-colors underline-offset-2 hover:underline">
                お問い合わせ
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
