/**
 * ルールベースのトレーニングメニュー生成エンジン（分割法ベース）
 * 
 * ユーザーのプロフィール（身長・体重・性別・年齢・トレーニング歴・目標・利用可能日数・設備）
 * と選択した鍛えたい部位に基づいて、分割法でトレーニングプランを生成する。
 */

// ===== 型定義 =====

export interface UserProfile {
  height: number; // cm
  weight: number; // kg
  age: number;
  gender: "male" | "female" | "other";
  experienceLevel: "none" | "beginner" | "intermediate" | "advanced";
  goal: "muscle_gain" | "fat_loss" | "strength" | "endurance" | "health";
  availableDaysPerWeek: number; // 1-7
  dailyMinutes?: number; // 1日のトレーニング時間（分）
  equipmentAccess: "home" | "gym" | "both";
  targetMuscles?: string[]; // 鍛えたい部位（例: ["胸", "背中", "脚"])
  intensityLevel?: "low" | "normal" | "high"; // トレーニング強度（デフォルト: normal）
  splitPreference?: "auto" | "full_body" | "body_part" | "ppl"; // 分割法の明示的指定
  oneRepMax?: { squat?: number; deadlift?: number; benchPress?: number }; // BIG3の1RM（kg）
  weekSeed?: number; // 健康維持目標での種目バリエーション用シード
  trainingDays?: string[]; // トレーニングする曜日（例: ["月曜日", "水曜日", "金曜日"]）
}

export interface Exercise {
  name: string;
  muscleGroup: string;
  sets: number;
  reps: string; // "8-12" or "30秒" etc.
  restSeconds: number;
  recommendedWeight?: string; // 推奨重量（例: "40kg"、"自重"、"未設定"）
  notes?: string;
}

// DBから取得する種目重量データ型
export interface ExerciseWeightData {
  exerciseName: string;
  muscleGroup?: string;
  femaleBaseWeight: number | null;
  maleBaseWeight: number | null;
  noneMultiplier: number; // 完全初心者
  beginnerMultiplier: number;
  intermediateMultiplier: number;
  advancedMultiplier: number;
  maleNoneMultiplier: number; // 完全初心者（男性）
  maleBeginnerMultiplier: number;
  maleIntermediateMultiplier: number;
  maleAdvancedMultiplier: number;
  weightRatio: number | null;
  isBodyweight: number;
  difficulty?: string; // カンマ区切り文字列または単一値。例: "beginner" または "beginner,intermediate"
  equipment?: string; // "home" | "gym" | "both"
  equipmentCategory?: string | null; // "dumbbell" | "barbell" | "machine" | "bodyweight" | "other"
}

/**
 * DBの種目データをExerciseTemplate形式に変換する
 * equipmentフィールド: home→["bodyweight","dumbbell"], gym→["barbell","machine","cable"], both→全部
 */
export function dbExerciseToTemplate(ex: ExerciseWeightData): ExerciseTemplate {
  const equipmentStr = ex.equipment ?? "both";
  let equipment: ExerciseTemplate["equipment"];
  if (equipmentStr === "home") {
    equipment = ["bodyweight", "dumbbell"];
  } else if (equipmentStr === "gym") {
    equipment = ["barbell", "machine", "cable"];
  } else {
    equipment = ["bodyweight", "dumbbell", "barbell", "machine", "cable"];
  }
  const difficultyArr = parseDifficulty(ex.difficulty);
  // compound判定: 自重種目またはintermediate/advancedを含む場合は複合種目とみなす
  const compound = ex.isBodyweight === 1 ? true : difficultyArr.some(d => d !== "beginner");
  return {
    name: ex.exerciseName,
    muscleGroup: ex.muscleGroup ?? "",
    equipment,
    difficulty: difficultyArr,
    compound,
  };
}

/**
 * ダンベルの実際に存在する重量リスト
 * 1〜10kg: 1kg刻み、12〜50kg: 2kg刻み
 */
const DUMBBELL_WEIGHTS: number[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  12, 14, 16, 18, 20, 22, 24, 26, 28, 30,
  32, 34, 36, 38, 40, 42, 44, 46, 48, 50,
];

/**
 * バーベルの実際に存在する重量リスト
 * バーベルバー(10kg or 20kg) + プレート(1.25, 2.5, 5, 10, 15, 20, 25kg)の組み合わせ
 * 小型バーベル(10kg基準): 10, 12.5, 15, 17.5, 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100
 * 大型バーベル(20kg基準): 20, 22.5, 25, 27.5, 30, 32.5, 35, 37.5, 40, 42.5, 45, 47.5, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200
 * 実用的な範囲で統合したリスト（最小: 10kg, 刻み: 2.5kg基本、大重量は5kg刻み）
 */
const BARBELL_WEIGHTS: number[] = (() => {
  const weights = new Set<number>();
  const barWeights = [10, 20]; // 小型・大型バーベルバー
  const plates = [1.25, 2.5, 5, 10, 15, 20, 25]; // 片側プレート
  for (const bar of barWeights) {
    weights.add(bar); // バーのみ
    for (const p1 of plates) {
      const w1 = bar + p1 * 2;
      weights.add(w1);
      for (const p2 of plates) {
        const w2 = w1 + p2 * 2;
        if (w2 <= 240) weights.add(w2);
        for (const p3 of plates) {
          const w3 = w2 + p3 * 2;
          if (w3 <= 240) weights.add(w3);
          for (const p4 of plates) {
            const w4 = w3 + p4 * 2;
            if (w4 <= 240) weights.add(w4);
          }
        }
      }
    }
  }
  return Array.from(weights).sort((a, b) => a - b);
})();

/**
 * マシンの重量スタック（TechnoGym Artis / Life Fitness Signature Series 準拠）
 * 種目カテゴリ別に刻み幅が異なる:
 * - 上半身小筋群（アームカール・トライセプス等）: 5kg刻み、最大70kg
 * - 上半身大筋群（チェストプレス・ショルダープレス・ラットプルダウン等）: 5kg刻み、最大100kg
 * - 下半身（レッグプレス・レッグエクステンション・レッグカール等）: 5kg刻み、最大150kg
 * 共通: 2.5kgのハーフプレートで中間値も設定可能
 */
const MACHINE_WEIGHTS: number[] = (() => {
  const weights: number[] = [];
  // 2.5kg刻みで5kgから150kgまで（ハーフプレート対応）
  for (let w = 5; w <= 150; w += 2.5) {
    weights.push(w);
  }
  return weights;
})();

/**
 * 器具カテゴリを種目名・equipmentから判定する
 */
export function detectEquipmentCategory(
  exerciseName: string,
  equipment: string | undefined
): "dumbbell" | "barbell" | "machine" | "bodyweight" | "other" {
  if (!equipment) return "other";
  
  // 自重種目
  const bodweightKeywords = ["腕立て", "プッシュアップ", "懸垂", "チンアップ", "ディップス", "クランチ", "プランク", "バーピー", "マウンテンクライマー", "レッグレイズ", "インバーテッドロウ", "バイシクルクランチ", "ドラゴンフラッグ", "グルートキックバック", "サイドプランク", "スーパーマン"];
  if (bodweightKeywords.some(k => exerciseName.includes(k))) return "bodyweight";
  
  // ダンベル種目のキーワード（マシン判定より先にチェック）
  // 「ダンベルショルダープレス」など「ダンベル」を含む種目はダンベルと判定する
  const dumbbellKeywords = [
    "ダンベル",
    // 肩・三角筋系
    "サイドレイズ", "フロントレイズ", "リアデルトフライ", "リアレイズ",
    "アーノルドプレス",
    // 胸系
    "インクラインフライ", "デクラインフライ", "フライ",
    // 背中系
    "ワンハンドロウ", "コンセントレーションカール",
    // 腕系
    "アームカール", "ハンマーカール", "リバースカール",
    "トライセプスキックバック", "オーバーヘッドトライセプス",
    // 脳系
    "ダンベルランジ", "ダンベルスクワット", "ゴブレットスクワット",
    "ダンベルデッドリフト", "ルーマニアンデッドリフト",
    // 腹筋系
    "サイドベンド",
  ];
  if (dumbbellKeywords.some(k => exerciseName.includes(k))) return "dumbbell";

  // マシン種目のキーワード
  const machineKeywords = ["マシン", "ケーブル", "プーリー", "レッグプレス", "レッグエクステンション", "レッグカール", "ラットプルダウン", "シーテッドロウ", "チェストプレス", "ショルダープレス", "フェイスプル", "ケーブルクロスオーバー", "ケーブルフライ", "アダクション", "アブダクション", "ヒップアブダクション", "ヒップアダクション", "ロータリートルソー", "アブドミナル", "バックエクステンション"];
  if (machineKeywords.some(k => exerciseName.includes(k))) return "machine";
  
  // バーベル種目のキーワード
  const barbellKeywords = ["バーベル", "ベンチプレス", "スクワット", "デッドリフト", "オーバーヘッドプレス", "バーベルロウ", "ベントオーバーロウ", "バーベルカール", "クローズグリップベンチ", "フロントスクワット", "ハックスクワット"];
  if (barbellKeywords.some(k => exerciseName.includes(k))) return "barbell";
  
  return "other";
}

/**
 * 算出した推奨重量を器具別の実際に使用可能な重量に丸める
 * - ダンベル: 最も近い実在重量（片手分）
 * - バーベル: バー＋プレートで実現可能な最も近い重量
 * - マシン: 2.5kg刻みで最も近い重量
 * - 自重・その他: そのまま返す
 */
export function snapToEquipmentWeight(
  rawKg: number,
  equipmentCategory: "dumbbell" | "barbell" | "machine" | "bodyweight" | "other"
): number {
  if (equipmentCategory === "bodyweight") return rawKg;
  // "other"（判定不能）の場合は0.5kg単位で丸めるフォールバック
  if (equipmentCategory === "other") return Math.round(rawKg * 2) / 2;
  
  let candidates: number[];
  if (equipmentCategory === "dumbbell") {
    candidates = DUMBBELL_WEIGHTS;
  } else if (equipmentCategory === "barbell") {
    candidates = BARBELL_WEIGHTS;
  } else {
    candidates = MACHINE_WEIGHTS;
  }
  
  // 最小値以下の場合は最小値を返す
  if (rawKg <= candidates[0]) return candidates[0];
  // 最大値以上の場合は最大値を返す
  if (rawKg >= candidates[candidates.length - 1]) return candidates[candidates.length - 1];
  
  // 最も近い値を二分探索で探す
  let lo = 0, hi = candidates.length - 1;
  while (lo < hi - 1) {
    const mid = Math.floor((lo + hi) / 2);
    if (candidates[mid] <= rawKg) lo = mid;
    else hi = mid;
  }
  // lo と hi が隣接している。どちらが近いか判定
  const diffLo = rawKg - candidates[lo];
  const diffHi = candidates[hi] - rawKg;
  return diffLo <= diffHi ? candidates[lo] : candidates[hi];
}

/**
 * 年齢による推奨重量補正係数を返す
 * 40歳以上から段階的に安全側（低め）の重量を推奨する
 * 根拠: 加齢による筋力低下（40歳以降は10年で約8〜10%低下）を考慮した安全マージン
 */
export function getAgeFactor(age: number): number {
  if (age < 40) return 1.0;       // 39歳以下: 補正なし
  if (age < 50) return 0.95;      // 40〜49歳: 5%減
  if (age < 60) return 0.90;      // 50〜59歳: 10%減
  if (age < 70) return 0.85;      // 60〜69歳: 15%減
  return 0.80;                    // 70歳以上: 20%減
}

/**
 * 体重補正・性別別係数を考慮した推奨重量を計算する
 * 計算式: 推奨重量 = 基礎重量 × 体重補正係数 × トレーニング歴別係数 × 年齢補正係数
 * 体重補正係数 = 1 + (ユーザー体重 ÷ 標準体重 - 1) × weightRatio
 * 年齢補正係数 = 40歳以上から段階的に低下（getAgeFactor参照）
 */
export function calculateRecommendedWeight(
  weightData: ExerciseWeightData,
  profile: UserProfile
): string {
  if (weightData.isBodyweight === 1) return "自重";

  const isMale = profile.gender === "male";
  const baseWeight = isMale ? weightData.maleBaseWeight : weightData.femaleBaseWeight;
  if (baseWeight === null || baseWeight === undefined) return "未設定";

  // トレーニング歴別係数を性別で選択
  const expLevel = profile.experienceLevel;
  let multiplier: number;
  if (isMale) {
    multiplier = expLevel === "none"
      ? (weightData.maleNoneMultiplier ?? 0.4)
      : expLevel === "beginner"
      ? weightData.maleBeginnerMultiplier
      : expLevel === "intermediate"
      ? weightData.maleIntermediateMultiplier
      : weightData.maleAdvancedMultiplier;
  } else {
    multiplier = expLevel === "none"
      ? (weightData.noneMultiplier ?? 0.4)
      : expLevel === "beginner"
      ? weightData.beginnerMultiplier
      : expLevel === "intermediate"
      ? weightData.intermediateMultiplier
      : weightData.advancedMultiplier;
  }

  // 体重補正係数を計算
  const standardWeight = isMale ? 64 : 55;
  const weightRatio = weightData.weightRatio ?? 0.5; // 未設定の場合は0.5をデフォルト
  const weightCorrectionFactor = 1 + (profile.weight / standardWeight - 1) * weightRatio;

  // 年齢補正係数: 40歳以上から段階的に推奨重量を安全側に下げる
  const ageFactor = getAgeFactor(profile.age);

  const recommended = baseWeight * weightCorrectionFactor * multiplier * ageFactor;

  // 器具別重量スナップ: DBの器具種別を優先し、未設定の場合はキーワード判定にフォールバック
  const validCategories = ["dumbbell", "barbell", "machine", "bodyweight", "other"] as const;
  type EquipCat = typeof validCategories[number];
  const dbCat = weightData.equipmentCategory;
  const equipmentCategory: EquipCat = (dbCat && validCategories.includes(dbCat as EquipCat))
    ? (dbCat as EquipCat)
    : detectEquipmentCategory(weightData.exerciseName, weightData.equipment);
  const snapped = snapToEquipmentWeight(recommended, equipmentCategory);

  return `${snapped}kg`;
}

export interface DayMenu {
  dayLabel: string; // "Day 1" etc.
  focus: string; // "胸・三頭筋" etc.
  exercises: Exercise[];
  estimatedDuration: number; // minutes
  isCircuit?: boolean; // 持久力目標時のサーキット形式フラグ
  isHIIT?: boolean; // 脂肪燃焼目標時の高強度インターバルトレーニングフラグ
}

export interface WeeklyMenu {
  days: DayMenu[];
  restDays: string[];
  weeklyVolume: string;
  splitMethod: string; // 分割法の名称（例: "プッシュ・プル・レッグ"）
}

export interface TrainingPlan {
  title: string;
  description: string;
  duration: string;
  phases: PlanPhase[];
  progressionNotes: string[];
}

export interface PlanPhase {
  phaseNumber: number;
  phaseName: string;
  duration: string;
  focus: string;
  weeklyMenu: WeeklyMenu;
  intensityLevel: string;
  progressionRule: string;
}

// ===== エクササイズデータベース =====

interface ExerciseTemplate {
  name: string;
  muscleGroup: string;
  equipment: ("bodyweight" | "dumbbell" | "barbell" | "machine" | "cable")[];
  difficulty: ("none" | "beginner" | "intermediate" | "advanced")[]; // 複数難易度対応
  compound: boolean;
  goalTags?: ("fat_loss" | "strength" | "endurance" | "health")[]; // 目標別優先タグ
}

/**
 * DBのdifficulty文字列（カンマ区切り）を配列に変換する
 */
export function parseDifficulty(difficulty: string | undefined | null): ("none" | "beginner" | "intermediate" | "advanced")[] {
  if (!difficulty) return ["beginner"];
  const valid = ["none", "beginner", "intermediate", "advanced"] as const;
  const parts = difficulty.split(",").map(s => s.trim()) as ("none" | "beginner" | "intermediate" | "advanced")[];
  const filtered = parts.filter(p => (valid as readonly string[]).includes(p));
  return filtered.length > 0 ? filtered : ["beginner"];
}

const EXERCISE_DB: ExerciseTemplate[] = [
  // 胸
  { name: "ベンチプレス", muscleGroup: "胸", equipment: ["barbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: true, goalTags: ["strength"] },
  { name: "ダンベルプレス", muscleGroup: "胸", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: true },
  { name: "腕立て伏せ", muscleGroup: "胸", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate"], compound: true },
  { name: "インクラインダンベルプレス", muscleGroup: "胸", equipment: ["dumbbell"], difficulty: ["intermediate", "advanced"], compound: true },
  { name: "ダンベルフライ", muscleGroup: "胸", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate"], compound: false },
  { name: "ケーブルクロスオーバー", muscleGroup: "胸", equipment: ["cable"], difficulty: ["intermediate", "advanced"], compound: false },
  { name: "チェストプレスマシン", muscleGroup: "胸", equipment: ["machine"], difficulty: ["beginner", "intermediate"], compound: true },
  { name: "ディップス", muscleGroup: "胸", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: true },
  { name: "インクラインベンチプレス", muscleGroup: "胸", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: true },
  { name: "ワイドプッシュアップ", muscleGroup: "胸", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate"], compound: true },
  { name: "デクラインプッシュアップ", muscleGroup: "胸", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: true },

  // 背中
  { name: "デッドリフト", muscleGroup: "背中", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["strength"] },
  { name: "懸垂", muscleGroup: "背中", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: true },
  { name: "ラットプルダウン", muscleGroup: "背中", equipment: ["machine", "cable"], difficulty: ["beginner", "intermediate", "advanced"], compound: true },
  { name: "ベントオーバーロウ", muscleGroup: "背中", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: true },
  { name: "ダンベルロウ", muscleGroup: "背中", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate"], compound: true },
  { name: "シーテッドロウ", muscleGroup: "背中", equipment: ["machine", "cable"], difficulty: ["beginner", "intermediate"], compound: true },
  { name: "フェイスプル", muscleGroup: "背中", equipment: ["cable"], difficulty: ["beginner", "intermediate"], compound: false },
  { name: "チンアップ", muscleGroup: "背中", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: true },
  { name: "ダンベルシュラッグ", muscleGroup: "背中", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "バーベルシュラッグ", muscleGroup: "背中", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: false },
  { name: "インバーテッドロウ", muscleGroup: "背中", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate"], compound: true },

  // 肩
  { name: "オーバーヘッドプレス", muscleGroup: "肩", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: true },
  { name: "ダンベルショルダープレス", muscleGroup: "肩", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: true },
  { name: "サイドレイズ", muscleGroup: "肩", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "フロントレイズ", muscleGroup: "肩", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate"], compound: false },
  { name: "リアデルトフライ", muscleGroup: "肩", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "アーノルドプレス", muscleGroup: "肩", equipment: ["dumbbell"], difficulty: ["intermediate", "advanced"], compound: true },
  { name: "アップライトロウ", muscleGroup: "肩", equipment: ["barbell", "dumbbell", "cable"], difficulty: ["beginner", "intermediate"], compound: false },
  { name: "ケーブルサイドレイズ", muscleGroup: "肩", equipment: ["cable"], difficulty: ["intermediate", "advanced"], compound: false },

  // 腕（二頭筋）
  { name: "バーベルカール", muscleGroup: "二頭筋", equipment: ["barbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "ダンベルカール", muscleGroup: "二頭筋", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "ハンマーカール", muscleGroup: "二頭筋", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "インクラインカール", muscleGroup: "二頭筋", equipment: ["dumbbell"], difficulty: ["intermediate", "advanced"], compound: false },

  // 腕（三頭筋）
  { name: "トライセプスプッシュダウン", muscleGroup: "三頭筋", equipment: ["cable"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "スカルクラッシャー", muscleGroup: "三頭筋", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: false },
  { name: "ダンベルキックバック", muscleGroup: "三頭筋", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate"], compound: false },
  { name: "ナロープッシュアップ", muscleGroup: "三頭筋", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate"], compound: true },
  { name: "オーバーヘッドトライセプスエクステンション", muscleGroup: "三頭筋", equipment: ["dumbbell"], difficulty: ["intermediate", "advanced"], compound: false },

  // 脚
  { name: "バーベルスクワット", muscleGroup: "脚", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["strength"] },
  { name: "レッグプレス", muscleGroup: "脚", equipment: ["machine"], difficulty: ["beginner", "intermediate", "advanced"], compound: true },
  { name: "ブルガリアンスプリットスクワット", muscleGroup: "脚", equipment: ["dumbbell", "bodyweight"], difficulty: ["intermediate", "advanced"], compound: true },
  { name: "レッグエクステンション", muscleGroup: "脚", equipment: ["machine"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "レッグカール", muscleGroup: "脚", equipment: ["machine"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "ゴブレットスクワット", muscleGroup: "脚", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate"], compound: true },
  { name: "ランジ", muscleGroup: "脚", equipment: ["bodyweight", "dumbbell"], difficulty: ["beginner", "intermediate"], compound: true },
  { name: "カーフレイズ", muscleGroup: "脚", equipment: ["bodyweight", "machine"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "ルーマニアンデッドリフト", muscleGroup: "脚", equipment: ["barbell", "dumbbell"], difficulty: ["intermediate", "advanced"], compound: true },
  { name: "ヒップスラスト", muscleGroup: "脚", equipment: ["bodyweight", "barbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "スモウスクワット", muscleGroup: "脚", equipment: ["bodyweight", "dumbbell"], difficulty: ["beginner", "intermediate"], compound: true },
  { name: "グルートキックバック", muscleGroup: "脚", equipment: ["bodyweight", "cable"], difficulty: ["beginner", "intermediate"], compound: false },
  { name: "ヒップアブダクション", muscleGroup: "脚", equipment: ["machine", "bodyweight"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },

  // 腹筋
  { name: "プランク", muscleGroup: "腹筋", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "クランチ", muscleGroup: "腹筋", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate"], compound: false },
  { name: "レッグレイズ", muscleGroup: "腹筋", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: false },
  { name: "ロシアンツイスト", muscleGroup: "腹筋", equipment: ["bodyweight", "dumbbell"], difficulty: ["beginner", "intermediate"], compound: false },
  { name: "アブローラー", muscleGroup: "腹筋", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: false },
  { name: "ケーブルクランチ", muscleGroup: "腹筋", equipment: ["cable"], difficulty: ["intermediate", "advanced"], compound: false },
  { name: "サイドプランク", muscleGroup: "腹筋", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate", "advanced"], compound: false },
  { name: "バイシクルクランチ", muscleGroup: "腹筋", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate"], compound: false },
  { name: "ドラゴンフラッグ", muscleGroup: "腹筋", equipment: ["bodyweight"], difficulty: ["advanced"], compound: false },
  { name: "ハンギングレッグレイズ", muscleGroup: "腹筋", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: false },

  // ===== 脂肪燃焼（fat_loss）専用種目 =====
  // 高強度インターバル・全身有酸素種目。部位分割ではなく全身を使う動作パターン。
  { name: "バーピー", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "マウンテンクライマー", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "ジャンピングジャック", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["fat_loss"] },
  { name: "ハイニー", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["fat_loss"] },
  { name: "ジャンプスクワット", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "スケータージャンプ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "ボックスジャンプ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "ケトルベルスイング", muscleGroup: "全身", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "バトルロープ", muscleGroup: "全身", equipment: ["machine"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "スプリントダッシュ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "バーピープッシュアップ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "ジャンプランジ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "プランクジャンプ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "ダンベルスナッチ", muscleGroup: "全身", equipment: ["dumbbell"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "ロープジャンプ（縄跳び）", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["fat_loss"] },
  { name: "ステップアップ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["fat_loss"] },
  { name: "ダンベルスラスター", muscleGroup: "全身", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },
  { name: "インチワーム", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["fat_loss"] },
  { name: "ベアクロール", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate"], compound: true, goalTags: ["fat_loss"] },
  { name: "ニータックジャンプ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["fat_loss"] },

  // ===== 持久力向上（endurance）専用種目 =====
  // サーキット形式・有酸素持久系。低〜中強度で長時間継続できる動作パターン。
  { name: "ジョギングその場足踏み", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "ウォーキングランジ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "ステッパー（踏み台昇降）", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "マウンテンクライマー（スロー）", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "バーピー（ジャンプなし）", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "ハイニー（スロー）", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "エアロビクスステップ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "ダンベルウォーキングランジ", muscleGroup: "全身", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate", "advanced"], compound: true, goalTags: ["endurance"] },
  { name: "ローイングマシン", muscleGroup: "全身", equipment: ["machine"], difficulty: ["beginner", "intermediate", "advanced"], compound: true, goalTags: ["endurance"] },
  { name: "バイクエルゴメーター", muscleGroup: "全身", equipment: ["machine"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "トレッドミルウォーク", muscleGroup: "全身", equipment: ["machine"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "クロストレーナー", muscleGroup: "全身", equipment: ["machine"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "ジャンピングジャック（持久）", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "スーパーマン（体幹伸展）", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: false, goalTags: ["endurance"] },
  { name: "ケトルベルスイング（軽量）", muscleGroup: "全身", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate"], compound: true, goalTags: ["endurance"] },
  { name: "シャドーボクシング", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["endurance"] },

  // ===== 筋力向上・BIG3優先 =====
  { name: "フロントスクワット", muscleGroup: "脚", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["strength"] },
  { name: "スモウデッドリフト", muscleGroup: "背中", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["strength"] },
  { name: "クローズグリップベンチプレス", muscleGroup: "三頭筋", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: true, goalTags: ["strength"] },
  { name: "パワークリーン", muscleGroup: "全身", equipment: ["barbell"], difficulty: ["advanced"], compound: true, goalTags: ["strength"] },

  // ===== 健康維持（health）専用種目 =====
  // ストレッチ・モビリティ・軽い全身運動。柔軟性・姿勢改善・日常動作の質向上を目的とする。
  { name: "ワールドグレイテストストレッチ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["health"] },
  { name: "ジャンピングジャック（ウォームアップ）", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner"], compound: true, goalTags: ["health"] },
  { name: "ウォーキングランジ（健康）", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["health"] },
  { name: "キャットカウ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: false, goalTags: ["health"] },
  { name: "チャイルドポーズ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: false, goalTags: ["health"] },
  { name: "ヒップフレクサーストレッチ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: false, goalTags: ["health"] },
  { name: "胸椎回旋ストレッチ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: false, goalTags: ["health"] },
  { name: "バードドッグ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: false, goalTags: ["health"] },
  { name: "グルートブリッジ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: false, goalTags: ["health"] },
  { name: "ヒップヒンジ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["health"] },
  { name: "スタンディングサイドベンド", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner"], compound: false, goalTags: ["health"] },
  { name: "ショルダーロール", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner"], compound: false, goalTags: ["health"] },
  { name: "ネックストレッチ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner"], compound: false, goalTags: ["health"] },
  { name: "スパイダーマンストレッチ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["health"] },
  { name: "ピジョンポーズ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: false, goalTags: ["health"] },
  { name: "ダウンドッグ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["health"] },
  { name: "コブラポーズ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner"], compound: false, goalTags: ["health"] },
  { name: "ウォールエンジェル", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: false, goalTags: ["health"] },
  { name: "ハムストリングストレッチ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner"], compound: false, goalTags: ["health"] },
  { name: "腸腰筋ストレッチ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner"], compound: false, goalTags: ["health"] },
  { name: "ゆっくりスクワット", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: true, goalTags: ["health"] },
  { name: "肩甲骨ストレッチ", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner"], compound: false, goalTags: ["health"] },
  { name: "体幹ツイスト", muscleGroup: "全身", equipment: ["bodyweight"], difficulty: ["none", "beginner", "intermediate"], compound: false, goalTags: ["health"] },
];

// ===== ヘルパー関数 =====

function getAvailableEquipment(access: UserProfile["equipmentAccess"]): string[] {
  switch (access) {
    case "home":
      return ["bodyweight", "dumbbell"];
    case "gym":
      return ["bodyweight", "dumbbell", "barbell", "machine", "cable"];
    case "both":
      return ["bodyweight", "dumbbell", "barbell", "machine", "cable"];
  }
}

function getEffectiveLevel(level: UserProfile["experienceLevel"]): "beginner" | "intermediate" | "advanced" {
  return level === "none" ? "beginner" : level;
}

export function filterExercises(
  muscleGroup: string,
  profile: UserProfile,
  dbExercises?: ExerciseTemplate[]
): ExerciseTemplate[] {
  const availableEquipment = getAvailableEquipment(profile.equipmentAccess);
  const difficultyMap: Record<string, number> = { none: 0, beginner: 1, intermediate: 2, advanced: 3 };
  // noneは完全初心者層。none指定の種目がない場合は初心者層も表示する（フォールバックは初心者レベルまで）
  const rawLevel = difficultyMap[profile.experienceLevel] ?? 1;
  const userLevel = profile.experienceLevel === "none" ? 1 : rawLevel; // noneは初心者以下の種目を利用可能

  // DBに登録された種目があればそちらを優先、なければハードコードのデフォルトを使用
  const sourceDB = dbExercises && dbExercises.length > 0 ? dbExercises : EXERCISE_DB;

  return sourceDB.filter((ex) => {
    if (ex.muscleGroup !== muscleGroup) return false;
    // 複数難易度対応: 種目の難易度配列のうち少なくとㅨ1つがユーザーレベル以下なら表示対象
    const exLevels = Array.isArray(ex.difficulty) ? ex.difficulty : [ex.difficulty];
    const hasMatchingLevel = exLevels.some(d => difficultyMap[d] <= userLevel);
    if (!hasMatchingLevel) return false;
    // 自重種目（bodyweightのみ）は設備不問で使用可能→ 設備チェックをスキップ
    if (ex.equipment.length === 1 && ex.equipment[0] === "bodyweight") return true;
    if (!ex.equipment.some((eq) => availableEquipment.includes(eq))) return false;
    return true;
  });
}

function selectExercises(
  muscleGroup: string,
  count: number,
  profile: UserProfile,
  dbExercises?: ExerciseTemplate[],
  weekSeed?: number,
  excludedExercises?: string[]
): ExerciseTemplate[] {
  const excludedSet = new Set(excludedExercises ?? []);
  const available = filterExercises(muscleGroup, profile, dbExercises)
    .filter((ex) => !excludedSet.has(ex.name));
  const goal = profile.goal;

  // 目標別優先度でソート
  // goalTagsに現在の目標が含まれる種目を優先、その後に通常の種目
  const goalTagged = available.filter((e) => e.goalTags?.includes(goal as "fat_loss" | "strength" | "endurance" | "health"));
  const untagged = available.filter((e) => !e.goalTags?.includes(goal as "fat_loss" | "strength" | "endurance" | "health"));

  // 健康維持目標: weekSeedを使って種目をシャッフル（週ごとに異なる種目）
  if (goal === "health" && weekSeed !== undefined) {
    const shuffle = <T>(arr: T[], seed: number): T[] => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = (seed * 1664525 + 1013904223 + i) % (i + 1);
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const shuffledTagged = shuffle(goalTagged, weekSeed);
    const shuffledUntagged = shuffle(untagged, weekSeed + 1);
    const selected: ExerciseTemplate[] = [];
    for (const ex of [...shuffledTagged, ...shuffledUntagged]) {
      if (selected.length >= count) break;
      selected.push(ex);
    }
    return selected;
  }

  // 筋力向上: BIG3を必ず先頭に配置
  if (goal === "strength") {
    const big3Names = ["ベンチプレス", "デッドリフト", "バーベルスクワット"];
    const big3 = goalTagged.filter((e) => big3Names.includes(e.name));
    const otherTagged = goalTagged.filter((e) => !big3Names.includes(e.name));
    const compounds = untagged.filter((e) => e.compound);
    const isolations = untagged.filter((e) => !e.compound);
    const selected: ExerciseTemplate[] = [];
    for (const ex of [...big3, ...otherTagged, ...compounds, ...isolations]) {
      if (selected.length >= count) break;
      selected.push(ex);
    }
    return selected;
  }

  // 脂肪燃焼・持久力・健康維持: goalTagged種目を優先。
  // goalTaggedが十分にあればgoalTaggedのみで埋める。
  // goalTaggedが不足する場合のみ通常種目（compound優先）で補充する。
  const compounds = untagged.filter((e) => e.compound);
  const isolations = untagged.filter((e) => !e.compound);
  const selected: ExerciseTemplate[] = [];
  // goalTaggedを優先で埋める（最低でも全体の50%以上を目指す）
  const minGoalTagged = Math.ceil(count * 0.5);
  const goalTaggedToUse = goalTagged.slice(0, Math.max(minGoalTagged, goalTagged.length));
  for (const ex of goalTaggedToUse) {
    if (selected.length >= count) break;
    selected.push(ex);
  }
  // 不足分を通常種目で補充
  for (const ex of [...compounds, ...isolations]) {
    if (selected.length >= count) break;
    selected.push(ex);
  }
  return selected;
}

function getSetsAndReps(
  profile: UserProfile,
  isCompound: boolean
): { sets: number; reps: string; restSeconds: number } {
  const { goal } = profile;
  const experienceLevel = getEffectiveLevel(profile.experienceLevel);
  const intensity = profile.intensityLevel ?? "normal";

  // ===== ゴール別の基本セット/レップ/休憩を決定 =====
  let base: { sets: number; reps: string; restSeconds: number };

  if (goal === "strength") {
    base = {
      sets: experienceLevel === "beginner" ? 3 : experienceLevel === "intermediate" ? 4 : 5,
      reps: isCompound ? "3-5" : "6-8",
      restSeconds: isCompound ? 180 : 120,
    };
  } else if (goal === "muscle_gain") {
    base = {
      sets: experienceLevel === "beginner" ? 3 : 4,
      reps: isCompound ? "6-10" : "8-12",
      restSeconds: isCompound ? 120 : 90,
    };
  } else if (goal === "fat_loss") {
    base = {
      sets: 3,
      reps: isCompound ? "10-15" : "12-15",
      restSeconds: 60,
    };
  } else if (goal === "endurance") {
    base = {
      sets: 3,
      reps: isCompound ? "12-20" : "15-20",
      restSeconds: 45,
    };
  } else {
    // health
    base = {
      sets: experienceLevel === "beginner" ? 2 : 3,
      reps: "10-12",
      restSeconds: 90,
    };
  }

  // ===== 強度レベルによる補正 =====
  // low（低強度）: セット-1（最小2）、レップ数を高く、休憩を短く
  // normal（標準）: そのまま
  // high（高強度）: セット+1、レップ数を低く（より重い重量を想定）、休憩を長く
  if (intensity === "low") {
    return {
      sets: Math.max(base.sets - 1, 2),
      reps: applyRepAdjustment(base.reps, "low"),
      restSeconds: Math.max(Math.round(base.restSeconds * 0.7), 30),
    };
  }
  if (intensity === "high") {
    return {
      sets: base.sets + 1,
      reps: applyRepAdjustment(base.reps, "high"),
      restSeconds: Math.round(base.restSeconds * 1.3),
    };
  }
  // normal
  return base;
}

/**
 * レップ数文字列を強度に応じて調整する
 *
 * low（低強度）: 上限を最大15回にクランプしつつ上方向にシフト
 *   例: "8-12" → "12-15"、"12-20" → "13-15"、"3-5" → "5-7"
 *
 * high（高強度）: 8〜12回の範囲に収める
 *   例: "8-12" → "6-8"、"12-20" → "8-10"、"3-5" → "3-5"（そのまま）
 */
function applyRepAdjustment(
  reps: string,
  direction: "low" | "high"
): string {
  // 「X秒」形式はそのまま返す
  if (reps.includes("秒")) return reps;

  // "X-Y" 形式をパース
  const match = reps.match(/^(\d+)-(\d+)$/);
  if (!match) return reps;

  const lo = parseInt(match[1]);
  const hi = parseInt(match[2]);
  const range = hi - lo;

  if (direction === "low") {
    // 上方向にシフトし、上限は15回にクランプ
    const LOW_MAX = 15;
    const shiftedLo = hi;
    const shiftedHi = hi + range;
    const clampedHi = Math.min(shiftedHi, LOW_MAX);
    // 下限も上限を超えないよう調整
    const clampedLo = Math.min(shiftedLo, clampedHi - 1);
    return `${clampedLo}-${clampedHi}`;
  } else {
    // 高強度: 8〜12回の範囲に収める
    // ただし元々が低レップ（例: "3-5"）の場合はそのまま維持
    const HIGH_MIN = 8;
    const HIGH_MAX = 12;
    if (hi <= HIGH_MIN) {
      // 元々8回以下の場合（strength系）: 下方向にシフトのみ
      const newLo = Math.max(lo - range, 1);
      const newHi = Math.max(lo - 1, newLo + 1);
      return `${newLo}-${newHi}`;
    }
    // 8〜12回の範囲にクランプ
    const clampedHi = Math.min(hi, HIGH_MAX);
    const clampedLo = Math.max(Math.min(lo, clampedHi - 1), HIGH_MIN);
    return `${clampedLo}-${clampedHi}`;
  }
}

export function buildExercise(
  template: ExerciseTemplate,
  profile: UserProfile,
  weightMap?: Map<string, ExerciseWeightData>
): Exercise {
  const { sets, reps, restSeconds } = getSetsAndReps(profile, template.compound);
  let recommendedWeight: string | undefined;

  // strength目標かつoneRepMaxが設定されている場合、%1RMで重量を計算
  if (profile.goal === "strength" && profile.oneRepMax) {
    const orm = profile.oneRepMax;
    const big3Map: Record<string, number | undefined> = {
      "ベンチプレス": orm.benchPress,
      "デッドリフト": orm.deadlift,
      "バーベルスクワット": orm.squat,
      "フロントスクワット": orm.squat,
      "スモウデッドリフト": orm.deadlift,
    };
    const base1RM = big3Map[template.name];
    if (base1RM && base1RM > 0) {
      // レップ数に応じた%1RM: 3-5rep=85-90%, 6-8rep=75-80%
      const repRange = reps.split("-");
      const maxRep = parseInt(repRange[repRange.length - 1]) || 5;
      const pct = maxRep <= 5 ? 0.875 : 0.775;
      const weight = Math.round(base1RM * pct / 2.5) * 2.5;
      recommendedWeight = `${weight}kg`;
    }
  }

  if (!recommendedWeight && weightMap) {
    const weightData = weightMap.get(template.name);
    if (weightData) {
      recommendedWeight = calculateRecommendedWeight(weightData, profile);
    }
  }
  return {
    name: template.name,
    muscleGroup: template.muscleGroup,
    sets,
    reps,
    restSeconds,
    ...(recommendedWeight !== undefined ? { recommendedWeight } : {}),
  };
}

// ===== 分割法ロジック（ユーザー選択部位ベース） =====

const ALL_MUSCLE_GROUPS = ["胸", "背中", "肩", "脚", "腹筋", "二頭筋", "三頭筋"];

// シナジー（相乗効果）のあるグループをまとめる（循環参照なし・一方向のみ）
const SYNERGY_MAP: Record<string, string[]> = {
  "胸": ["三頭筋"],   // プッシュ系: 胸の日に三頭筋を添える
  "背中": ["二頭筋"], // プル系: 背中の日に二頭筋を添える
  "肩": [],           // 肩は単独
  "脚": ["腹筋"],     // 下半身＋体幹
  "腹筋": [],         // 腹筋は単独（脚の日に追加済み）
  "二頭筋": [],       // 単独（背中の日に追加済み）
  "三頭筋": [],       // 単独（胸の日に追加済み）
};

interface SplitDay {
  focus: string;
  muscleGroups: string[];
}

/**
 * PPL法（プッシュ・プル・レッグ）の分割を構築する。
 * プッシュ: 胸・肩・三頭筋（押す動作）
 * プル: 背中・二頭筋（引く動作）
 * レッグ: 脚・腹筋（下半身）
 * 週日数に応じてPPLサイクルを繰り返す。
 */
export function buildPPLSplit(
  targetMuscles: string[],
  daysPerWeek: number
): { days: SplitDay[]; splitMethod: string } {
  const PPL_PUSH = ["胸", "肩", "三頭筋"];
  const PPL_PULL = ["背中", "二頭筋"];
  const PPL_LEG  = ["脚", "腹筋"];

  // ユーザーが部位を選択している場合、各カテゴリに含まれる部位のみ使用
  // 選択していない場合はデフォルトの全部位を使用
  const hasSelection = targetMuscles.length > 0;
  const push = hasSelection ? PPL_PUSH.filter(m => targetMuscles.includes(m)) : PPL_PUSH;
  const pull = hasSelection ? PPL_PULL.filter(m => targetMuscles.includes(m)) : PPL_PULL;
  const leg  = hasSelection ? PPL_LEG.filter(m => targetMuscles.includes(m))  : PPL_LEG;

  // 各カテゴリが空の場合はデフォルトにフォールバック
  const pushGroups = push.length > 0 ? push : PPL_PUSH;
  const pullGroups = pull.length > 0 ? pull : PPL_PULL;
  const legGroups  = leg.length  > 0 ? leg  : PPL_LEG;

  const pushDay: SplitDay = { focus: "プッシュ（" + pushGroups.join("・") + "）", muscleGroups: pushGroups };
  const pullDay: SplitDay = { focus: "プル（"  + pullGroups.join("・") + "）", muscleGroups: pullGroups };
  const legDay:  SplitDay = { focus: "レッグ（"  + legGroups.join("・")  + "）", muscleGroups: legGroups };

  const cycle = [pushDay, pullDay, legDay];
  const days: SplitDay[] = Array.from({ length: daysPerWeek }, (_, i) => cycle[i % 3]);

  return { days, splitMethod: "PPL法" };
}

/**
 * ユーザーが選択した部位に基づいて「全身法」か「部位分割法」を決定する。
 * - 全身法: 各トレーニング日に全部位を行う（週1〜3日、または部位が少ない場合）
 * - 部位分割法: 各日に特定の部位を割り当てる（週3日以上かつ部位が十分な場合）
 */
export function buildSplitFromTargets(
  targetMuscles: string[],
  daysPerWeek: number,
  splitPreference?: "auto" | "full_body" | "body_part" | "ppl"
): { days: SplitDay[]; splitMethod: string } {
  // 明示的にPPL法が指定された場合
  if (splitPreference === "ppl") {
    return buildPPLSplit(targetMuscles, daysPerWeek);
  }

  const hasUserSelection = targetMuscles.length > 0;

  // 対象部位を決定（未選択の場合は全主要部位）
  const targets = hasUserSelection
    ? targetMuscles
    : ["胸", "背中", "肩", "脚"];

  // シナジー補助部位の追加は「部位未選択」の場合のみ行う。
  // ユーザーが明示的に選択した場合は選択内容を完全に尊重する。
  const allGroups = new Set<string>(targets);
  if (!hasUserSelection) {
    for (const t of targets) {
      const synergies = SYNERGY_MAP[t] || [];
      for (const s of synergies) {
        allGroups.add(s);
      }
    }
    // 部位未選択の場合のみ腹筋を常に含める
    allGroups.add("腹筋");
  }
  const groupList = Array.from(allGroups);

  // 明示的に全身法が指定された場合
  if (splitPreference === "full_body") {
    return {
      days: Array.from({ length: daysPerWeek }, () => ({ focus: "全身", muscleGroups: groupList })),
      splitMethod: "全身法",
    };
  }

  // 明示的に部位分割法が指定された場合
  if (splitPreference === "body_part") {
    return buildBodyPartSplit(targets, groupList, daysPerWeek);
  }

  // 全身法: 週１〜２日、または部位未選択で部位数が少ない場合
  // ユーザーが明示的に選択した場合は日数のみで判定する（選択部位数にかかわらず分割法を尊重）
  const useFullBody = hasUserSelection
    ? daysPerWeek <= 2
    : daysPerWeek <= 2 || groupList.length <= 3;
  if (useFullBody) {
    return {
      days: Array.from({ length: daysPerWeek }, () => ({
        focus: "全身",
        muscleGroups: groupList,
      })),
      splitMethod: "全身法",
    };
  }

  // 部位分割法: 各日に部位を割り当てる
  return buildBodyPartSplit(targets, groupList, daysPerWeek);
}

/**
 * 部位分割法: ユーザーが選択した部位をトレーニング日数に応じて分配する。
 * シナジーのある部位（例: 胸と三頭筋）を同じ日にまとめる。
 */
function buildBodyPartSplit(
  targets: string[],
  allGroups: string[],
  daysPerWeek: number
): { days: SplitDay[]; splitMethod: string } {
  const days: SplitDay[] = [];
  const assigned = new Set<string>();

  // ターゲット部位を優先的に各日に割り当てる。
  // シナジー部位は allGroups（ユーザーが選択した部位のみ）に含まれる場合のみ添える。
  for (const target of targets) {
    if (assigned.has(target)) continue;
    if (days.length >= daysPerWeek) break;
    const groups = [target];
    assigned.add(target);
    // シナジー部位を追加（allGroupsに含まれ、まだ割り当てられていないもののみ）
    const synergies = (SYNERGY_MAP[target] || []).filter(
      (s) => allGroups.includes(s) && !assigned.has(s)
    );
    for (const s of synergies) {
      groups.push(s);
      assigned.add(s);
    }
    days.push({ focus: groups.join("・"), muscleGroups: groups });
  }

  // 未割り当ての部位を既存の日に追加
  for (const g of allGroups) {
    if (!assigned.has(g)) {
      if (days.length < daysPerWeek) {
        // 新しい日を作る
        days.push({ focus: g, muscleGroups: [g] });
      } else {
        // 最も部位数が少ない日に追加
        const bestDay = days.reduce((best, day, i) =>
          day.muscleGroups.length < days[best].muscleGroups.length ? i : best, 0);
        days[bestDay].muscleGroups.push(g);
        days[bestDay].focus = days[bestDay].muscleGroups.join("・");
      }
      assigned.add(g);
    }
  }

  // 日数が足りない場合は全身日で補完
  while (days.length < daysPerWeek) {
    days.push({ focus: "全身", muscleGroups: [...allGroups] });
  }

  return {
    days: days.slice(0, daysPerWeek),
    splitMethod: "部位分割法",
  };
}

function getExerciseCountPerGroup(
  profile: UserProfile,
  totalGroupsInDay: number,
  isTargetGroup: boolean
): number {
  const experienceLevel = getEffectiveLevel(profile.experienceLevel);

  if (totalGroupsInDay >= 5) {
    // 全身の場合は各1-2種目
    const base = experienceLevel === "beginner" ? 1 : 2;
    return isTargetGroup ? Math.min(base + 1, 3) : base;
  }

  if (totalGroupsInDay >= 3) {
    const base = experienceLevel === "beginner" ? 2 : 3;
    return isTargetGroup ? Math.min(base + 1, 4) : base;
  }

  // 1-2部位の日（初心者は1部位あたり2-3種目に抑える）
  const base = experienceLevel === "beginner" ? 2 : experienceLevel === "intermediate" ? 3 : 4;
  return isTargetGroup ? Math.min(base + 1, 5) : base;
}

// ===== メイン生成関数 =====

/**
 * dailyMinutesに基づく最大種目数を返す
 * 1種目あたりの平均時間: セット数×（レップ時間 + 休憩時間）
 */
function getMaxExercisesByTime(dailyMinutes: number | undefined, avgMinutesPerExercise: number): number {
  if (!dailyMinutes || dailyMinutes <= 0) return Infinity;
  // ウォームアップ・クールダウンに5分割り当てる
  const availableMinutes = Math.max(dailyMinutes - 5, 5);
  return Math.max(Math.floor(availableMinutes / avgMinutesPerExercise), 1);
}

export function generateWeeklyMenu(profile: UserProfile, weightMap?: Map<string, ExerciseWeightData>, dbExercises?: ExerciseTemplate[], excludedExercises?: string[]): WeeklyMenu {
  // fat_loss / endurance / health は部位分割ではなく全身法を強制する。
  // これらの目標では有酸素・全身種目を優先するため、targetMusclesは無視して全身プールを使用する。
  const FULL_BODY_GOALS: UserProfile["goal"][] = ["fat_loss", "endurance", "health"];
  const isFullBodyGoal = FULL_BODY_GOALS.includes(profile.goal);

  // 全身法目標（fat_loss/endurance/health）の場合、DBの種目リストにEXERCISE_DBの有酸素・全身種目を
  // 必ずマージする。DBの種目にはgoalTagsが付与されていないため、有酸素種目が選ばれない問題を解決する。
  let effectiveDbExercises = dbExercises;
  if (isFullBodyGoal && dbExercises) {
    // EXERCISE_DBからgoalTagsが付いた全身法向け種目を抽出
    const goalSpecificExercises = EXERCISE_DB.filter(
      (ex) => ex.goalTags && ex.goalTags.some((t) => (FULL_BODY_GOALS as string[]).includes(t))
    );
    // DBにない種目名のみ追加（重複防止）
    const dbNames = new Set(dbExercises.map((e) => e.name));
    const toAdd = goalSpecificExercises.filter((ex) => !dbNames.has(ex.name));
    effectiveDbExercises = [...dbExercises, ...toAdd];
  }

  // 除外種目フィルター
  if (excludedExercises && excludedExercises.length > 0) {
    const excludedSet = new Set(excludedExercises);
    if (effectiveDbExercises) {
      effectiveDbExercises = effectiveDbExercises.filter((ex) => !excludedSet.has(ex.name));
    }
  }

  const targets = isFullBodyGoal
    ? [] // 全身法強制のため部位選択を無視
    : (profile.targetMuscles && profile.targetMuscles.length > 0 ? profile.targetMuscles : []);

  // 全身法目標の場合は splitPreference を full_body に上書き
  const effectiveSplitPreference = isFullBodyGoal ? "full_body" : profile.splitPreference;

  const { days: splitDays, splitMethod } = buildSplitFromTargets(targets, profile.availableDaysPerWeek, effectiveSplitPreference);
  const ALL_WEEK_DAYS = ["月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日", "日曜日"];
  // trainingDays が指定されていれば優先、なければ月曜始まりの連続日
  const trainingDayLabels = (profile.trainingDays && profile.trainingDays.length >= profile.availableDaysPerWeek)
    ? profile.trainingDays.slice(0, profile.availableDaysPerWeek)
    : ALL_WEEK_DAYS.slice(0, profile.availableDaysPerWeek);

  const isNone = profile.experienceLevel === "none";

  // 1種目あたりの平均時間（分）を推定（メインセットのみ）
  // セット間休憩・種目間移動を含めと1種目あたり絉13分が目安
  // 例: 60分 → (60-5)＇13 = 4種目、邐分 → (90-5)＇13 = 6種目
  const avgMinutesPerExercise = 13;
  const baseMaxExercises = getMaxExercisesByTime(profile.dailyMinutes, avgMinutesPerExercise);
  // 完全初心者（none）は種目数を通常より少なく設定する
  // 時間設定あり: 通常より1種目少なく（最小1）、時間設定なし: 上限厀3種目
  const maxExercises = isNone
    ? (profile.dailyMinutes ? Math.max(baseMaxExercises - 1, 1) : 3)
    : baseMaxExercises;

  // 全身の日の絶対上限（時間設定の有無にかかわらず）
  const FULL_BODY_MAX = isNone ? 4 : 6;
  // 全身法かどうかは分割法名で判定（部位数にかかわらず全日程に適用）
  const isFullBodySplit = splitMethod === "全身法";

  const days: DayMenu[] = splitDays.map((day, index) => {
    const exercises: Exercise[] = [];
    // 全身法の日程、または部位分割法でも「全身」とラベルされた日は上限を適用
    const isFullBodyDay = isFullBodySplit || day.focus === "全身";
    const dayMax = isFullBodyDay
      ? Math.min(maxExercises === Infinity ? FULL_BODY_MAX : maxExercises, FULL_BODY_MAX)
      : maxExercises;

    // ===== 全身法目標（fat_loss / endurance / health）: 目標別専用プールから直接選択 =====
    // 部位ループを完全に廃止し、目標別に定義された専用種目プールからのみ選択する。
    if (isFullBodyGoal) {
      const effectiveDayMax = dayMax === Infinity ? FULL_BODY_MAX : dayMax;
      // 目標別専用プール（goalTagsに現在の目標が含まれる種目のみ）
      const goalPool = effectiveDbExercises
        ? effectiveDbExercises.filter((ex) => ex.goalTags?.includes(profile.goal as "fat_loss" | "endurance" | "health"))
        : EXERCISE_DB.filter((ex) => ex.goalTags?.includes(profile.goal as "fat_loss" | "endurance" | "health"));

      // 設備フィルター（自重種目は設備不問で使用可能）
      const availableEquipment = getAvailableEquipment(profile.equipmentAccess);
      const difficultyMap: Record<string, number> = { none: 0, beginner: 1, intermediate: 2, advanced: 3 };
      const rawLevel = difficultyMap[profile.experienceLevel] ?? 1;
      const userLevel = profile.experienceLevel === "none" ? 1 : rawLevel;

      const filteredPool = goalPool.filter((ex) => {
        const exLevels = Array.isArray(ex.difficulty) ? ex.difficulty : [ex.difficulty];
        const hasMatchingLevel = exLevels.some((d) => difficultyMap[d] <= userLevel);
        if (!hasMatchingLevel) return false;
        // 自重種目は設備不問
        if (ex.equipment.length === 1 && ex.equipment[0] === "bodyweight") return true;
        return ex.equipment.some((eq) => availableEquipment.includes(eq));
      });

      // 健康維持目標は週ごとに種目をシャッフルする
      const shuffle = <T>(arr: T[], seed: number): T[] => {
        const a = [...arr];
        for (let i = a.length - 1; i > 0; i--) {
          const j = (seed * 1664525 + 1013904223 + i) % (i + 1);
          [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
      };
      const orderedPool = (profile.goal === "health" && profile.weekSeed !== undefined)
        ? shuffle(filteredPool, profile.weekSeed)
        : filteredPool;

      // 専用プールから必要数だけ選択
      for (const template of orderedPool) {
        if (exercises.length >= effectiveDayMax) break;
        const exercise = buildExercise(template, profile, weightMap);
        if (isNone) { exercise.sets = Math.max(exercise.sets - 1, 2); exercise.restSeconds = Math.max(exercise.restSeconds, 90); }
        if (profile.goal === "endurance") exercise.restSeconds = Math.min(exercise.restSeconds, 30);
        if (profile.goal === "fat_loss") exercise.restSeconds = Math.min(exercise.restSeconds, 60);
        exercises.push(exercise);
      }
    } else {
      // ===== 筋肥大 / 筋力向上: 部位分割法（従来通り） =====
      const groupCount = day.muscleGroups.length;
      const effectiveDayMax = dayMax === Infinity ? groupCount * 3 : dayMax;
      const basePerGroup = Math.floor(effectiveDayMax / groupCount);
      const remainder = effectiveDayMax % groupCount;
      const groupQuotas = day.muscleGroups.map((_, i) =>
        basePerGroup + (i < remainder ? 1 : 0)
      );

      for (let gi = 0; gi < day.muscleGroups.length; gi++) {
        const group = day.muscleGroups[gi];
        if (exercises.length >= effectiveDayMax) break;
        const quota = groupQuotas[gi];
        const selected = selectExercises(group, quota, profile, effectiveDbExercises, profile.weekSeed, excludedExercises);
        for (const template of selected) {
          if (exercises.length >= effectiveDayMax) break;
          const exercise = buildExercise(template, profile, weightMap);
          if (isNone) {
            exercise.sets = Math.max(exercise.sets - 1, 2);
            exercise.restSeconds = Math.max(exercise.restSeconds, 90);
          }
          exercises.push(exercise);
        }
      }
    }

    // estimatedDuration: 1種目13分基準 + ウォームアップ5分
    // endurance目標はサーキット形式のため時間短縮、fat_lossはHIIT形式のため時間短縮
    const minutesPerEx = profile.goal === "endurance" ? 7 : profile.goal === "fat_loss" ? 10 : 13;
    const estimatedDuration = Math.round(exercises.length * minutesPerEx + 5);

    // endurance目標: サーキット形式フラグを付与
    const isCircuit = profile.goal === "endurance";
    // fat_loss目標: インターバル短縮フラグ（サーキットではなく「高強度インターバル」形式）
    const isHIIT = profile.goal === "fat_loss";

    return {
      dayLabel: trainingDayLabels[index] || `Day ${index + 1}`,
      focus: day.focus,
      exercises,
      estimatedDuration,
      ...(isCircuit ? { isCircuit: true } : {}),
      ...(isHIIT ? { isHIIT: true } : {}),
    };
  });

  // 休息日 = 全曜日からトレーニング曜日を除いた曜日のラベル
  const restDays = ALL_WEEK_DAYS.filter(d => !trainingDayLabels.includes(d));

  const totalSets = days.reduce(
    (sum, day) => sum + day.exercises.reduce((s, ex) => s + ex.sets, 0),
    0
  );

  return {
    days,
    restDays,
    weeklyVolume: `週間合計セット数: ${totalSets}セット`,
    splitMethod,
  };
}

// ===== プラン生成 =====

export function generateTrainingPlan(
  profile: UserProfile,
  duration: "1week" | "1month" | "3months" | "6months" | "12months",
  weightMap?: Map<string, ExerciseWeightData>,
  dbExercises?: ExerciseTemplate[],
  excludedExercises?: string[]
): TrainingPlan {
  const durationMap: Record<string, { label: string; phases: number; weeksPerPhase: number }> = {
    "1week": { label: "1週間", phases: 1, weeksPerPhase: 1 },
    "1month": { label: "1ヶ月", phases: 2, weeksPerPhase: 2 },
    "3months": { label: "3ヶ月", phases: 3, weeksPerPhase: 4 },
    "6months": { label: "6ヶ月", phases: 4, weeksPerPhase: 6 },
    "12months": { label: "12ヶ月", phases: 4, weeksPerPhase: 12 },
  };

  const config = durationMap[duration];
  const goalLabels: Record<string, string> = {
    muscle_gain: "筋肥大",
    fat_loss: "脂肪燃焼",
    strength: "筋力向上",
    endurance: "持久力向上",
    health: "健康維持",
  };

  const title = `${goalLabels[profile.goal]}のための${config.label}トレーニングプラン`;
  const description = generatePlanDescription(profile, config.label);

  const phases: PlanPhase[] = [];

  for (let i = 0; i < config.phases; i++) {
    const phaseProfile = getPhaseProfile(profile, i, config.phases);
    const weeklyMenu = generateWeeklyMenu(phaseProfile, weightMap, dbExercises, excludedExercises);

    phases.push({
      phaseNumber: i + 1,
      phaseName: getPhaseName(i, config.phases, profile.goal),
      duration: `${config.weeksPerPhase}週間`,
      focus: getPhaseFocus(i, config.phases, profile.goal),
      weeklyMenu,
      intensityLevel: profile.intensityLevel ?? "normal",
      progressionRule: getProgressionRule(i, config.phases, profile.goal),
    });
  }

  const progressionNotes = generateProgressionNotes(profile, duration);

  return { title, description, duration: config.label, phases, progressionNotes };
}

function generatePlanDescription(profile: UserProfile, duration: string): string {
  const expLabels: Record<string, string> = {
    none: "トレーニング未経験者",
    beginner: "初心者",
    intermediate: "中級者",
    advanced: "上級者",
  };
  const goalLabels: Record<string, string> = {
    muscle_gain: "筋肥大",
    fat_loss: "脂肪燃焼",
    strength: "筋力向上",
    endurance: "持久力向上",
    health: "健康維持",
  };

  const targetDesc = profile.targetMuscles && profile.targetMuscles.length > 0
    ? `重点部位: ${profile.targetMuscles.join("・")}。`
    : "";

  return `${expLabels[profile.experienceLevel]}向け、週${profile.availableDaysPerWeek}日の${goalLabels[profile.goal]}プログラムです。${targetDesc}${duration}かけて段階的に強度を上げていきます。`;
}

function getPhaseProfile(
  base: UserProfile,
  _phaseIndex: number,
  _totalPhases: number
): UserProfile {
  // experienceLevelは変更しない。フェーズ進行はsetMultiplierで表現する
  return base;
}

function getPhaseName(
  phaseIndex: number,
  totalPhases: number,
  goal: UserProfile["goal"]
): string {
  if (totalPhases === 1) return "メインフェーズ";

  const phaseNames: Record<string, string[]> = {
    muscle_gain: ["基礎構築期", "筋肥大期", "強化期", "ピーキング期"],
    fat_loss: ["適応期", "脂肪燃焼期", "強化期", "維持期"],
    strength: ["基礎期", "筋力構築期", "最大筋力期", "ピーキング期"],
    endurance: ["基礎体力期", "持久力構築期", "強化期", "維持期"],
    health: ["導入期", "習慣化期", "強化期", "維持期"],
  };

  const names = phaseNames[goal] || phaseNames.health;
  return names[phaseIndex] || `フェーズ ${phaseIndex + 1}`;
}

function getPhaseFocus(
  phaseIndex: number,
  totalPhases: number,
  goal: UserProfile["goal"]
): string {
  if (totalPhases === 1) return "基本的なトレーニングフォームの習得と体力向上";

  const focuses: Record<string, string[]> = {
    muscle_gain: [
      "正しいフォームの習得と基礎筋力の構築",
      "ボリュームを増やし筋肥大を促進",
      "高強度トレーニングで筋肉に新しい刺激を与える",
      "最大筋力とサイズの追求",
    ],
    fat_loss: [
      "トレーニング習慣の確立と基礎代謝の向上",
      "高強度インターバルと筋トレの組み合わせで脂肪燃焼を最大化",
      "筋量を維持しながら体脂肪率を下げる",
      "達成した体型の維持と生活習慣の定着",
    ],
    strength: [
      "基本動作パターンの習得",
      "漸進的過負荷による筋力向上",
      "高重量・低レップでの最大筋力追求",
      "テスト週とデロード",
    ],
    endurance: [
      "基礎体力と心肺機能の向上",
      "トレーニング量の段階的増加",
      "高レップ・短休憩での持久力強化",
      "パフォーマンスの維持と回復",
    ],
    health: [
      "運動習慣の確立と基本動作の習得",
      "週間ルーティンの定着",
      "強度の微増と種目のバリエーション追加",
      "長期的な健康維持のための習慣化",
    ],
  };

  const items = focuses[goal] || focuses.health;
  return items[phaseIndex] || "トレーニングの継続と向上";
}

function getIntensityLevel(phaseIndex: number, totalPhases: number): string {
  if (totalPhases === 1) return "中程度";
  const levels = ["低〜中", "中程度", "中〜高", "高"];
  return levels[Math.min(phaseIndex, levels.length - 1)];
}

function getProgressionRule(
  phaseIndex: number,
  totalPhases: number,
  goal: UserProfile["goal"]
): string {
  if (goal === "strength") {
    const rules = [
      "毎週2.5kgずつ重量を増やす（上半身）/ 5kgずつ（下半身）",
      "レップ数が目標上限に達したら重量を増やす",
      "週ごとに強度を上げ、4週目にデロード",
      "1RMテストを行い、次のサイクルの重量を設定",
    ];
    return rules[phaseIndex] || rules[0];
  }

  if (goal === "muscle_gain") {
    const rules = [
      "フォームを優先し、コントロールできる重量で行う",
      "同じレップ数で重量を増やすか、同じ重量でレップ数を増やす",
      "ドロップセットやスーパーセットを導入",
      "高重量・低レップと中重量・高レップを交互に行う",
    ];
    return rules[phaseIndex] || rules[0];
  }

  const defaultRules = [
    "まずは正しいフォームで全セットを完遂することを目標にする",
    "余裕が出てきたら重量またはレップ数を少しずつ増やす",
    "セット間の休憩時間を短くするか、セット数を増やす",
    "現在の強度を維持しながら、新しい種目にチャレンジする",
  ];
  return defaultRules[phaseIndex] || defaultRules[0];
}

function generateProgressionNotes(
  profile: UserProfile,
  duration: string
): string[] {
  const notes: string[] = [
    "トレーニング前に5〜10分のウォームアップを必ず行ってください",
    "痛みを感じた場合は即座に中止し、専門家に相談してください",
    "十分な睡眠（7〜8時間）と栄養摂取を心がけてください",
  ];

  if (profile.goal === "muscle_gain") {
    notes.push("体重1kgあたり1.6〜2.2gのタンパク質摂取を目標にしてください");
    notes.push("トレーニング後30分以内にプロテインを摂取すると効果的です");
  }

  if (profile.goal === "fat_loss") {
    notes.push("適度なカロリー制限（維持カロリーの-300〜500kcal）を併用してください");
    notes.push("有酸素運動をトレーニング後または別日に20〜30分追加すると効果的です");
  }

  if (profile.goal === "strength") {
    notes.push("高重量を扱う際は必ずスポッターをつけるか、セーフティバーを使用してください");
    notes.push("中枢神経系の回復のため、最大重量のトレーニングは週1〜2回に留めてください");
  }

  if (profile.experienceLevel === "none") {
    notes.push("トレーニングが初めての方は、最初の1ヶ月は無理をせず、フォームの習得を最優先してください");
    notes.push("自体重トレーニングから始め、徐々に重量を増やしていくことをお勧めします");
    notes.push("筋肉痛が強い場合は休息日を追加しても構いません");
  } else if (profile.experienceLevel === "beginner") {
    notes.push("最初の2〜4週間はフォーム習得に集中し、重量は軽めに設定してください");
    notes.push("筋肉痛が強い場合は休息日を追加しても構いません");
  }

  if (duration === "6months" || duration === "12months") {
    notes.push("4〜6週間ごとにデロード週（強度を50〜60%に落とす週）を設けてください");
    notes.push("3ヶ月ごとに体組成を測定し、プランの見直しを検討してください");
  }

  return notes;
}

// ===== エクスポート用のメニュー生成サマリー =====

export function generateMenuTitle(profile: UserProfile): string {
  const goalLabels: Record<string, string> = {
    muscle_gain: "筋肥大",
    fat_loss: "脂肪燃焼",
    strength: "筋力向上",
    endurance: "持久力向上",
    health: "健康維持",
  };
  const expLabels: Record<string, string> = {
    none: "トレーニング未経験者",
    beginner: "初心者",
    intermediate: "中級者",
    advanced: "上級者",
  };

  return `${expLabels[profile.experienceLevel]}向け ${goalLabels[profile.goal]}メニュー（週${profile.availableDaysPerWeek}日）`;
}

// ===== 種目入れ替え候補取得 =====

/** 特定の部位・プロフィールに合う代替候補を最大 maxCount 件返す */
export function getCandidatesForExercise(
  muscleGroup: string,
  profile: UserProfile,
  excludeNames: string[],
  dbExercises?: ExerciseTemplate[],
  maxCount = 5
): Array<{ name: string; muscleGroup: string; equipment: string[]; difficulty: string[]; compound: boolean }> {
  const excludedSet = new Set(excludeNames);
  let available: ExerciseTemplate[];

  if (muscleGroup === "全身") {
    // fat_loss / endurance / health の全身種目はgoalTagsプールから選択
    available = EXERCISE_DB.filter(
      (ex) =>
        ex.muscleGroup === "全身" &&
        ex.goalTags?.includes(profile.goal as "fat_loss" | "endurance" | "health") &&
        !excludedSet.has(ex.name)
    );
  } else {
    available = filterExercises(muscleGroup, profile, dbExercises).filter(
      (ex) => !excludedSet.has(ex.name)
    );
  }

  return available.slice(0, maxCount).map((ex) => ({
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    equipment: ex.equipment,
    difficulty: ex.difficulty,
    compound: ex.compound,
  }));
}

/** 種目名からExerciseTemplateを検索する（DB優先、なければEXERCISE_DB）*/
export function findExerciseTemplate(
  name: string,
  dbExercises?: ExerciseTemplate[]
): ExerciseTemplate | undefined {
  if (dbExercises) {
    const found = dbExercises.find((e) => e.name === name);
    if (found) return found;
  }
  return EXERCISE_DB.find((e) => e.name === name);
}

// ===== 管理者向け: 目標別専用種目プール取得 =====

export function getGoalSpecificExercises(): Array<{
  goal: string;
  label: string;
  exercises: Array<{ name: string; muscleGroup: string; equipment: string[]; difficulty: string[]; compound: boolean }>;
}> {
  const goals = [
    { goal: "fat_loss", label: "脂肪燃焼（HIIT）" },
    { goal: "endurance", label: "持久力向上（サーキット）" },
    { goal: "health", label: "健康維持" },
  ] as const;
  return goals.map(({ goal, label }) => ({
    goal,
    label,
    exercises: EXERCISE_DB
      .filter((ex) => ex.goalTags?.includes(goal))
      .map((ex) => ({
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        equipment: ex.equipment,
        difficulty: ex.difficulty,
        compound: ex.compound,
      })),
  }));
}
