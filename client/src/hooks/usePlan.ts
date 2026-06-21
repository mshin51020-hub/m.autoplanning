import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export type PlanType = "free" | "premium" | "premium_plus";

export interface PlanInfo {
  planType: PlanType;
  isPremium: boolean;
  isAdmin: boolean;
  monthlyCount: number;
  monthlyLimit: number;
  premiumUntil: Date | null;
  isLoading: boolean;
}

export function usePlan(): PlanInfo {
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = trpc.plan.myPlan.useQuery(undefined, {
    enabled: isAuthenticated,
    staleTime: 60_000,
  });

  return {
    planType:     (data?.planType ?? "free") as PlanType,
    isPremium:    data?.isPremium ?? false,
    isAdmin:      data?.isAdmin   ?? false,
    monthlyCount: data?.monthlyCount ?? 0,
    monthlyLimit: data?.monthlyLimit ?? 5,
    premiumUntil: data?.premiumUntil ? new Date(data.premiumUntil) : null,
    isLoading:    isLoading && isAuthenticated,
  };
}
