import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface DisclaimerModalProps {
  open: boolean;
  onAgreed: () => void;
  isGuest?: boolean;
}

const DISCLAIMER_ITEMS = [
  {
    icon: "⚠️",
    text: "生成結果はあくまで推奨値であり、確実な成果を保証するものではありません。",
  },
  {
    icon: "🛑",
    text: "トレーニング中に痛み・めまい・息切れなど危険を感じた場合は、直ちに中止するか重量を下げてください。",
  },
  {
    icon: "📋",
    text: "当サイトの推奨値に基づいてトレーニングを行った結果生じた怪我・損害について、当サイトは一切の責任を負いません。",
  },
  {
    icon: "🔬",
    text: "当サイトのシステムは独自の算出方法で生成されたものであり、科学的根拠に基づくものではありません。",
  },
  {
    icon: "👨‍⚕️",
    text: "持病・既往症・関節の痛みがある方、または長期間運動をしていない方は、トレーニング開始前に医師または専門家にご相談ください。",
  },
  {
    icon: "🔄",
    text: "推奨重量・セット数・回数はあくまで目安です。体調・コンディションに応じてご自身の判断で適宜調整してください。",
  },
  {
    icon: "🔒",
    text: "当サイトはManus OAuthによる認証を使用します。ログイン情報の管理はご自身の責任で行ってください。",
  },
];

export default function DisclaimerModal({ open, onAgreed, isGuest }: DisclaimerModalProps) {
  const agreeDisclaimer = trpc.auth.agreeDisclaimer.useMutation({
    onSuccess: () => {
      sessionStorage.setItem("disclaimer_agreed", "1");
      onAgreed();
    },
    onError: (error) => {
      toast.error("同意の保存に失敗しました: " + error.message);
    },
  });

  const handleAgree = () => {
    if (isGuest) {
      sessionStorage.setItem("disclaimer_agreed", "1");
      onAgreed();
      return;
    }
    agreeDisclaimer.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto"
        // ×ボタンを非表示にして強制同意
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0" />
            <DialogTitle className="text-base font-bold tracking-wide">
              ご利用前にご確認ください
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            当サイトをご利用いただく前に、以下の注意事項をお読みください。「同意して利用を開始する」ボタンを押すことで、すべての事項に同意したものとみなします。
          </p>
        </DialogHeader>

        <div className="space-y-3 my-2">
          {DISCLAIMER_ITEMS.map((item, i) => (
            <div
              key={i}
              className="flex items-start gap-3 px-3 py-2.5 bg-muted/40 border border-border/50"
            >
              <span className="text-base shrink-0 mt-0.5">{item.icon}</span>
              <p className="text-sm leading-relaxed text-foreground/90">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-border">
          <Button
            className="w-full font-bold tracking-wide"
            disabled={agreeDisclaimer.isPending}
            onClick={handleAgree}
          >
            {agreeDisclaimer.isPending ? "保存中..." : "上記すべてに同意して利用を開始する"}
          </Button>
          <p className="text-xs text-muted-foreground text-center mt-2">
            同意は一度のみ確認されます。次回以降は表示されません。
          </p>
          <p className="text-xs text-muted-foreground text-center mt-1">
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground transition-colors">
              プライバシーポリシーを確認する
            </a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
