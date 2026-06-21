import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MailOpen, Mail, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import { Link } from "wouter";

const CATEGORY_LABELS: Record<string, string> = {
  feature: "機能要望",
  bug: "不具合報告",
  other: "その他",
};

const CATEGORY_COLORS: Record<string, "default" | "destructive" | "secondary"> = {
  feature: "default",
  bug: "destructive",
  other: "secondary",
};

export default function AdminContacts() {
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const utils = trpc.useUtils();

  const { data: contacts, isLoading, error, refetch } = trpc.contact.list.useQuery(undefined, {
    enabled: user?.role === "admin",
  });

  const markAsReadMutation = trpc.contact.markAsRead.useMutation({
    onSuccess: () => {
      utils.contact.list.invalidate();
      utils.contact.unreadCount.invalidate();
    },
    onError: () => {
      toast.error("既読にできませんでした");
    },
  });

  if (user?.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-muted-foreground">管理者のみアクセスできます。</p>
        <Link href="/"><Button variant="outline">トップへ戻る</Button></Link>
      </div>
    );
  }

  const unreadCount = contacts?.filter((c) => c.isRead === 0).length ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">お問い合わせ管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {contacts ? `全${contacts.length}件` : ""}
            {unreadCount > 0 && (
              <span className="ml-2 text-orange-500 font-medium">未読 {unreadCount}件</span>
            )}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          更新
        </Button>
      </div>

      <Separator className="mb-6" />

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 text-destructive gap-3">
          <p className="font-medium">データの取得に失敗しました</p>
          <p className="text-xs text-muted-foreground">{error.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>再試行</Button>
        </div>
      ) : !contacts || contacts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <Mail className="w-10 h-10 opacity-30" />
          <p>お問い合わせはまだありません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {contacts.map((contact) => {
            const isExpanded = expandedId === contact.id;
            const isUnread = contact.isRead === 0;

            return (
              <Card
                key={contact.id}
                className={`transition-all duration-200 ${isUnread ? "border-orange-500/40 bg-orange-500/5" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      {isUnread ? (
                        <Mail className="w-4 h-4 text-orange-500 shrink-0" />
                      ) : (
                        <MailOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                      <CardTitle className="text-base font-semibold truncate">
                        {contact.name}
                      </CardTitle>
                      <Badge variant={CATEGORY_COLORS[contact.category]} className="text-xs shrink-0">
                        {CATEGORY_LABELS[contact.category]}
                      </Badge>
                      {isUnread && (
                        <Badge variant="outline" className="text-xs text-orange-500 border-orange-500/50 shrink-0">
                          未読
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {new Date(contact.createdAt).toLocaleString("ja-JP", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => setExpandedId(isExpanded ? null : contact.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pl-6">{contact.email}</p>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="pt-0">
                    <Separator className="mb-3" />
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                      {contact.message}
                    </p>
                    {isUnread && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => markAsReadMutation.mutate({ id: contact.id })}
                          disabled={markAsReadMutation.isPending}
                        >
                          <MailOpen className="w-4 h-4" />
                          既読にする
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
