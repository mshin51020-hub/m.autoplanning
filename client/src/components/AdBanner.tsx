/**
 * AdBanner — Google AdSense 広告枠コンポーネント
 *
 * 【使い方】
 * 1. AdSense 審査通過後に下記の定数を更新してください。
 *    - ADSENSE_CLIENT_ID : "ca-pub-XXXXXXXXXXXXXXXX"
 *    - ADSENSE_ENABLED   : true
 * 2. client/index.html の <head> に AdSense スクリプトタグを追加してください。
 *    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
 * 3. 各 slot の adSlot 値を AdSense 管理画面で発行した広告ユニット ID に変更してください。
 */

// ─── 設定 ───────────────────────────────────────────────
const ADSENSE_ENABLED   = false;          // 審査通過後に true に変更
const ADSENSE_CLIENT_ID = "ca-pub-XXXXXXXXXXXXXXXX"; // 審査通過後に実際の ID に変更
// ────────────────────────────────────────────────────────

type AdSize = "banner" | "rectangle" | "leaderboard" | "mobile-banner";

interface AdBannerProps {
  /** AdSense 管理画面で発行した広告ユニット ID */
  adSlot?: string;
  /** 広告サイズのプリセット */
  size?: AdSize;
  /** 追加の CSS クラス */
  className?: string;
  /** プレースホルダーのラベル（開発確認用） */
  label?: string;
}

const SIZE_STYLES: Record<AdSize, { width: string; height: string; ins: string }> = {
  "leaderboard":   { width: "728px", height: "90px",  ins: "728x90" },
  "banner":        { width: "300px", height: "250px", ins: "300x250" },
  "rectangle":     { width: "336px", height: "280px", ins: "336x280" },
  "mobile-banner": { width: "320px", height: "50px",  ins: "320x50"  },
};

export function AdBanner({
  adSlot = "0000000000",
  size = "banner",
  className = "",
  label,
}: AdBannerProps) {
  const { width, height, ins } = SIZE_STYLES[size];

  // AdSense 有効時: 実際の広告を表示
  if (ADSENSE_ENABLED) {
    return (
      <div
        className={`flex justify-center items-center overflow-hidden ${className}`}
        aria-label="広告"
      >
        <ins
          className="adsbygoogle"
          style={{ display: "block", width, height }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-slot={adSlot}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  // AdSense 無効時（審査前）: プレースホルダーを表示
  return (
    <div
      className={`flex flex-col justify-center items-center overflow-hidden border border-dashed border-primary/20 bg-primary/3 text-muted-foreground/40 text-xs ${className}`}
      style={{ minHeight: height, minWidth: "min(100%, " + width + ")" }}
      aria-label="広告枠（準備中）"
    >
      <span className="label-futuristic tracking-widest">AD</span>
      {label && <span className="mt-0.5 text-[10px]">{label}</span>}
      <span className="text-[10px] mt-0.5">{ins}</span>
    </div>
  );
}

export default AdBanner;
