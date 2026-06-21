import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Dumbbell, ArrowLeft } from "lucide-react";

type Mode = "login" | "register";

export default function AuthPage() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);

  // フォーム状態
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

    const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => {
      toast.success("ログインしました");
      navigate("/profile");
    },
    onError: (err) => {
      // 管理者パスワード未設定の場合は専用設定ページへ誘導
      if (err.message === "ADMIN_PASSWORD_NOT_SET") {
        toast.info("管理者パスワードの初期設定が必要です");
        navigate("/admin/setup-password");
        return;
      }
      setErrors({ form: err.message });
    },
  });
  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => {
      toast.success("アカウントを作成しました");
      navigate("/profile");
    },
    onError: (err) => {
      setErrors({ form: err.message });
    },
  });

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = "メールアドレスを入力してください";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "有効なメールアドレスを入力してください";

    if (!password) newErrors.password = "パスワードを入力してください";
    else if (password.length < 8) newErrors.password = "パスワードは8文字以上で入力してください";

    if (mode === "register") {
      if (!name.trim()) newErrors.name = "名前を入力してください";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    if (mode === "login") {
      loginMutation.mutate({ email, password });
    } else if (mode === "register") {
      registerMutation.mutate({ email, password, name });
    }
  };

  const isLoading = loginMutation.isPending || registerMutation.isPending;

  const V4_ICON_URL = "/icon.svg";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* 六角形背景 */}
      <div className="hex-bg" />
      <div className="scanline pointer-events-none" />

      {/* ホームへ戻るリンク */}
      <a
        href="/"
        className="absolute top-4 left-4 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        ホームへ戻る
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
            Personal Training System
          </p>
        </div>

        <Card className="card-futuristic border-orange-500/20">
          <CardHeader className="pb-4">
            <CardTitle className="font-orbitron text-lg text-center">
              {mode === "login" ? "ログイン" : "アカウント作成"}
            </CardTitle>
            <CardDescription className="text-center text-xs">
              {mode === "login" ? "メールアドレスとパスワードでログイン" : "新しいアカウントを作成してください"}
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 名前（登録時のみ） */}
                {mode === "register" && (
                  <div className="space-y-1">
                    <Label htmlFor="name" className="text-xs text-muted-foreground uppercase tracking-wider">
                      名前
                    </Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => { setName(e.target.value); setErrors(prev => ({ ...prev, name: "" })); }}
                      placeholder="山田 太郎"
                      className="bg-background/50 border-orange-500/20 focus:border-orange-500/60"
                      autoComplete="name"
                    />
                    {errors.name && <p className="text-xs text-red-400">{errors.name}</p>}
                  </div>
                )}

                {/* メールアドレス */}
                <div className="space-y-1">
                  <Label htmlFor="email" className="text-xs text-muted-foreground uppercase tracking-wider">
                    メールアドレス
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setErrors(prev => ({ ...prev, email: "" })); }}
                    placeholder="example@email.com"
                    className="bg-background/50 border-orange-500/20 focus:border-orange-500/60"
                    autoComplete="email"
                  />
                  {errors.email && <p className="text-xs text-red-400">{errors.email}</p>}
                </div>

                {/* パスワード */}
                <div className="space-y-1">
                  <Label htmlFor="password" className="text-xs text-muted-foreground uppercase tracking-wider">
                    パスワード
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setErrors(prev => ({ ...prev, password: "" })); }}
                      placeholder={mode === "register" ? "8文字以上" : "パスワード"}
                      className="bg-background/50 border-orange-500/20 focus:border-orange-500/60 pr-10"
                      autoComplete={mode === "register" ? "new-password" : "current-password"}
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

                {/* フォームエラー */}
                {errors.form && (
                  <div className="rounded-md bg-red-500/10 border border-red-500/30 px-3 py-2">
                    <p className="text-xs text-red-400">{errors.form}</p>
                  </div>
                )}

                {/* 送信ボタン */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-orbitron tracking-wider"
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      処理中...
                    </span>
                  ) : (
                    mode === "login" ? "ログイン" : "アカウントを作成"
                  )}
                </Button>

                {/* ゲスト利用 */}
                {mode === "login" && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground text-xs"
                    onClick={() => navigate("/plan")}
                  >
                    ログインせずに試してみる（ゲスト利用）
                  </Button>
                )}

                {/* モード切替リンク */}
                <div className="flex flex-col items-center gap-2 pt-2 border-t border-border/50">
                  {mode === "login" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => { setMode("register"); setErrors({}); }}
                        className="text-xs text-orange-500 hover:text-orange-400 transition-colors"
                      >
                        アカウントをお持ちでない方はこちら
                      </button>
                      <a
                        href="/contact"
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        パスワードをお忘れの方はお問い合わせください
                      </a>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setMode("login"); setErrors({}); }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      ログイン画面に戻る
                    </button>
                  )}
                </div>
              </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-4">
          ご利用にあたっては
          <a href="/privacy" className="text-orange-500 hover:text-orange-400 mx-1">プライバシーポリシー</a>
          に同意したものとみなします
        </p>
      </div>
    </div>
  );
}
