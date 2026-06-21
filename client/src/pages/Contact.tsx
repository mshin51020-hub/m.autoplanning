import { useEffect, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<"feature" | "bug" | "other">("other");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.title = "お問い合わせ | M. AutoPlanning - パーソナルトレーニングメニュー自動作成";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "M. AutoPlanningへのお問い合わせはこちらから。機能のご要望・不具合報告・その他ご質問をお気軽にどうぞ。");
    }
  }, []);

  const submitMutation = trpc.contact.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      toast.error(err.message || "送信に失敗しました。しばらく経ってから再度お試しください。");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("必須項目を入力してください");
      return;
    }
    submitMutation.mutate({ name: name.trim(), email: email.trim(), category, message: message.trim() });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-10">
        {/* 戻るボタン */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              トップに戻る
            </Button>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">お問い合わせ</h1>
        <p className="text-sm text-muted-foreground mb-8">
          機能のご要望・不具合報告・その他ご質問がございましたら、以下のフォームよりお気軽にご連絡ください。
        </p>

        <Separator className="mb-8" />

        {submitted ? (
          /* 送信完了画面 */
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <h2 className="text-xl font-bold">送信が完了しました</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              お問い合わせいただきありがとうございます。内容を確認の上、必要に応じてご連絡いたします。
            </p>
            <Link href="/">
              <Button variant="outline" className="mt-4">
                トップページへ戻る
              </Button>
            </Link>
          </div>
        ) : (
          /* フォーム */
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* お名前 */}
            <div className="space-y-2">
              <Label htmlFor="name">
                お名前 <span className="text-destructive text-xs">必須</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="山田 太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={128}
                required
              />
            </div>

            {/* メールアドレス */}
            <div className="space-y-2">
              <Label htmlFor="email">
                メールアドレス <span className="text-destructive text-xs">必須</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                maxLength={320}
                required
              />
            </div>

            {/* お問い合わせ種別 */}
            <div className="space-y-2">
              <Label htmlFor="category">お問い合わせ種別</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">機能のご要望</SelectItem>
                  <SelectItem value="bug">不具合の報告</SelectItem>
                  <SelectItem value="other">その他</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* お問い合わせ内容 */}
            <div className="space-y-2">
              <Label htmlFor="message">
                お問い合わせ内容 <span className="text-destructive text-xs">必須（10文字以上）</span>
              </Label>
              <Textarea
                id="message"
                placeholder="ご要望・ご質問の内容をできるだけ詳しくご記入ください。"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                maxLength={2000}
                required
              />
              <p className="text-xs text-muted-foreground text-right">{message.length} / 2000</p>
            </div>

            <Button
              type="submit"
              className="w-full gap-2"
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <>送信中...</>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  送信する
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              送信いただいた内容は、
              <Link href="/privacy" className="text-primary hover:underline">プライバシーポリシー</Link>
              に従って取り扱います。
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
