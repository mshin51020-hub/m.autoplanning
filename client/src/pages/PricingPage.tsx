import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Check, Zap, Crown, Sparkles, Loader2, Settings, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { usePlan } from "@/hooks/usePlan";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const FREE_FEATURES = [
  "AIメニュー自動生成（月5回）",
  "ワークアウト記録",
  "トレーニング履歴（直近7件）",
  "5つのトレーニング目標",
  "推奨重量の自動計算",
];

const PREMIUM_FEATURES = [
  "AIメニュー自動生成（無制限）",
  "全期間ワークアウト記録",
  "種目別進捗グラフ",
  "連続記録ストリーク + バッジ",
  "1RM 自動計算",
  "体重・体脂肪率の記録と推移",
  "週間ボリューム分析",
  "個人記録（PR）トラッキング",
  "広告非表示",
];

const PREMIUM_PLUS_FEATURES = [
  "Premium 全機能",
  "栄養・カロリー管理",
  "高度なパフォーマンス分析",
  "AI プログレッション提案",
  "優先サポート",
  "新機能ベータアクセス",
];

type BillingInterval = "monthly" | "yearly";

function PlanBadge({ planType }: { planType: string }) {
  if (planType === "free") return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-primary/15 border border-primary/30 text-primary">
      <Crown className="w-2.5 h-2.5" />
      {planType === "premium_plus" ? "Premium+" : "Premium"} 利用中
    </span>
  );
}

export default function PricingPage() {
  const { user } = useAuth();
  const { planType, isPremium, isAdmin, isLoading: planLoading } = usePlan();
  const [, setLocation] = useLocation();
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const utils = trpc.useUtils();

  const createSession = trpc.stripe.createSession.useMutation({
    onError: (e) => toast.error(e.message),
  });

  const activatePlan = trpc.stripe.activatePlan.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.planType === "premium_plus" ? "Premium+" : "Premium"} プランが有効になりました！`);
      utils.plan.myPlan.invalidate();
      window.history.replaceState({}, "", "/pricing");
    },
    onError: (e) => toast.error(e.message),
  });

  const createPortal = trpc.stripe.createPortal.useMutation({
    onSuccess: ({ url }) => { window.location.href = url; },
    onError: (e) => toast.error(e.message),
  });

  const syncStatus = trpc.stripe.syncStatus.useMutation({
    onSuccess: (data) => {
      utils.plan.myPlan.invalidate();
      if (data.synced) {
        if (data.planType === "free") {
          toast.info("サブスクリプションが終了しました。プランが Free に変更されました。");
        } else {
          toast.success("プランの状態を同期しました。");
        }
      }
      window.history.replaceState({}, "", "/pricing");
    },
    onError: () => {},
  });

  // Stripe リダイレクト後の URL パラメータ処理
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get("checkout");
    const sessionId = params.get("session_id");
    const portal = params.get("portal");

    if (checkout === "success" && sessionId) {
      activatePlan.mutate({ sessionId });
    } else if (checkout === "cancelled") {
      toast.info("決済がキャンセルされました。");
      window.history.replaceState({}, "", "/pricing");
    } else if (portal === "return") {
      syncStatus.mutate();
    }
  }, [user]);

  const handleCheckout = (planKey: "premium_monthly" | "premium_yearly" | "premium_plus_monthly" | "premium_plus_yearly") => {
    if (!user) {
      setLocation("/login");
      return;
    }
    createSession.mutate({ planKey }, {
      onSuccess: ({ url }) => { window.location.href = url; },
    });
  };

  const premiumKey     = billingInterval === "monthly" ? "premium_monthly"      : "premium_yearly";
  const premiumPlusKey = billingInterval === "monthly" ? "premium_plus_monthly" : "premium_plus_yearly";
  const isCheckingOut  = createSession.isPending;

  return (
    <div className="min-h-screen bg-background py-12 px-4">

      {/* ── ヘッダー ── */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          AI パーソナルトレーナー
        </div>
        <h1 className="text-3xl font-black tracking-wider text-foreground mb-3">
          あなたに最適なプランを
        </h1>
        <p className="text-sm text-muted-foreground">
          無料から始めて、必要なときにアップグレード。いつでもキャンセル可能です。
        </p>

        {/* 現在のプラン */}
        {user && (
          <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">現在のプラン:</span>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 border border-blue-500/30 text-blue-400">
                <Crown className="w-2.5 h-2.5" />管理者（全機能解放）
              </span>
            ) : (
              <PlanBadge planType={planType} />
            )}
            {!isAdmin && planType === "free" && (
              <span className="text-xs text-muted-foreground">Free</span>
            )}
            {/* Premium ユーザー向け管理ボタン */}
            {isPremium && !isAdmin && (
              <div className="flex gap-2 mt-2 w-full justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs gap-1"
                  onClick={() => createPortal.mutate()}
                  disabled={createPortal.isPending}
                >
                  {createPortal.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Settings className="w-3 h-3" />}
                  プランを管理・解約
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs gap-1 text-muted-foreground"
                  onClick={() => syncStatus.mutate()}
                  disabled={syncStatus.isPending}
                >
                  {syncStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                  状態を同期
                </Button>
              </div>
            )}
          </div>
        )}

        {/* 月払い / 年払い 切り替え */}
        <div className="mt-6 inline-flex items-center gap-1 p-1 rounded-lg border border-border bg-card">
          <button
            type="button"
            onClick={() => setBillingInterval("monthly")}
            className={`px-4 py-1.5 text-sm rounded-md transition-all ${
              billingInterval === "monthly"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            月払い
          </button>
          <button
            type="button"
            onClick={() => setBillingInterval("yearly")}
            className={`px-4 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5 ${
              billingInterval === "yearly"
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            年払い
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1 rounded">34%OFF</span>
          </button>
        </div>
      </div>

      {/* ── プランカード ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">

        {/* Free */}
        <div className={`rounded-2xl border bg-card p-6 flex flex-col ${planType === "free" && !isAdmin ? "border-border/80" : "border-border/40 opacity-80"}`}>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-bold text-foreground">Free</span>
              {planType === "free" && !isAdmin && (
                <span className="ml-auto text-[10px] text-muted-foreground border border-border px-1.5 py-0.5 rounded">現在のプラン</span>
              )}
            </div>
            <div className="text-4xl font-black text-foreground font-mono">¥0</div>
            <div className="text-xs text-muted-foreground mt-1">ずっと無料</div>
          </div>
          <ul className="space-y-2 flex-1">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Check className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Button
            variant="outline"
            className="mt-6 w-full"
            onClick={() => setLocation(user ? "/plan" : "/login")}
          >
            {user ? "プランを作成する" : "無料で始める"}
          </Button>
        </div>

        {/* Premium（推奨） */}
        <div className="rounded-2xl border-2 border-primary bg-card p-6 flex flex-col relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-xl">
            おすすめ
          </div>
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse at top right, rgba(249,115,22,0.07) 0%, transparent 70%)" }}
          />

          <div className="mb-6 relative">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">Premium</span>
              {planType === "premium" && (
                <span className="ml-auto text-[10px] text-primary border border-primary/40 px-1.5 py-0.5 rounded">現在のプラン</span>
              )}
            </div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-black text-foreground font-mono">
                {billingInterval === "monthly" ? "¥480" : "¥3,800"}
              </div>
              <div className="text-sm text-muted-foreground pb-1">/{billingInterval === "monthly" ? "月" : "年"}</div>
            </div>
            {billingInterval === "monthly" && (
              <div className="text-xs text-muted-foreground mt-1">
                または <span className="text-primary font-bold">¥3,800/年</span>
                <span className="ml-1 text-emerald-400 text-[10px]">（34% お得）</span>
              </div>
            )}
          </div>

          <ul className="space-y-2 flex-1 relative">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-6 space-y-2 relative">
            {isPremium && planType === "premium" ? (
              <Button className="w-full" variant="outline" disabled>利用中</Button>
            ) : (
              <>
                <Button
                  className="w-full"
                  onClick={() => handleCheckout(premiumKey as any)}
                  disabled={isCheckingOut || planLoading}
                >
                  {isCheckingOut
                    ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />処理中...</>
                    : "Premium を始める"}
                </Button>
                <p className="text-center text-[10px] text-muted-foreground">いつでもキャンセル可能</p>
              </>
            )}
          </div>
        </div>

        {/* Premium+ */}
        <div className={`rounded-2xl border bg-card p-6 flex flex-col ${planType === "premium_plus" ? "border-yellow-400/40" : "border-border/40"}`}>
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-bold text-foreground">Premium+</span>
              {planType === "premium_plus" && (
                <span className="ml-auto text-[10px] text-yellow-400 border border-yellow-400/40 px-1.5 py-0.5 rounded">現在のプラン</span>
              )}
            </div>
            <div className="flex items-end gap-2">
              <div className="text-4xl font-black text-foreground font-mono">
                {billingInterval === "monthly" ? "¥980" : "¥7,800"}
              </div>
              <div className="text-sm text-muted-foreground pb-1">/{billingInterval === "monthly" ? "月" : "年"}</div>
            </div>
            {billingInterval === "monthly" && (
              <div className="text-xs text-muted-foreground mt-1">
                または <span className="text-yellow-400 font-bold">¥7,800/年</span>
                <span className="ml-1 text-emerald-400 text-[10px]">（34% お得）</span>
              </div>
            )}
          </div>
          <ul className="space-y-2 flex-1">
            {PREMIUM_PLUS_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-foreground">
                <Check className="w-3.5 h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <div className="mt-6">
            {isPremium && planType === "premium_plus" ? (
              <Button className="w-full" variant="outline" disabled>利用中</Button>
            ) : (
              <Button
                variant="outline"
                className="w-full border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                onClick={() => handleCheckout(premiumPlusKey as any)}
                disabled={isCheckingOut || planLoading}
              >
                {isCheckingOut
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />処理中...</>
                  : "Premium+ を始める"}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── FAQ ── */}
      <div className="mt-16 max-w-2xl mx-auto">
        <h2 className="text-lg font-bold text-center text-foreground mb-6">よくある質問</h2>
        <div className="space-y-3">
          {[
            {
              q: "無料プランでどこまで使えますか？",
              a: "月5回のAIメニュー生成と直近7件の履歴が無料で利用できます。まずは無料でお試しください。",
            },
            {
              q: "いつでもキャンセルできますか？",
              a: "はい、いつでもキャンセル可能です。「プランを管理・解約」ボタンから Stripe のポータルにアクセスして解約できます。契約期間終了まではPremium機能を引き続き利用できます。",
            },
            {
              q: "支払い方法は？",
              a: "Visa・Mastercard・JCB・American Express のクレジットカード・デビットカードに対応しています。Stripe の安全な決済システムを使用しています。",
            },
            {
              q: "プランを変更・解約したい場合は？",
              a: "Premium プランご利用中の方は「プランを管理・解約」ボタンから Stripe のポータルへアクセスできます。ポータルでアップグレード・ダウングレード・解約が可能です。",
            },
          ].map((item) => (
            <div key={item.q} className="rounded-xl border border-border bg-card p-4">
              <div className="text-sm font-medium text-foreground mb-1">{item.q}</div>
              <div className="text-xs text-muted-foreground">{item.a}</div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
