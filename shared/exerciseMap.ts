/**
 * 日本語トレーニング種目名 → 英語名マッピング
 * Wger API (https://wger.de/api/v2/) の英語種目名に合わせて作成。
 * AIが生成する日本語種目名を正規化してから英語に変換する。
 */

/** 日本語 → 英語の種目名マッピング */
export const EXERCISE_JP_TO_EN: Record<string, string> = {
  // ── 胸 ──────────────────────────────────────────────────────────
  "バーベルベンチプレス": "Bench Press",
  "ベンチプレス": "Bench Press",
  "ダンベルベンチプレス": "Benchpress Dumbbells",
  "インクラインベンチプレス": "Incline Bench Press - Barbell",
  "インクラインダンベルベンチプレス": "Incline Bench Press - Dumbbell",
  "デクラインベンチプレス": "Decline Bench Press Barbell",
  "ナローグリップベンチプレス": "Bench Press Narrow Grip",
  "クローズグリップベンチプレス": "Close-Grip Bench Press",
  "ダンベルフライ": "Dumbbell Flyes",
  "インクラインダンベルフライ": "Incline Dumbbell Flyes",
  "ペックデック": "Peck Deck Flyes",
  "ケーブルクロスオーバー": "Cable Crossovers",
  "プッシュアップ": "Push-Up",
  "腕立て伏せ": "Push-Up",
  "ワイドプッシュアップ": "Wide Push-Up",
  "ディップス": "Dips",
  "チェストプレス": "Chest Press",
  "ダンベルプルオーバー": "Cross-Bench Dumbbell Pullovers",

  // ── 背中 ─────────────────────────────────────────────────────────
  "デッドリフト": "Deadlifts",
  "バーベルデッドリフト": "Deadlifts",
  "ルーマニアンデッドリフト": "Dumbbell Romanian Deadlift",
  "スモウデッドリフト": "Sumo Deadlift",
  "ラックデッドリフト": "Rack Deadlift",
  "懸垂": "Pull-Up",
  "チンアップ": "Chin-Up",
  "プルアップ": "Pull-Up",
  "ラットプルダウン": "Lat Pulldown",
  "ケーブルラットプルダウン": "Lat Pulldown",
  "バーベルロウ": "Barbell Row",
  "ベントオーバーロウ": "Barbell Row",
  "ダンベルロウ": "One-Arm Dumbbell Row",
  "ワンアームダンベルロウ": "One-Arm Dumbbell Row",
  "シーテッドケーブルロウ": "Seated Cable Row",
  "Tバーロウ": "T-Bar Row",
  "ケーブルロウ": "Seated Cable Row",
  "ハイプルオーバー": "Hyperextensions",
  "バックエクステンション": "Hyperextensions",
  "グッドモーニング": "Good Morning",
  "シュラッグ": "Barbell Shrug",
  "バーベルシュラッグ": "Barbell Shrug",
  "ダンベルシュラッグ": "Dumbbell Shrug",
  "フェイスプル": "Face Pull",
  "プルオーバー": "Cross-Bench Dumbbell Pullovers",

  // ── 肩 ──────────────────────────────────────────────────────────
  "バーベルショルダープレス": "Barbell Shoulder Press",
  "ミリタリープレス": "Barbell Shoulder Press",
  "ダンベルショルダープレス": "Single-arm dumbbell shoulder press",
  "ショルダープレス": "Barbell Shoulder Press",
  "アーノルドプレス": "Arnold Press",
  "サイドレイズ": "Dumbbell Lateral Raise",
  "ダンベルサイドレイズ": "Dumbbell Lateral Raise",
  "フロントレイズ": "Dumbbell Front Raise",
  "リアレイズ": "Incline Bench Reverse Fly",
  "ケーブルサイドレイズ": "Cable Lateral Raise",
  "アップライトロウ": "Upright Row",
  "バーベルアップライトロウ": "Upright Row",

  // ── 腕（上腕二頭筋） ─────────────────────────────────────────────
  "バーベルカール": "Barbell Curl",
  "ダンベルカール": "Dumbbell Biceps Curl",
  "ハンマーカール": "Hammer Curl",
  "インクラインダンベルカール": "Incline Dumbbell Curl",
  "コンセントレーションカール": "Concentration Curl",
  "ケーブルカール": "Biceps with TRX",
  "プリーチャーカール": "Preacher Curl",
  "EZバーカール": "EZ Bar Curl",
  "リバースカール": "Reverse Curl",

  // ── 腕（上腕三頭筋） ─────────────────────────────────────────────
  "トライセプスプッシュダウン": "Tricep Pushdown on Cable",
  "ケーブルトライセプスプッシュダウン": "Tricep Pushdown on Cable",
  "スカルクラッシャー": "Skull Crusher",
  "ライイングトライセプスエクステンション": "Skull Crusher",
  "トライセプスエクステンション": "Skull Crusher",
  "ナローベンチプレス": "Bench Press Narrow Grip",
  "ケーブルオーバーヘッドトライセプスエクステンション": "Overhead Tricep Extension",
  "オーバーヘッドトライセプスエクステンション": "Overhead Tricep Extension",
  "ダンベルキックバック": "Kneeling kickbacks",
  "トライセプスディップス": "Dips",

  // ── 脚 ──────────────────────────────────────────────────────────
  "バーベルスクワット": "Barbell Full Squat",
  "スクワット": "Barbell Full Squat",
  "フロントスクワット": "Front Squats",
  "ゴブレットスクワット": "Dumbbell Goblet Squat",
  "ダンベルスクワット": "Dumbbell Goblet Squat",
  "ブルガリアンスプリットスクワット": "Bulgarian Squat with Dumbbells",
  "スプリットスクワット": "Smith Machine Split Squat",
  "レッグプレス": "Leg Press",
  "レッグエクステンション": "Leg Extension",
  "レッグカール": "Leg Curl",
  "ライイングレッグカール": "Lying Leg Curl",
  "シーテッドレッグカール": "Seated Leg Curl",
  "ランジ": "Lunge",
  "ダンベルランジ": "Dumbbell Lunge",
  "ウォーキングランジ": "Dumbbell Lunge",
  "ヒップスラスト": "Hip Thrust",
  "バーベルヒップスラスト": "Hip Thrust",
  "カーフレイズ": "Calf Raise",
  "スタンディングカーフレイズ": "Calf Raise",
  "シーテッドカーフレイズ": "Seated Calf Raise",
  "ステップアップ": "Step-ups",
  "ピストルスクワット": "Pistol Squat",
  "ハックスクワット": "Hack Squat",
  "ルーマニアンデッドリフト（片足）": "Kettlebell One Legged Deadlift",
  "シングルレッグデッドリフト": "Single-Leg Deadlift with Dumbbell",

  // ── 腹 ──────────────────────────────────────────────────────────
  "クランチ": "Crunches",
  "シットアップ": "Sit-Up",
  "レッグレイズ": "Leg raises pull up bar",
  "ハンギングレッグレイズ": "Leg raises pull up bar",
  "ニーレイズ": "Knee Raises",
  "プランク": "Plank",
  "サイドプランク": "Side Plank",
  "ロシアンツイスト": "Russian Twist",
  "バイシクルクランチ": "Bicycle Crunch",
  "ケーブルクランチ": "Cable Crunch",
  "アブローラー": "Barbell Ab Rollout",
  "バーベルアブローラー": "Barbell Ab Rollout",
  "デクラインクランチ": "Decline Bench Leg Raise",
  "メディシンボールクランチ": "Medicine ball booklet crunch",

  // ── 複合・その他 ─────────────────────────────────────────────────
  "ケトルベルスイング": "Kettlebell Swing",
  "バーピー": "Burpee",
  "マウンテンクライマー": "Mountain Climber",
  "ハイニー": "High knees",
  "ジャンプスクワット": "Jump Squat",
  "ボックスジャンプ": "Box Jump",
  "ボックススクワット": "Box squat",
  "ハンドスタンドプッシュアップ": "Handstand Push Up",
  "TRXロウ": "TRX Rows",
  "インバーテッドロウ": "TRX Rows",
};

/**
 * 日本語種目名を英語に変換する。
 * 完全一致 → 部分一致（前方）の順で検索。
 */
export function jpToEnExercise(jaName: string): string | null {
  // 完全一致
  if (EXERCISE_JP_TO_EN[jaName]) return EXERCISE_JP_TO_EN[jaName];

  // 括弧・記号を除去して再試行
  const normalized = jaName.replace(/[（(）)【】「」\s]/g, "").trim();
  if (EXERCISE_JP_TO_EN[normalized]) return EXERCISE_JP_TO_EN[normalized];

  // 部分一致（日本語名がマッピングキーを含む場合）
  for (const [jp, en] of Object.entries(EXERCISE_JP_TO_EN)) {
    if (jaName.includes(jp) || jp.includes(jaName)) return en;
  }

  return null;
}
