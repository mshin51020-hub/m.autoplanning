import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { exerciseImages } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { jpToEnExercise } from "../../shared/exerciseMap";
import { generateImage } from "../_core/imageGeneration";

const WGER_BASE = "https://wger.de/api/v2";

/**
 * Wger APIで英語種目名を検索して画像URLを返す。
 * exerciseinfo エンドポイントを全件走査してファジーマッチ。
 */
async function fetchWgerImage(enName: string): Promise<string | null> {
  const lowerTarget = enName.toLowerCase();
  let url: string | null = `${WGER_BASE}/exerciseinfo/?format=json&language=2&limit=100&offset=0`;

  while (url) {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) break;
    const data = (await res.json()) as {
      count: number;
      next: string | null;
      results: Array<{
        translations: Array<{ language: number; name: string }>;
        images: Array<{ image: string; is_main: boolean }>;
      }>;
    };

    for (const ex of data.results) {
      const names = ex.translations
        .filter((t) => t.language === 2)
        .map((t) => t.name.toLowerCase());

      const matched = names.some(
        (n) => n === lowerTarget || n.includes(lowerTarget) || lowerTarget.includes(n)
      );

      if (matched) {
        const mainImg = ex.images.find((i) => i.is_main);
        const img = mainImg ?? ex.images[0];
        if (img) return img.image;
      }
    }

    url = data.next;
  }

  return null;
}

/**
 * AI画像生成で種目のイラストを生成する。
 */
async function generateExerciseImage(jaName: string): Promise<string | null> {
  try {
    const { url } = await generateImage({
      prompt: `Simple flat illustration of a person performing "${jaName}" exercise. Clean white background, minimal style, fitness instructional diagram, no text, single figure showing proper form.`,
    });
    return url ?? null;
  } catch {
    return null;
  }
}

export const exerciseRouter = router({
  /**
   * 種目名（日本語）から画像URLを取得する。
   * 1. DBキャッシュを確認
   * 2. Wger APIで検索
   * 3. Wgerにない場合はAI画像生成
   * 4. 結果をDBにキャッシュして返す
   */
  getImage: publicProcedure
    .input(z.object({ name: z.string().min(1).max(255) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return { imageUrl: null, source: null };
      const { name } = input;

      // 1. DBキャッシュを確認
      const cached = await db
        .select()
        .from(exerciseImages)
        .where(eq(exerciseImages.exerciseNameJa, name))
        .limit(1);

      if (cached.length > 0) {
        return { imageUrl: cached[0].imageUrl, source: cached[0].source };
      }

      // 2. 日本語→英語変換してWger APIを検索
      const enName = jpToEnExercise(name);
      let imageUrl: string | null = null;
      let source: "wger" | "ai" = "wger";

      if (enName) {
        imageUrl = await fetchWgerImage(enName);
      }

      // 3. Wgerにない場合はAI画像生成
      if (!imageUrl) {
        source = "ai";
        imageUrl = await generateExerciseImage(name);
      }

      if (!imageUrl) {
        return { imageUrl: null, source: null };
      }

      // 4. DBにキャッシュ
      const dbForInsert = await getDb();
      try {
        if (dbForInsert) await dbForInsert.insert(exerciseImages).values({
          exerciseNameJa: name,
          imageUrl,
          source,
        });
      } catch {
        // UNIQUE制約違反（並行リクエスト）は無視
      }

      return { imageUrl, source };
    }),
});
