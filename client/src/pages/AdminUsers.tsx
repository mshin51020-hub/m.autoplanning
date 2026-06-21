import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Users, Search, ChevronRight, User, Dumbbell, Calendar, Clock, ShieldCheck, Mail, LogIn } from "lucide-react";

// ラベル変換ヘルパー
const genderLabel = (v?: string | null) => ({ male: "男性", female: "女性", other: "その他" }[v ?? ""] ?? "未設定");
const expLabel = (v?: string | null) => ({ none: "完全初心者", beginner: "初心者", intermediate: "中級者", advanced: "上級者" }[v ?? ""] ?? "未設定");
const goalLabel = (v?: string | null) => ({ muscle_gain: "筋肥大", fat_loss: "脂肪燃焼", strength: "筋力向上", endurance: "持久力向上", health: "健康維持" }[v ?? ""] ?? "未設定");
const equipLabel = (v?: string | null) => ({ home: "自宅", gym: "ジム", both: "両方" }[v ?? ""] ?? "未設定");
const durationLabel = (v?: string | null) => ({ "1week": "1週間", "1month": "1ヶ月", "3months": "3ヶ月", "6months": "6ヶ月", "12months": "12ヶ月" }[v ?? ""] ?? v ?? "不明");

function formatDate(d?: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ja-JP", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminUsers() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // 管理者以外はリダイレクト
  if (!loading && user?.role !== "admin") {
    navigate("/");
    return null;
  }

  const { data, isLoading } = trpc.admin.getUsers.useQuery(
    { limit: 200 },
    { enabled: !loading && user?.role === "admin" }
  );

  const { data: detail, isLoading: detailLoading } = trpc.admin.getUserDetail.useQuery(
    { userId: selectedUserId! },
    { enabled: selectedUserId !== null }
  );

  const filtered = (data?.users ?? []).filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout>
      <div className="flex h-full min-h-0 overflow-hidden">
        {/* 左ペイン：ユーザー一覧 */}
        <div className="w-80 shrink-0 border-r border-border flex flex-col overflow-hidden">
          {/* ヘッダー */}
          <div className="px-4 py-4 border-b border-border shrink-0">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-5 h-5 text-primary" />
              <h1 className="font-bold text-base tracking-wide">ユーザー管理</h1>
              {data && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {data.total}名
                </Badge>
              )}
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="名前・メールで検索"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>

          {/* ユーザーリスト */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {search ? "該当するユーザーが見つかりません" : "ユーザーがいません"}
              </div>
            ) : (
              <ul>
                {filtered.map((u) => (
                  <li key={u.id}>
                    <button
                      onClick={() => setSelectedUserId(u.id)}
                      className={`w-full text-left px-4 py-3 border-b border-border/50 hover:bg-muted/40 transition-colors flex items-center gap-3 ${selectedUserId === u.id ? "bg-muted/60 border-l-2 border-l-primary" : ""}`}
                    >
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{u.name ?? "名前未設定"}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email ?? "メール未設定"}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {u.role === "admin" && (
                          <Badge variant="destructive" className="text-[10px] px-1 py-0">ADMIN</Badge>
                        )}
                        {u.disclaimerAgreedAt ? (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 text-green-600 border-green-600/40">同意済</Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 text-muted-foreground">未同意</Badge>
                        )}
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* 右ペイン：ユーザー詳細 */}
        <div className="flex-1 overflow-y-auto p-6">
          {selectedUserId === null ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-3">
              <Users className="w-12 h-12 opacity-20" />
              <p className="text-sm">左のリストからユーザーを選択してください</p>
            </div>
          ) : detailLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !detail ? (
            <div className="text-center text-muted-foreground py-12">ユーザーが見つかりません</div>
          ) : (
            <div className="space-y-5 max-w-2xl">
              {/* アカウント情報 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <User className="w-4 h-4" />
                    アカウント情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <InfoRow label="ID" value={String(detail.user.id)} />
                    <InfoRow label="氏名" value={detail.user.name ?? "—"} />
                    <InfoRow
                      label="メールアドレス"
                      value={detail.user.email ?? "—"}
                      icon={<Mail className="w-3 h-3" />}
                    />
                    <InfoRow label="ログイン方法" value={detail.user.loginMethod ?? "—"} />
                    <InfoRow label="ロール" value={
                      detail.user.role === "admin"
                        ? <Badge variant="destructive" className="text-xs">管理者</Badge>
                        : <Badge variant="secondary" className="text-xs">一般ユーザー</Badge>
                    } />
                    <InfoRow
                      label="免責事項同意"
                      value={detail.user.disclaimerAgreedAt
                        ? <span className="flex items-center gap-1 text-green-600"><ShieldCheck className="w-3.5 h-3.5" />{formatDate(detail.user.disclaimerAgreedAt)}</span>
                        : <span className="text-muted-foreground">未同意</span>
                      }
                    />
                    <InfoRow
                      label="登録日時"
                      value={formatDate(detail.user.createdAt)}
                      icon={<Calendar className="w-3 h-3" />}
                    />
                    <InfoRow
                      label="最終ログイン"
                      value={formatDate(detail.user.lastSignedIn)}
                      icon={<LogIn className="w-3 h-3" />}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* プロフィール情報 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Dumbbell className="w-4 h-4" />
                    プロフィール情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {detail.profile ? (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <InfoRow label="身長" value={detail.profile.height ? `${detail.profile.height} cm` : "—"} />
                      <InfoRow label="体重" value={detail.profile.weight ? `${detail.profile.weight} kg` : "—"} />
                      <InfoRow label="年齢" value={detail.profile.age ? `${detail.profile.age} 歳` : "—"} />
                      <InfoRow label="性別" value={genderLabel(detail.profile.gender)} />
                      <InfoRow label="トレーニング歴" value={expLabel(detail.profile.experienceLevel)} />
                      <InfoRow label="目標" value={goalLabel(detail.profile.goal)} />
                      <InfoRow label="週の頻度" value={detail.profile.availableDaysPerWeek ? `週${detail.profile.availableDaysPerWeek}日` : "—"} />
                      <InfoRow label="1日の時間" value={detail.profile.dailyMinutes ? `${detail.profile.dailyMinutes}分` : "—"} />
                      <InfoRow label="使用設備" value={equipLabel(detail.profile.equipmentAccess)} />
                      <InfoRow
                        label="鍛えたい部位"
                        value={
                          Array.isArray(detail.profile.targetMuscles) && detail.profile.targetMuscles.length > 0
                            ? (detail.profile.targetMuscles as string[]).join("・")
                            : "—"
                        }
                      />
                      {detail.profile.notes && (
                        <div className="col-span-2">
                          <InfoRow label="メモ" value={detail.profile.notes} />
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">プロフィール未入力</p>
                  )}
                </CardContent>
              </Card>

              {/* 生成履歴 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    生成履歴
                    <Badge variant="secondary" className="ml-auto text-xs">{detail.menuHistory.length}件</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {detail.menuHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">生成履歴なし</p>
                  ) : (
                    <ul className="space-y-2">
                      {detail.menuHistory.map((menu) => (
                        <li key={menu.id} className="flex items-center gap-3 px-3 py-2 bg-muted/30 border border-border/50 text-sm">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{menu.title ?? "タイトルなし"}</p>
                            <p className="text-xs text-muted-foreground">{durationLabel(menu.planDuration)}</p>
                          </div>
                          <p className="text-xs text-muted-foreground shrink-0">{formatDate(menu.createdAt)}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </span>
      <span className="font-medium text-foreground/90 break-all">{value}</span>
    </div>
  );
}
