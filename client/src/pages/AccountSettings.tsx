import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, User, Lock, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// ── 名前変更フォーム ─────────────────────────────────────────────────────────
function NameSection({ currentName }: { currentName: string }) {
  const [name, setName] = useState(currentName);
  const utils = trpc.useUtils();

  const mutation = trpc.auth.updateName.useMutation({
    onSuccess: () => {
      toast.success("名前を更新しました");
      utils.auth.me.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <User className="w-4 h-4 text-primary" />
          表示名
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            className="flex-1"
          />
          <Button
            onClick={() => mutation.mutate({ name: name.trim() })}
            disabled={mutation.isPending || !name.trim() || name.trim() === currentName}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── パスワード変更フォーム ───────────────────────────────────────────────────
function PasswordSection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mutation = trpc.auth.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("パスワードを変更しました");
      setCurrent(""); setNext(""); setConfirm("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (next.length < 8) { toast.error("新しいパスワードは8文字以上で入力してください"); return; }
    if (next !== confirm) { toast.error("新しいパスワードが一致しません"); return; }
    mutation.mutate({ currentPassword: current, newPassword: next });
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-bold flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />
          パスワード変更
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">現在のパスワード</Label>
            <Input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">新しいパスワード（8文字以上）</Label>
            <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">新しいパスワード（確認）</Label>
            <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
          </div>
          <Button type="submit" disabled={mutation.isPending || !current || !next || !confirm} className="w-full">
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "パスワードを変更する"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

// ── アカウント削除モーダル ───────────────────────────────────────────────────
function DeleteAccountModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [, setLocation] = useLocation();

  const mutation = trpc.auth.deleteAccount.useMutation({
    onSuccess: () => {
      toast.success("アカウントを削除しました");
      setLocation("/");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleClose = () => { setPassword(""); onClose(); };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm bg-card border-destructive/40" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <DialogTitle className="text-base font-bold">アカウントを削除しますか？</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            この操作は取り消せません。アカウント・プロフィール・生成済みメニュー・ワークアウト記録がすべて削除されます。
          </p>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">確認のためパスワードを入力してください</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="パスワード"
              autoComplete="current-password"
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={mutation.isPending}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              disabled={!password || mutation.isPending}
              onClick={() => mutation.mutate({ password })}
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "削除する"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── メインページ ─────────────────────────────────────────────────────────────
export default function AccountSettings() {
  const { user, isAuthenticated, loading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAuthenticated) return null;

  return (
    <div className="bg-background text-foreground">
      <main className="py-12">
        <div className="container max-w-2xl space-y-6">
          <div className="mb-8">
            <p className="subtext-brutal text-muted-foreground mb-3">アカウント</p>
            <h1 className="heading-brutal text-3xl sm:text-4xl mb-2">アカウント設定</h1>
            <p className="text-sm text-muted-foreground">
              ログイン中: <span className="text-foreground font-medium">{user?.email}</span>
            </p>
          </div>

          <NameSection currentName={user?.name ?? ""} />
          <PasswordSection />

          {/* 退会 */}
          <Card className="bg-card border-destructive/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
                <Trash2 className="w-4 h-4" />
                アカウント削除（退会）
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                アカウントを削除すると、プロフィール・生成メニュー・ワークアウト記録を含むすべてのデータが完全に削除されます。この操作は取り消せません。
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setDeleteOpen(true)}
              >
                アカウントを削除する
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <DeleteAccountModal open={deleteOpen} onClose={() => setDeleteOpen(false)} />
    </div>
  );
}
