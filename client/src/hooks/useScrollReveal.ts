import { useEffect, useRef, RefObject } from "react";

/**
 * IntersectionObserver を使ったスクロールリビールフック。
 * 返した ref を対象要素のコンテナに渡すと、
 * 子要素の `.reveal` クラスが視野に入った際に `.revealed` を付与する。
 *
 * @param deps - データロード完了などを検知するための依存配列。
 *               変化するたびに .reveal 要素を再スキャンして Observer を再登録する。
 */
export function useScrollReveal(
  options?: IntersectionObserverInit,
  deps: unknown[] = []
): RefObject<HTMLDivElement | null> {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // DOM 更新が完了した次のマイクロタスクで実行する
    const timer = setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      // まだ revealed されていない .reveal 要素だけを対象にする
      const targets = Array.from(
        container.querySelectorAll<HTMLElement>(".reveal:not(.revealed)")
      );
      if (targets.length === 0) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("revealed");
              observer.unobserve(entry.target); // 一度だけ発火
            }
          });
        },
        {
          threshold: 0.12,
          rootMargin: "0px 0px -32px 0px",
          ...options,
        }
      );

      targets.forEach((el) => observer.observe(el));

      return () => observer.disconnect();
    }, 0);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return containerRef;
}
