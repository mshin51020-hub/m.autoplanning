import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Mail, Zap, BarChart3, History, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";

const NEW_ICON = "/manus-storage/icon-fist-v4-transparent_856cda0b.png";

export default function About() {
  useEffect(() => {
    document.title = "このサービスについて | M. AutoPlanning - パーソナルトレーニングメニュー自動作成";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute(
        "content",
        "M. AutoPlanningは、推奨重量・種目入れ替え・ワークアウト記録まで対応した無料のトレーニングサポートサービスです。運営者情報・サービスの目的・連絡先をご案内します。"
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* 戻るボタン */}
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              トップに戻る
            </Button>
          </Link>
        </div>

        {/* タイトル */}
        <div className="flex items-center gap-4 mb-4">
          <img src={NEW_ICON} alt="M. AutoPlanning ロゴ" className="w-12 h-12 object-contain" />
          <div>
            <h1 className="text-3xl font-bold heading-futuristic text-primary glow-orange-text">
              M. AutoPlanning
            </h1>
            <p className="text-sm text-muted-foreground mt-1">パーソナルトレーニングメニュー自動生成・ワークアウト記録サービス</p>
          </div>
        </div>

        <Separator className="mb-10" />

        <div className="space-y-12 text-sm leading-relaxed">

          {/* サービス概要 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">サービス概要</h2>
            <p className="text-muted-foreground mb-4">
              M. AutoPlanning（エム・オートプランニング）は，身体情報とトレーニング目標を入力するだけで，種目・セット数・レップ数・推奨重量を自動算出する無料のトレーニングサポートサービスです。
            </p>
            <p className="text-muted-foreground mb-4">
              初心者から上級者まで，全身法・部位分割法に基づいたパーソナライズされたメニューを生成。気に入らない種目は同じ部位の候補から選んで入れ替えられ、実際のトレーニング結果もセットごとに記録できます。
            </p>
            <p className="text-muted-foreground">
              本サービスは個人が開発・運営する無料のウェブアプリケーションです。トレーニングをより身近に，より効果的にすることを目的として提供しています。
            </p>
          </section>

          <Separator />

          {/* 主な機能 */}
          <section>
            <h2 className="text-xl font-semibold mb-6">主な機能</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  icon: Zap,
                  title: "推奨重量まで自動算出",
                  desc: "体重・年齢・トレーニング歴・強度レベルをもとに，種目ごとの推奨重量・セット数・レップ数を自動で算出します。",
                },
                {
                  icon: BarChart3,
                  title: "種目の入れ替え",
                  desc: "気に入らない種目は同じ部位の候補リストから選んで入れ替えられます。ランダムではなく自分で選択できます。",
                },
                {
                  icon: History,
                  title: "ワークアウト記録",
                  desc: "実際のトレーニング結果（重量・回数）をセットごとに記録。完了チェックで進捗を管理できます。",
                },
                {
                  icon: Shield,
                  title: "履歴・ゲスト対応",
                  desc: "登録不要でゲスト利用が可能。アカウント登録で過去のプランをいつでも確認・再利用できます。",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="border border-primary/15 bg-card/40 rounded-lg p-5 card-hover-orange"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Icon className="w-5 h-5 text-primary shrink-0" />
                    <h3 className="font-semibold">{title}</h3>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* 運営者情報 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">運営者情報</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <tbody className="text-muted-foreground">
                  {[
                    ["サービス名", "M. AutoPlanning（エム・オートプランニング）"],
                    ["運営者名", "Shingo Morikawa"],
                    ["サービス開始", "2026年6月"],
                    ["提供形態", "個人運営のウェブサービス（無料）"],
                    ["対応言語", "日本語"],
                    ["対象ユーザー", "13歳以上のトレーニングに興味のある方"],
                  ].map(([label, value]) => (
                    <tr key={label}>
                      <td className="border border-border px-4 py-3 font-medium text-foreground w-36 shrink-0">
                        {label}
                      </td>
                      <td className="border border-border px-4 py-3">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Separator />

          {/* 免責事項 */}
          <section>
            <h2 className="text-xl font-semibold mb-4">免責事項</h2>
            <p className="text-muted-foreground mb-3">
              本サービスが提供するトレーニングメニューおよび推奨重量は，ユーザーが入力した情報に基づく参考情報であり，医学的・専門的なアドバイスを構成するものではありません。
            </p>
            <p className="text-muted-foreground">
              トレーニングの実施にあたっては，ユーザー自身の判断と責任において行ってください。持病・怪我・体調不良がある場合は，医師や専門家にご相談の上でご利用ください。
            </p>
          </section>

          <Separator />

          {/* お問い合わせ */}
          <section>
            <h2 className="text-xl font-semibold mb-4">お問い合わせ</h2>
            <p className="text-muted-foreground mb-6">
              本サービスに関するご意見・ご要望・不具合のご報告は，お問い合わせフォームまたはメールにてお気軽にご連絡ください。
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/contact">
                <Button className="btn-press glow-orange font-bold tracking-wide w-full sm:w-auto">
                  お問い合わせフォーム
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </Link>
              <a href="mailto:m.autoplanning@gmail.com">
                <Button
                  variant="outline"
                  className="btn-press border-primary/40 text-primary hover:bg-primary/10 w-full sm:w-auto"
                >
                  <Mail className="mr-2 w-4 h-4" />
                  m.autoplanning@gmail.com
                </Button>
              </a>
            </div>
          </section>

          <Separator />

          {/* 関連リンク */}
          <section>
            <h2 className="text-xl font-semibold mb-4">関連ページ</h2>
            <div className="flex flex-wrap gap-3">
              {[
                { href: "/privacy", label: "プライバシーポリシー" },
                { href: "/terms", label: "利用規約" },
                { href: "/contact", label: "お問い合わせ" },
              ].map(({ href, label }) => (
                <Link key={href} href={href}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-primary/20 text-muted-foreground hover:text-primary hover:border-primary/40"
                  >
                    {label}
                  </Button>
                </Link>
              ))}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
