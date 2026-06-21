import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";

export default function Terms() {
  useEffect(() => {
    document.title = "利用規約 | M. AutoPlanning - パーソナルトレーニングメニュー自動作成";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", "M. AutoPlanningの利用規約です。本サービスのご利用にあたってのルール・禁止事項・免責事項等を定めています。");
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
        <h1 className="text-3xl font-bold mb-2">利用規約</h1>
        <p className="text-sm text-muted-foreground mb-8">
          この利用規約（以下，「本規約」といいます。）は，本サービスの運営者（以下，「当運営者」といいます。）が提供するウェブサービス「M. AutoPlanning」（以下，「本サービス」といいます。）の利用条件を定めるものです。ユーザーの皆さまには，本規約に従って本サービスをご利用いただきます。
        </p>

        <Separator className="mb-8" />

        <div className="space-y-10 text-sm leading-relaxed">

          {/* 第1条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第1条（適用）</h2>
            <p className="text-muted-foreground">
              本規約は，ユーザーと当運営者との間の本サービスの利用に関わる一切の関係に適用されるものとします。当運営者は本サービスに関し，本規約のほか，ご利用にあたってのルール等，各種の定め（以下，「個別規定」といいます。）をすることがあります。これら個別規定はその名称のいかんに関わらず，本規約の一部を構成するものとします。本規約の規定が前条の個別規定と矛盾する場合には，個別規定において特段の定めなき限り，個別規定の規定が優先されるものとします。
            </p>
          </section>

          <Separator />

          {/* 第2条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第2条（利用登録）</h2>
            <p className="text-muted-foreground mb-3">
              本サービスにおいては，登録希望者が本規約に同意の上，当運営者の定める方法によって利用登録を申請し，当運営者がこれを承認することによって，利用登録が完了するものとします。
            </p>
            <p className="text-muted-foreground mb-3">当運営者は，利用登録の申請者に以下の事由があると判断した場合，利用登録の申請を承認しないことがあり，その理由については一切の開示義務を負わないものとします。</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-2">
              <li>利用登録の申請に際して虚偽の事項を届け出た場合</li>
              <li>本規約に違反したことがある者からの申請である場合</li>
              <li>その他，当運営者が利用登録を相当でないと判断した場合</li>
            </ol>
          </section>

          <Separator />

          {/* 第3条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第3条（ユーザーIDおよびパスワードの管理）</h2>
            <p className="text-muted-foreground mb-3">
              ユーザーは，自己の責任において，本サービスのユーザーIDおよびパスワードを適切に管理するものとします。ユーザーは，いかなる場合にも，ユーザーIDおよびパスワードを第三者に譲渡または貸与し，もしくは第三者と共用することはできません。
            </p>
            <p className="text-muted-foreground">
              当運営者は，ユーザーIDとパスワードの組み合わせが登録情報と一致してログインされた場合には，そのユーザーIDを登録しているユーザー自身による利用とみなします。第三者による不正使用によって生じた損害は，当運営者に故意又は重大な過失がある場合を除き，当運営者は一切の責任を負わないものとします。
            </p>
          </section>

          <Separator />

          {/* 第4条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第4条（禁止事項）</h2>
            <p className="text-muted-foreground mb-3">ユーザーは，本サービスの利用にあたり，以下の行為をしてはなりません。</p>
            <ol className="list-decimal list-inside space-y-2 text-muted-foreground pl-2">
              <li>法令または公序良俗に違反する行為</li>
              <li>犯罪行為に関連する行為</li>
              <li>当運営者，本サービスの他のユーザー，またはその他第三者のサーバーまたはネットワークの機能を破壊したり，妨害したりする行為</li>
              <li>当運営者のサービスの運営を妨害するおそれのある行為</li>
              <li>他のユーザーに関する個人情報等を収集または蓄積する行為</li>
              <li>不正アクセスをし，またはこれを試みる行為</li>
              <li>他のユーザーに成りすます行為</li>
              <li>当運営者のサービスに関連して，反社会的勢力に対して直接または間接に利益を供与する行為</li>
              <li>当運営者，本サービスの他のユーザーまたはその他の第三者の知的財産権，肖像権，プライバシー，名誉その他の権利または利益を侵害する行為</li>
              <li>本サービスを通じて，過度に暴力的な表現，露骨な性的表現，人種，国籍，信条，性別，社会的身分，門地等による差別につながる表現，自殺，自傷行為，薬物乱用を誘引または助長する表現，その他反社会的な内容を含み他人に不快感を与える表現を投稿または送信する行為</li>
              <li>営業，宣伝，広告，勧誘，その他営利を目的とする行為（当運営者の認めたものを除く。）</li>
              <li>面識のない異性との出会いを目的とした行為</li>
              <li>当運営者のサービスに関連して，以下に示す不正行為</li>
              <li>その他，当運営者が不適切と判断する行為</li>
            </ol>
          </section>

          <Separator />

          {/* 第5条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第5条（本サービスの提供の停止等）</h2>
            <p className="text-muted-foreground mb-3">
              当運営者は，以下のいずれかの事由があると判断した場合，ユーザーに事前に通知することなく本サービスの全部または一部の提供を停止または中断することができるものとします。
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-2 mb-3">
              <li>本サービスにかかるコンピュータシステムの保守点検または更新を行う場合</li>
              <li>地震，落雷，火災，停電または天災などの不可抗力により，本サービスの提供が困難となった場合</li>
              <li>コンピュータまたは通信回線等が事故により停止した場合</li>
              <li>その他，当運営者が本サービスの提供が困難と判断した場合</li>
            </ol>
            <p className="text-muted-foreground">
              当運営者は，本サービスの提供の停止または中断により，ユーザーまたは第三者が被ったいかなる不利益または損害についても，一切の責任を負わないものとします。
            </p>
          </section>

          <Separator />

          {/* 第6条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第6条（利用制限および登録抹消）</h2>
            <p className="text-muted-foreground mb-3">
              当運営者は，ユーザーが以下のいずれかに該当する場合には，事前の通知なく，ユーザーに対して，本サービスの全部もしくは一部の利用を制限し，またはユーザーとしての登録を抹消することができるものとします。
            </p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground pl-2 mb-3">
              <li>本規約のいずれかの条項に違反した場合</li>
              <li>登録事項に虚偽の事実があることが判明した場合</li>
              <li>当運営者からの連絡に対し，一定期間返答がない場合</li>
              <li>本サービスについて，最終の利用から一定期間利用がない場合</li>
              <li>その他，当運営者が本サービスの利用を適当でないと判断した場合</li>
            </ol>
            <p className="text-muted-foreground">
              当運営者は，本条に基づき当運営者が行った行為によりユーザーに生じた損害について，一切の責任を負いません。
            </p>
          </section>

          <Separator />

          {/* 第7条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第7条（退会）</h2>
            <p className="text-muted-foreground">
              ユーザーは，当運営者の定める退会手続により，本サービスから退会できるものとします。
            </p>
          </section>

          <Separator />

          {/* 第8条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第8条（保証の否認および免責事項）</h2>
            <p className="text-muted-foreground mb-3">
              当運営者は，本サービスに事実上または法律上の瑕疵（安全性，信頼性，正確性，完全性，有効性，特定の目的への適合性，セキュリティなどに関する欠陥，エラーやバグ，権利侵害などを含みます。）がないことを明示的にも黙示的にも保証しておりません。
            </p>
            <p className="text-muted-foreground mb-3">
              当運営者は，本サービスに起因してユーザーに生じたあらゆる損害について，当運営者の故意又は重過失による場合を除き，一切の責任を負いません。ただし，本サービスに関する当運営者とユーザーとの間の契約（本規約を含みます。）が消費者契約法に定める消費者契約となる場合，この免責規定は適用されません。
            </p>
            <p className="text-muted-foreground mb-3">
              本サービスが提供するトレーニングメニューおよび推奨重量は，ユーザーが入力した情報に基づく参考情報であり，医学的・専門的なアドバイスを構成するものではありません。トレーニングの実施にあたっては，ユーザー自身の判断と責任において行ってください。
            </p>
            <p className="text-muted-foreground">
              当運営者は，本サービスに関して，ユーザーと他のユーザーまたは第三者との間において生じた取引，連絡または紛争等について一切責任を負いません。
            </p>
          </section>

          <Separator />

          {/* 第9条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第9条（サービス内容の変更等）</h2>
            <p className="text-muted-foreground">
              当運営者は，ユーザーへの事前の告知をもって，本サービスの内容を変更，追加または廃止することがあり，ユーザーはこれを承諾するものとします。
            </p>
          </section>

          <Separator />

          {/* 第10条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第10条（利用規約の変更）</h2>
            <p className="text-muted-foreground">
              当運営者は以下の場合には，ユーザーの個別の同意を要せず，本規約を変更することができるものとします。本規約の変更はユーザーの一般の利益に適合するとき，または本規約の変更が本サービス利用契約の目的に反せず，かつ，変更の必要性，変更後の内容の相当性その他の変更に係る事情に照らして合理的なものであるとき。当運営者はユーザーに対し，前項による本規約の変更にあたり，事前に，本規約を変更する旨及び変更後の本規約の内容並びにその効力発生時期を本ウェブサイト上への掲示その他の適切な方法により周知します。
            </p>
          </section>

          <Separator />

          {/* 第11条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第11条（個人情報の取扱い）</h2>
            <p className="text-muted-foreground">
              当運営者による本サービスの利用に際してのユーザーの個人情報の取扱いについては，別途当運営者が定める「<Link href="/privacy" className="text-primary hover:underline font-medium">プライバシーポリシー</Link>」に従うものとし，ユーザーはこのプライバシーポリシーに従って当運営者が個人情報を取扱うことに同意するものとします。
            </p>
          </section>

          <Separator />

          {/* 第12条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第12条（通知または連絡）</h2>
            <p className="text-muted-foreground">
              ユーザーと当運営者との間の通知または連絡は，当運営者の定める方法によって行うものとします。当運営者は，ユーザーから，当運営者が別途定める方式に従った変更届け出がない限り，現在登録されている連絡先が有効なものとみなして当該連絡先へ通知または連絡を行い，これらは，発信時にユーザーへ到達したものとみなします。
            </p>
          </section>

          <Separator />

          {/* 第13条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第13条（権利義務の譲渡の禁止）</h2>
            <p className="text-muted-foreground">
              ユーザーは，当運営者の書面による事前の承諾なく，利用契約上の地位または本規約に基づく権利もしくは義務を第三者に譲渡し，または担保に供することはできません。
            </p>
          </section>

          <Separator />

          {/* 第14条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第14条（準拠法・裁判管轄）</h2>
            <p className="text-muted-foreground mb-3">
              本規約の解釈にあたっては，日本法を準拠法とします。
            </p>
            <p className="text-muted-foreground">
              本サービスに関して紛争が生じた場合には，当運営者の所在地を管轄する裁判所を専属的合意管轄とします。
            </p>
          </section>

          <Separator />

          {/* 第15条 */}
          <section>
            <h2 className="text-lg font-semibold mb-3">第15条（お問い合わせ窓口）</h2>
            <p className="text-muted-foreground mb-3">本規約に関するお問い合わせは，下記の窓口までお願いいたします。</p>
            <p className="text-muted-foreground">
              Eメールアドレス：<a href="mailto:m.autoplanning@gmail.com" className="text-primary hover:underline font-medium">m.autoplanning@gmail.com</a>
            </p>
          </section>

          <Separator />

          <div className="text-xs text-muted-foreground text-right space-y-1">
            <p>制定日：2025年5月1日</p>
            <p>改定日：2026年6月19日（独自認証への移行・退会手続き・アカウント管理に関する条項を更新）</p>
          </div>
        </div>
      </div>
    </div>
  );
}
