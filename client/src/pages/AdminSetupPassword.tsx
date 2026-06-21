/**
 * 管理者専用パスワード初期設定ページ
 * - mshin5.1020@gmail.com のみアクセス可能
 * - passwordHash が未設定の場合に初回パスワードを設定する
 * - 設定後は自動ログインしてダッシュボードへ遷移
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck, ArrowLeft, Lock } from "lucide-react";

const ADMIN_EMAIL = "mshin5.1020@gmail.com";

export default function AdminSetupPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const setupMutation = trpc.auth.adminSetPassword.useMutation({
    onSuccess: () => {
      toast.success("パスワードを設定しました。管理者としてログインしました。");
      navigate("/profile");
    },
    onError: (err) => {
      if (err.message.includes("すでに設定済み")) {
        setErrors({ form: "パスワードはすでに設定済みです。通常のログイン画面からログインしてください。" });
      } else {
        setErrors({ form: err.message });
      }
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (email !== ADMIN_EMAIL) {
      newErrors.email = "このページは管理者専用です";
    }
    if (!password) {
      newErrors.password = "パスワードを入力してください";
    } else if (password.length < 8) {
      newErrors.password = "パスワードは8文字以上で入力してください";
    }
    if (!confirmPassword) {
      newErrors.confirmPassword = "確認用パスワードを入力してください";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "パスワードが一致しません";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setupMutation.mutate({ email, password, confirmPassword });
  };

  const V4_ICON_URL = "/manus-storage/icon-fist-v4-transparent_856cda0b.png";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* 六角形背景 */}
      <div className="hex-bg" />
      <div className="scanline pointer-events-none" />

      {/* ログイン画面へ戻るリンク */}
      <a
        href="/login"
        className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        ログイン画面へ戻る
      </a>

      <div className="w-full max-w-md animate-fade-up">
        {/* ロゴ */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl" />
            <img
              src={V4_ICON_URL}
              alt="M. AutoPlanning"
              className="relative w-16 h-16 object-contain drop-shadow-[0_0_12px_rgba(249,115,22,0.6)]"
            />
          </div>
          <h1 className="font-orbitron text-xl font-bold text-foreground tracking-wider">
            M. <span className="text-orange-500">AutoPlanning</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1 tracking-widest uppercase">
            Admin Setup
          </p>
        </div>

        {/* 管理者専用バッジ */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            管理者専用ページ
          </div>
        </div>

        <Card className="card-futuristic border-orange-500/20">
          <CardHeader className="pb-4">
            <CardTitle className="font-orbitron text-lg text-center flex items-center justify-center gap-2">
              <Lock className="w-5 h-5 text-orange-500" />
              管理者パスワード設定
            </CardTitle>
            <CardDescription className="text-center text-xs">
              初回ログイン用のパスワードを設定してください
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* メールアドレス（固定表示） */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">
                  管理者メールアドレス
                </Label>
                <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-orange-500/20 bg-orange-500/5 text-sm text-foreground">
                  <ShieldCheck className="w-4 h-4 text-orange-500 shrink-0" />
                  <span className="font-mono text-xs">{ADMIN_EMAIL}</span>
                </div>
                {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
              </div>

              {/* パスワード */}
              <div className="space-y-1">
                <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">
                  新しいパスワード
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: "" })); }}
                    placeholder="8文字以上"
                    className="bg-background/50 border-orange-500/20 focus:border-orange-500/60 pr-10"
                    autoComplete="new-password"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-400">{errors.password}</p>}
              </div>

              {/* パスワード確認 */}
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground uppercase tracking-wider">
                  パスワード（確認）
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => { setConfirmPassword(e.target.value); setErrors(prev => ({ ...prev, confirmPassword: "" })); }}
                    placeholder="もう一度入力"
                    className="bg-background/50 border-orange-500/20 focus:border-orange-500/60 pr-10"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-400">{errors.confirmPassword}</p>}
              </div>

              {/* パスワード強度ヒント */}
              <div className="rounded-md bg-muted/30 border border-border/50 px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground/70">パスワードのルール</p>
                <p>・8文字以上で設定してください</p>
                <p>・設定後はこのページは使用できなくなります</p>
                <p>・パスワードを忘れた場合は「パスワードをお忘れの方」からリセットできます</p>
              </div>

              {/* フォームエラー */}
              {errors.form && (
                <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
                  <p className="text-xs text-red-400">{errors.form}</p>
                </div>
              )}

              {/* 送信ボタン */}
              <Button
                type="submit"
                disabled={setupMutation.isPending}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-orbitron tracking-wider"
              >
                {setupMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    設定中...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    パスワードを設定してログイン
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          このページは管理者アカウント（{ADMIN_EMAIL}）専用です
        </p>
      </div>
    </div>
  );
}
