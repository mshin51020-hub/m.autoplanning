import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";

export default function Privacy() {
  useEffect(() => {
    document.title = "プライバシーポリシー | M. AutoPlanning - パーソナルトレーニングメニュー自動作成";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "M. AutoPlanningのプライバシーポリシーです。収集する個人情報の種類・利用目的・Cookie・広告配信に関する方針を定めています。");
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
        <h1 className="text-3xl font-bold mb-2">プライバシーポリシー</h1>
        <p className="text-sm text-muted-foreground mb-8">
          本サービスの運営者（以下，「当運営者」といいます。）は，本ウェブサイト上で提供するサービス（以下，「本サービス」といいます。）における，ユーザーの個人情報の取扱いについて，以下のとおりプライバシーポリシー（以下，「本ポリシー」といいます。）を定めます。
        </p>

        <Separator className="mb-8" />

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 第1条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第1条（個人情報）</h2>
            <p className="text-muted-foreground">
              「個人情報」とは，個人情報保護法にいう「個人情報」を指すものとし，生存する個人に関する情報であって，当該情報に含まれる氏名，メールアドレスその他の記述等により特定の個人を識別できる情報を指します。
            </p>
          </section>

          <Separator />

          {/* 第2条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第2条（収集する情報の種類と収集方法）</h2>
            <p className="text-muted-foreground mb-4">当運営者は，本サービスの提供にあたり，以下の情報を収集します。</p>

            <h3 className="font-medium mb-2">1. アカウント情報（会員登録・ログイン時に収集）</h3>
            <p className="text-muted-foreground mb-3 text-xs">
              本サービスは独自のメールアドレス・パスワード認証を採用しています。登録・ログイン時に以下の情報を収集します。
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left font-medium">項目</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">内容</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["メールアドレス", "ログインおよびお問い合わせ対応に使用"],
                    ["氏名（表示名）", "サービス内の表示に使用"],
                    ["パスワード", "bcryptによりハッシュ化して保存。平文では保存しません"],
                    ["ログイン方法", "メールアドレス・パスワード認証（email）"],
                    ["最終ログイン日時", "最後にログインした日時"],
                    ["免責事項への同意日時", "本サービスの免責事項に同意した日時"],
                    ["パスワードリセットトークン", "パスワード再設定の申請時に一時的に生成・保存。有効期限（1時間）経過後は無効化されます"],
                  ].map(([item, desc]) => (
                    <tr key={item}>
                      <td className="border border-border px-3 py-2 font-medium text-foreground">{item}</td>
                      <td className="border border-border px-3 py-2">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="font-medium mb-2">2. プロフィール情報（ユーザーが任意で入力）</h3>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left font-medium">項目</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">内容</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["身長・体重", "トレーニングメニュー生成に使用する身体情報"],
                    ["年齢・性別", "推奨重量の算出に使用する身体情報"],
                    ["トレーニング経験レベル", "初心者〜上級者の区分"],
                    ["トレーニング目標", "筋肥大等の目標設定"],
                    ["週あたりのトレーニング日数", "スケジュール設定に使用"],
                    ["1日のトレーニング時間", "種目数の算出に使用"],
                    ["使用できる設備", "自宅・ジム等の環境情報"],
                    ["鍛えたい部位", "重点部位の設定"],
                    ["メモ", "ユーザーが任意で入力する補足情報"],
                  ].map(([item, desc]) => (
                    <tr key={item}>
                      <td className="border border-border px-3 py-2 font-medium text-foreground">{item}</td>
                      <td className="border border-border px-3 py-2">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/30 rounded-md px-4 py-3 text-amber-700 dark:text-amber-400 text-xs mb-4">
              <strong>注意：</strong> 身長・体重・年齢・性別は健康に関連する情報です。これらの情報は本サービスの機能提供のみを目的として収集し，それ以外の目的には使用しません。
            </div>

            <h3 className="font-medium mb-2">3. 利用履歴情報（サービス利用時に自動生成）</h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left font-medium">項目</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">内容</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["生成されたトレーニングメニュー", "生成時のプロフィール設定と生成結果（種目・セット数・推奨重量等）"],
                    ["生成日時", "メニューを生成した日時"],
                    ["ワークアウト記録（実施重量）", "ユーザーが記録した各セットの実施重量（kg）"],
                    ["ワークアウト記録（実施レップ数）", "ユーザーが記録した各セットの実施回数"],
                    ["ワークアウト記録（完了フラグ）", "各セットの完了・未完了の状態"],
                    ["ワークアウト記録（記録日）", "トレーニングを実施した日付（YYYY-MM-DD形式）"],
                    ["ワークアウト記録（メモ）", "ユーザーが任意で入力したセットごとのメモ（最大500文字）"],
                  ].map(([item, desc]) => (
                    <tr key={item}>
                      <td className="border border-border px-3 py-2 font-medium text-foreground">{item}</td>
                      <td className="border border-border px-3 py-2">{desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <Separator />

          {/* 第3条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第3条（個人情報を収集・利用する目的）</h2>
            <p className="text-muted-foreground mb-3">当運営者が個人情報を収集・利用する目的は，以下のとおりです。</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-2">
              <li>本サービス（パーソナルトレーニングメニューの生成）の提供・運営のため</li>
              <li>ユーザーが入力したプロフィール情報に基づき，最適なトレーニングメニューを算出するため</li>
              <li>ユーザーが過去に生成したメニューの履歴を管理・表示するため</li>
              <li>ユーザーからのお問い合わせに回答するため（本人確認を含む）</li>
              <li>メンテナンス，重要なお知らせなど必要に応じたご連絡のため</li>
              <li>利用規約に違反したユーザーや，不正・不当な目的でサービスを利用しようとするユーザーの特定をし，ご利用をお断りするため</li>
              <li>上記の利用目的に付随する目的</li>
            </ol>
          </section>

          <Separator />

          {/* 第4条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第4条（利用目的の変更）</h2>
            <p className="text-muted-foreground">
              当運営者は，利用目的が変更前と関連性を有すると合理的に認められる場合に限り，個人情報の利用目的を変更するものとします。利用目的の変更を行った場合には，変更後の目的について，本ウェブサイト上に公表するものとします。
            </p>
          </section>

          <Separator />

          {/* 第5条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第5条（個人情報の第三者提供）</h2>
            <p className="text-muted-foreground mb-3">
              当運営者は，次に掲げる場合を除いて，あらかじめユーザーの同意を得ることなく，第三者に個人情報を提供することはありません。ただし，個人情報保護法その他の法令で認められる場合を除きます。
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-2 mb-3">
              <li>人の生命，身体または財産の保護のために必要がある場合であって，本人の同意を得ることが困難であるとき</li>
              <li>公衆衛生の向上または児童の健全な育成の推進のために特に必要がある場合であって，本人の同意を得ることが困難であるとき</li>
              <li>国の機関もしくは地方公共団体またはその委託を受けた者が法令の定める事務を遂行することに対して協力する必要がある場合であって，本人の同意を得ることにより当該事務の遂行に支障を及ぼすおそれがあるとき</li>
            </ol>
            <p className="text-muted-foreground">
              なお，本サービスでは広告配信のためにGoogle AdSenseを利用しており，Googleが広告配信のためにCookieを使用することがあります。これに伴う情報の取扱いについては，第7条（Cookieの使用について）および第8条（広告配信について）をご参照ください。
            </p>
          </section>

          <Separator />

          {/* 第6条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第6条（個人情報の安全管理）</h2>
            <p className="text-muted-foreground">
              当運営者は，収集した個人情報の漏洩，滅失またはき損の防止その他の個人情報の安全管理のために必要かつ適切な措置を講じます。パスワードはbcryptによりハッシュ化して保存し，平文では保存しません。セッション情報はHTTPOnly属性・Secure属性を付与したCookieにより管理し，通信はHTTPS（TLS）により暗号化されます。
            </p>
          </section>

          <Separator />

          {/* 第7条（新設：Cookie） */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第7条（Cookieの使用について）</h2>
            <p className="text-muted-foreground mb-3">
              本サービスでは，以下の目的でCookieを使用しています。
            </p>
            <div className="overflow-x-auto mb-4">
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="border border-border px-3 py-2 text-left font-medium">種類</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">目的</th>
                    <th className="border border-border px-3 py-2 text-left font-medium">発行元</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  {[
                    ["セッションCookie", "ログイン状態の維持（HTTPOnly・Secure属性付き）", "当運営者"],
                    ["広告Cookie", "ユーザーの興味に基づいた広告の表示（パーソナライズ広告）", "Google（AdSense）"],
                    ["分析Cookie", "サービスの利用状況の把握・改善", "当運営者・Google"],
                  ].map(([type, purpose, issuer]) => (
                    <tr key={type}>
                      <td className="border border-border px-3 py-2 font-medium text-foreground">{type}</td>
                      <td className="border border-border px-3 py-2">{purpose}</td>
                      <td className="border border-border px-3 py-2">{issuer}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-muted-foreground mb-3">
              ユーザーはブラウザの設定によりCookieを無効化することができます。ただし，セッションCookieを無効化した場合，ログイン機能が正常に動作しなくなる場合があります。
            </p>
            <p className="text-muted-foreground">
              Cookieの詳細な管理方法については，ご利用のブラウザのヘルプページをご参照ください。また，Googleによる広告Cookieの使用については，<a href="https://policies.google.com/technologies/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google広告に関するポリシー</a>をご確認ください。
            </p>
          </section>

          <Separator />

          {/* 第8条（新設：広告配信） */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第8条（広告配信について）</h2>
            <p className="text-muted-foreground mb-3">
              本サービスでは，Google LLC（以下，「Google」といいます。）が提供するGoogle AdSenseを利用して広告を配信しています。Google AdSenseは，ユーザーの本サービスおよび他のウェブサイトへのアクセス情報（Cookieを含む）に基づき，ユーザーの興味に合わせた広告を表示することがあります。
            </p>
            <p className="text-muted-foreground mb-3">
              Googleによる広告Cookieの使用により，ユーザーが本サービスや他のサイトにアクセスした際の情報がGoogleに送信される場合があります。Googleがこれらの情報を使用する方法については，<a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Googleのプライバシーポリシー</a>をご参照ください。
            </p>
            <p className="text-muted-foreground mb-3">
              ユーザーは，<a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Googleの広告設定ページ</a>にアクセスすることで，パーソナライズ広告を無効化することができます。また，<a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">aboutads.info</a>からも広告のパーソナライズをオプトアウトできます。
            </p>
            <p className="text-muted-foreground">
              なお，当運営者はGoogle AdSenseを通じてユーザーの個人情報（氏名・メールアドレス等）をGoogleに提供することはありません。
            </p>
          </section>

          <Separator />

          {/* 第9条（旧第7条） */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第9条（個人情報の保存期間）</h2>
            <p className="text-muted-foreground">
              当運営者は，収集した個人情報を，当運営者の定める任意の期間，保存するものとします。ユーザーがアカウントを削除した場合，または当運営者がサービスを終了した場合には，収集した個人情報を速やかに削除するよう努めます。なお，パスワードリセットトークンは申請から1時間で自動的に無効化されます。
            </p>
          </section>

          <Separator />

          {/* 第10条（旧第8条） */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第10条（個人情報の開示）</h2>
            <p className="text-muted-foreground mb-3">
              当運営者は，本人から個人情報の開示を求められたときは，本人に対し，遅滞なくこれを開示します。ただし，開示することにより次のいずれかに該当する場合は，その全部または一部を開示しないこともあります。
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-2 mb-3">
              <li>本人または第三者の生命，身体，財産その他の権利利益を害するおそれがある場合</li>
              <li>当運営者の業務の適正な実施に著しい支障を及ぼすおそれがある場合</li>
              <li>その他法令に違反することとなる場合</li>
            </ol>
            <p className="text-muted-foreground">開示しない決定をした場合には，その旨を遅滞なく通知します。</p>
          </section>

          <Separator />

          {/* 第11条（旧第9条） */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第11条（個人情報の訂正および削除）</h2>
            <p className="text-muted-foreground mb-3">
              ユーザーは，当運営者の保有する自己の個人情報が誤った情報である場合には，当運営者に対して個人情報の訂正，追加または削除（以下，「訂正等」といいます。）を請求することができます。当運営者は，その請求に応じる必要があると判断した場合には，遅滞なく，当該個人情報の訂正等を行い，ユーザーに通知します。
            </p>
            <p className="text-muted-foreground">
              なお，プロフィール情報（身長・体重・年齢・性別等）については，本サービスのプロフィール編集機能からユーザー自身が随時修正・削除することができます。
            </p>
          </section>

          <Separator />

          {/* 第12条（旧第10条） */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第12条（個人情報の利用停止等）</h2>
            <p className="text-muted-foreground">
              当運営者は，本人から，個人情報が利用目的の範囲を超えて取り扱われているという理由，または不正の手段により取得されたものであるという理由により，その利用の停止または消去（以下，「利用停止等」といいます。）を求められた場合には，遅滞なく必要な調査を行い，その請求に応じる必要があると判断した場合には，遅滞なく当該個人情報の利用停止等を行い，ユーザーに通知します。
            </p>
          </section>

          <Separator />

          {/* 第13条（旧第11条） */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第13条（未成年者の利用について）</h2>
            <p className="text-muted-foreground">
              本サービスは，13歳未満の方のご利用をお断りしております。13歳未満の方が個人情報を提供していることが判明した場合，当運営者は速やかに当該情報を削除します。
            </p>
          </section>

          <Separator />

          {/* 第14条（旧第12条） */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第14条（健康情報の取扱いについて）</h2>
            <p className="text-muted-foreground mb-3">
              本サービスは，身長・体重・年齢・性別等の健康に関連する情報を収集します。これらの情報は，トレーニングメニューの生成および推奨重量の算出のみを目的として使用し，医療目的や保険目的には使用しません。また，これらの情報を第三者に提供することはありません（第8条に定めるGoogle AdSenseの広告Cookieを除く）。
            </p>
            <p className="text-muted-foreground">
              本サービスが提供するトレーニングメニューおよび推奨重量は，入力された情報に基づく独自の算出方法によるものであり，医学的・科学的根拠に基づく診断や処方ではありません。
            </p>
          </section>

          <Separator />

          {/* 第15条（旧第13条） */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第15条（プライバシーポリシーの変更）</h2>
            <p className="text-muted-foreground">
              本ポリシーの内容は，法令その他本ポリシーに別段の定めのある事項を除いて，ユーザーに通知することなく変更することができるものとします。変更後のプライバシーポリシーは，本ウェブサイトに掲載したときから効力を生じるものとします。
            </p>
          </section>

          <Separator />

          {/* 第16条（旧第14条） */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第16条（お問い合わせ窓口）</h2>
            <p className="text-muted-foreground mb-3">本ポリシーに関するお問い合わせは，下記の窓口までお願いいたします。</p>
            <p className="text-muted-foreground">
              Eメールアドレス：<a href="mailto:m.autoplanning@gmail.com" className="text-primary hover:underline font-medium">m.autoplanning@gmail.com</a>
            </p>
          </section>

          <Separator />

          <div className="text-xs text-muted-foreground text-right space-y-1">
            <p>制定日：2026年6月11日</p>
            <p>改定日：2026年6月19日（ワークアウト記録データの収集内容を明記）</p>
          </div>
        </div>
      </div>
    </div>
  );
}
