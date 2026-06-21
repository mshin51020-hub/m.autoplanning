import { useLocation } from "wouter";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/hooks/usePlan";

interface PremiumGateProps {
  children?: React.ReactNode;
  feature?: string;
}

/**
 * Premium限定機能をラップするゲートコンポーネント。
 * isPremium === false のとき、子要素の代わりにロックUIを表示する。
 * admin は常に通過。
 */
export default function PremiumGate({ children, feature }: PremiumGateProps) {
  const { isPremium, isLoading } = usePlan();
  const [, setLocation] = useLocation();

  if (isLoading) return null;
  if (isPremium) return <>{children}</>;

  return (
    <div className="rounded-xl border border-border bg-card/50 p-6 flex flex-col items-center justify-center gap-4 text-center min-h-[180px]">
      <div className="w-12 h-12 rounded-full border border-primary/30 bg-primary/10 flex items-center justify-center">
        <Lock className="w-5 h-5 text-primary" />
      </div>
      <div>
        <p className="text-sm font-bold text-foreground mb-1">
          {feature ?? "この機能"} は Premium 限定です
        </p>
        <p className="text-xs text-muted-foreground">
          Premium プランにアップグレードすると利用できます
        </p>
      </div>
      <Button
        size="sm"
        onClick={() => setLocation("/pricing")}
        className="gap-1.5"
      >
        <Crown className="w-3.5 h-3.5" />
        プランを見る
      </Button>
    </div>
  );
}
