/**
 * AffiliateCard — アフィリエイト広告カードコンポーネント
 *
 * 【使い方】
 * 1. items 配列に ASP から発行したリンク URL と商品情報を追加してください。
 * 2. imageUrl は商品画像の URL（ASP が提供するバナー画像 URL）を指定してください。
 * 3. tag に "PR" または "広告" を必ず表示する（景品表示法対応）。
 *
 * 【推奨 ASP】
 * - Amazon アソシエイト : https://affiliate.amazon.co.jp/
 * - A8.net             : https://www.a8.net/
 * - もしもアフィリエイト : https://af.moshimo.com/
 */

import { ExternalLink } from "lucide-react";

export interface AffiliateItem {
  /** 商品名 */
  title: string;
  /** 商品説明（1〜2行） */
  description: string;
  /** アフィリエイトリンク URL */
  href: string;
  /** 商品画像 URL（任意） */
  imageUrl?: string;
  /** カテゴリラベル（例: "プロテイン", "ジムウェア"） */
  category?: string;
  /** ボタンラベル */
  cta?: string;
}

interface AffiliateCardProps {
  items: AffiliateItem[];
  /** セクションタイトル */
  title?: string;
  className?: string;
}

export function AffiliateCard({
  items,
  title = "おすすめ商品",
  className = "",
}: AffiliateCardProps) {
  if (items.length === 0) return null;

  return (
    <div className={`border border-accent/20 bg-accent/3 p-5 ${className}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-px w-6 bg-accent" />
          <p className="label-futuristic text-accent text-xs">{title}</p>
        </div>
        {/* 景品表示法対応: PR 表記 */}
        <span className="text-[10px] font-bold tracking-widest border border-muted-foreground/30 text-muted-foreground/50 px-1.5 py-0.5">
          PR
        </span>
      </div>

      {/* 商品リスト */}
      <div className={`grid gap-3 ${items.length >= 2 ? "sm:grid-cols-2" : ""}`}>
        {items.map((item, i) => (
          <a
            key={i}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group flex items-start gap-3 border border-accent/10 bg-background/40 p-3 hover:border-accent/40 hover:bg-accent/5 transition-snappy"
          >
            {/* 商品画像 */}
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="w-14 h-14 object-cover shrink-0 border border-border/50"
              />
            )}

            {/* テキスト */}
            <div className="flex-1 min-w-0">
              {item.category && (
                <span className="text-[10px] font-bold tracking-wider text-accent label-futuristic">
                  {item.category}
                </span>
              )}
              <p className="text-sm font-medium leading-snug mt-0.5 line-clamp-2 group-hover:text-accent transition-colors">
                {item.title}
              </p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.description}
              </p>
            </div>

            {/* 外部リンクアイコン */}
            <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-1 group-hover:text-accent transition-colors" />
          </a>
        ))}
      </div>
    </div>
  );
}

export default AffiliateCard;
