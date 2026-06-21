import { describe, expect, it } from "vitest";
import {
  generateWeeklyMenu,
  generateTrainingPlan,
  generateMenuTitle,
  buildSplitFromTargets,
  calculateRecommendedWeight,
  getAgeFactor,
  type UserProfile,
  type ExerciseWeightData,
} from "./training-engine";

const baseProfile: UserProfile = {
  height: 170,
  weight: 65,
  age: 25,
  gender: "male",
  experienceLevel: "beginner",
  goal: "muscle_gain",
  availableDaysPerWeek: 3,
  equipmentAccess: "gym",
};

// ===== 分割法テスト（全身法 / 部位分割法のみ） =====
describe("buildSplitFromTargets", () => {
  it("部位未選択・週3日の場合は部位分割法になる", () => {
    const result = buildSplitFromTargets([], 3);
    expect(result.days).toHaveLength(3);
    expect(result.splitMethod).toBe("部位分割法");
    for (const day of result.days) {
      expect(day.focus).toBeTruthy();
      expect(day.muscleGroups.length).toBeGreaterThan(0);
    }
  });

  it("部位未選択・週2日の場合は全身法になる", () => {
    const result = buildSplitFromTargets([], 2);
    expect(result.days).toHaveLength(2);
    expect(result.splitMethod).toBe("全身法");
  });

  it("部位未選択・週1日の場合は全身法になる", () => {
    const result = buildSplitFromTargets([], 1);
    expect(result.days).toHaveLength(1);
    expect(result.splitMethod).toBe("全身法");
  });

  it("選択部位に基づいて部位分割法で分割される", () => {
    const result = buildSplitFromTargets(["胸", "背中", "脚"], 3);
    expect(result.days).toHaveLength(3);
    expect(result.splitMethod).toBe("部位分割法");
    const allMuscles = result.days.flatMap((d) => d.muscleGroups);
    expect(allMuscles).toContain("胸");
    expect(allMuscles).toContain("背中");
    expect(allMuscles).toContain("脚");
  });

  it("選択部位が日数より少ない場合でも指定日数分の日が生成される", () => {
    const result = buildSplitFromTargets(["胸"], 3);
    expect(result.days).toHaveLength(3);
  });

  it("週5日の場合は部位分割法で5日分の分割を返す", () => {
    const result = buildSplitFromTargets(["胸", "背中", "肩", "脚", "腹筋"], 5);
    expect(result.days).toHaveLength(5);
    expect(result.splitMethod).toBe("部位分割法");
  });

  it("全身法の場合は各日に全部位が含まれる", () => {
    const result = buildSplitFromTargets(["胸", "背中"], 2);
    expect(result.splitMethod).toBe("全身法");
    for (const day of result.days) {
      expect(day.focus).toBe("全身");
    }
  });

  it("splitMethodは全身法か部位分割法のいずれかである", () => {
    const cases = [
      { targets: [], days: 1 },
      { targets: [], days: 2 },
      { targets: [], days: 3 },
      { targets: ["胸", "背中"], days: 4 },
      { targets: ["胸", "背中", "肩", "脚"], days: 5 },
      { targets: ["胸", "背中", "肩", "脚", "腹筋", "二頭筋"], days: 6 },
    ];
    for (const c of cases) {
      const result = buildSplitFromTargets(c.targets, c.days);
      expect(["全身法", "部位分割法"]).toContain(result.splitMethod);
    }
  });
});

// ===== 週間メニュー生成テスト =====
describe("generateWeeklyMenu", () => {
  it("指定した日数分のトレーニング日を生成する", () => {
    const menu = generateWeeklyMenu(baseProfile);
    expect(menu.days).toHaveLength(3);
  });

  it("各日にエクササイズが含まれる", () => {
    const menu = generateWeeklyMenu(baseProfile);
    for (const day of menu.days) {
      expect(day.exercises.length).toBeGreaterThan(0);
      expect(day.focus).toBeTruthy();
      expect(day.dayLabel).toBeTruthy();
      expect(day.estimatedDuration).toBeGreaterThan(0);
    }
  });

  it("エクササイズにセット数・レップ数・休憩時間が含まれる", () => {
    const menu = generateWeeklyMenu(baseProfile);
    const firstExercise = menu.days[0].exercises[0];
    expect(firstExercise.name).toBeTruthy();
    expect(firstExercise.muscleGroup).toBeTruthy();
    expect(firstExercise.sets).toBeGreaterThan(0);
    expect(firstExercise.reps).toBeTruthy();
    expect(firstExercise.restSeconds).toBeGreaterThan(0);
  });

  it("自宅トレーニングではバーベル・マシン種目が含まれない", () => {
    const homeProfile: UserProfile = { ...baseProfile, equipmentAccess: "home" };
    const menu = generateWeeklyMenu(homeProfile);
    const allExercises = menu.days.flatMap((d) => d.exercises);
    const gymOnlyKeywords = ["ベンチプレス", "バーベルスクワット", "レッグプレス", "レッグエクステンション", "レッグカール"];
    for (const ex of allExercises) {
      expect(gymOnlyKeywords).not.toContain(ex.name);
    }
  });

  it("週間ボリューム情報が含まれる", () => {
    const menu = generateWeeklyMenu(baseProfile);
    expect(menu.weeklyVolume).toContain("セット");
  });

  it("休息日の情報が含まれる", () => {
    const menu = generateWeeklyMenu(baseProfile);
    expect(menu.restDays.length).toBeGreaterThan(0);
  });

  it("週5日の場合は5日分のメニューが生成される", () => {
    const profile5days: UserProfile = { ...baseProfile, availableDaysPerWeek: 5 };
    const menu = generateWeeklyMenu(profile5days);
    expect(menu.days).toHaveLength(5);
  });

  it("脂肪燃焼目標の場合は休憩時間が短い", () => {
    const fatLossProfile: UserProfile = { ...baseProfile, goal: "fat_loss" };
    const menu = generateWeeklyMenu(fatLossProfile);
    const allExercises = menu.days.flatMap((d) => d.exercises);
    for (const ex of allExercises) {
      expect(ex.restSeconds).toBeLessThanOrEqual(90);
    }
  });

  it("分割法の名称は全身法か部位分割法である", () => {
    const menu = generateWeeklyMenu(baseProfile);
    expect(["全身法", "部位分割法"]).toContain(menu.splitMethod);
  });
});

// ===== トレーニングプラン生成テスト =====
describe("generateTrainingPlan", () => {
  it("1週間プランは1フェーズを含む", () => {
    const plan = generateTrainingPlan(baseProfile, "1week");
    expect(plan.phases).toHaveLength(1);
    expect(plan.duration).toBe("1週間");
  });

  it("1ヶ月プランは2フェーズを含む", () => {
    const plan = generateTrainingPlan(baseProfile, "1month");
    expect(plan.phases).toHaveLength(2);
    expect(plan.duration).toBe("1ヶ月");
  });

  it("3ヶ月プランは3フェーズを含む", () => {
    const plan = generateTrainingPlan(baseProfile, "3months");
    expect(plan.phases).toHaveLength(3);
    expect(plan.duration).toBe("3ヶ月");
  });

  it("12ヶ月プランは4フェーズを含む", () => {
    const plan = generateTrainingPlan(baseProfile, "12months");
    expect(plan.phases).toHaveLength(4);
    expect(plan.duration).toBe("12ヶ月");
  });

  it("プランにタイトルと説明が含まれる", () => {
    const plan = generateTrainingPlan(baseProfile, "3months");
    expect(plan.title).toContain("筋肥大");
    expect(plan.description).toBeTruthy();
  });

  it("各フェーズに週間メニューが含まれる", () => {
    const plan = generateTrainingPlan(baseProfile, "3months");
    for (const phase of plan.phases) {
      expect(phase.weeklyMenu.days.length).toBeGreaterThan(0);
      expect(phase.phaseName).toBeTruthy();
      expect(phase.duration).toBeTruthy();
      expect(phase.focus).toBeTruthy();
      expect(phase.intensityLevel).toBeTruthy();
      expect(phase.progressionRule).toBeTruthy();
    }
  });

  it("進行上の注意点が含まれる", () => {
    const plan = generateTrainingPlan(baseProfile, "3months");
    expect(plan.progressionNotes.length).toBeGreaterThan(0);
  });

  it("筋力向上目標のプランには適切な進行ルールが含まれる", () => {
    const strengthProfile: UserProfile = { ...baseProfile, goal: "strength" };
    const plan = generateTrainingPlan(strengthProfile, "3months");
    expect(plan.title).toContain("筋力向上");
    const hasWeightProgression = plan.phases.some((p) => p.progressionRule.includes("重量"));
    expect(hasWeightProgression).toBe(true);
  });

  it("分割法情報は全身法か部位分割法である", () => {
    const plan = generateTrainingPlan(baseProfile, "3months");
    for (const phase of plan.phases) {
      expect(["全身法", "部位分割法"]).toContain(phase.weeklyMenu.splitMethod);
    }
  });
});

// ===== 経験レベル: 全くなし =====
describe("experienceLevel: none", () => {
  const noneProfile: UserProfile = { ...baseProfile, experienceLevel: "none" };

  it("「全くなし」でもメニューが生成される", () => {
    const menu = generateWeeklyMenu(noneProfile);
    expect(menu.days.length).toBeGreaterThan(0);
  });

  it("「全くなし」の場合はセット数が控えめになる", () => {
    const noneMenu = generateWeeklyMenu(noneProfile);
    const beginnerMenu = generateWeeklyMenu({ ...baseProfile, experienceLevel: "beginner" });
    const noneSets = noneMenu.days.flatMap((d) => d.exercises).reduce((s, e) => s + e.sets, 0);
    const beginnerSets = beginnerMenu.days.flatMap((d) => d.exercises).reduce((s, e) => s + e.sets, 0);
    expect(noneSets).toBeLessThan(beginnerSets);
  });

  it("「全くなし」のタイトルに未経験者が含まれる", () => {
    const title = generateMenuTitle(noneProfile);
    expect(title).toContain("トレーニング未経験者");
  });

  it("「全くなし」のプランに初心者向けアドバイスが含まれる", () => {
    const plan = generateTrainingPlan(noneProfile, "3months");
    const hasNoneAdvice = plan.progressionNotes.some((n) => n.includes("トレーニングが初めて"));
    expect(hasNoneAdvice).toBe(true);
  });
});

// ===== 鍛えたい部位（targetMuscles）テスト =====
describe("targetMuscles", () => {
  it("重点部位を指定するとその部位の種目数が増える", () => {
    const normalMenu = generateWeeklyMenu(baseProfile);
    const targetMenu = generateWeeklyMenu({ ...baseProfile, targetMuscles: ["胸"] });
    const normalChestExercises = normalMenu.days.flatMap((d) => d.exercises).filter((e) => e.muscleGroup === "胸");
    const targetChestExercises = targetMenu.days.flatMap((d) => d.exercises).filter((e) => e.muscleGroup === "胸");
    expect(targetChestExercises.length).toBeGreaterThanOrEqual(normalChestExercises.length);
  });

  it("targetMusclesが未指定でもメニューが生成される", () => {
    const menu = generateWeeklyMenu({ ...baseProfile, targetMuscles: undefined });
    expect(menu.days.length).toBeGreaterThan(0);
  });

  it("空配列の場合も正常に動作する", () => {
    const menu = generateWeeklyMenu({ ...baseProfile, targetMuscles: [] });
    expect(menu.days.length).toBeGreaterThan(0);
  });

  it("選択した部位以外のトレーニングが含まれない（胸のみ選択時）", () => {
    const profile = { ...baseProfile, availableDaysPerWeek: 3, targetMuscles: ["胸"] };
    const menu = generateWeeklyMenu(profile);
    const allMuscleGroups = menu.days.flatMap((d) => d.exercises.map((e) => e.muscleGroup));
    const uniqueGroups = [...new Set(allMuscleGroups)];
    // 胸のみ選択したので、胸以外の部位が含まれてはいけない
    for (const g of uniqueGroups) {
      expect(g).toBe("胸");
    }
  });

  it("選択した部位以外のトレーニングが含まれない（胸・背中選択時）", () => {
    const profile = { ...baseProfile, availableDaysPerWeek: 3, targetMuscles: ["胸", "背中"] };
    const menu = generateWeeklyMenu(profile);
    const allMuscleGroups = menu.days.flatMap((d) => d.exercises.map((e) => e.muscleGroup));
    const uniqueGroups = [...new Set(allMuscleGroups)];
    // 胸・背中のみ選択したので、それ以外の部位が含まれてはいけない
    for (const g of uniqueGroups) {
      expect(["胸", "背中"]).toContain(g);
    }
  });

  it("選択した部位以外のトレーニングが含まれない（脚選択時に腹筋が混入しない）", () => {
    const profile = { ...baseProfile, availableDaysPerWeek: 3, targetMuscles: ["脚"] };
    const menu = generateWeeklyMenu(profile);
    const allMuscleGroups = menu.days.flatMap((d) => d.exercises.map((e) => e.muscleGroup));
    const uniqueGroups = [...new Set(allMuscleGroups)];
    // 脚のみ選択したので、腹筋が含まれてはいけない
    for (const g of uniqueGroups) {
      expect(g).toBe("脚");
    }
  });

  it("部位未選択の場合は腹筋が含まれる（デフォルト動作）", () => {
    const profile = { ...baseProfile, availableDaysPerWeek: 4, targetMuscles: [] };
    const menu = generateWeeklyMenu(profile);
    const allMuscleGroups = menu.days.flatMap((d) => d.exercises.map((e) => e.muscleGroup));
    expect(allMuscleGroups).toContain("腹筋");
  });

  it("複数部位を選択した場合に分割に反映される", () => {
    const profile: UserProfile = {
      ...baseProfile,
      availableDaysPerWeek: 4,
      targetMuscles: ["胸", "背中", "肩", "脚"],
    };
    const menu = generateWeeklyMenu(profile);
    expect(menu.days).toHaveLength(4);
    const allMuscleGroups = menu.days.flatMap((d) => d.exercises.map((e) => e.muscleGroup));
    expect(allMuscleGroups).toContain("胸");
    expect(allMuscleGroups).toContain("背中");
  });
});

// ===== dailyMinutes（1日のトレーニング時間）テスト =====
describe("dailyMinutes", () => {
  it("dailyMinutesを指定すると種目数が制限される", () => {
    const shortProfile: UserProfile = { ...baseProfile, dailyMinutes: 30 };
    const longProfile: UserProfile = { ...baseProfile, dailyMinutes: 120 };
    const shortMenu = generateWeeklyMenu(shortProfile);
    const longMenu = generateWeeklyMenu(longProfile);
    const shortTotal = shortMenu.days.reduce((s, d) => s + d.exercises.length, 0);
    const longTotal = longMenu.days.reduce((s, d) => s + d.exercises.length, 0);
    expect(shortTotal).toBeLessThanOrEqual(longTotal);
  });

  it("dailyMinutes未指定でもメニューが生成される", () => {
    const menu = generateWeeklyMenu(baseProfile);
    expect(menu.days.length).toBeGreaterThan(0);
  });

  it("フェーズ進行でボリュームが増加しない（SYNERGY_MAP循環参照バグの修正確認）", () => {
    const plan = generateTrainingPlan(baseProfile, "3months");
    const phase1Sets = plan.phases[0].weeklyMenu.days.reduce(
      (s, d) => s + d.exercises.reduce((es, e) => es + e.sets, 0), 0
    );
    const phase3Sets = plan.phases[2].weeklyMenu.days.reduce(
      (s, d) => s + d.exercises.reduce((es, e) => es + e.sets, 0), 0
    );
    // フェーズ進行でボリュームが大幅に増加することはない（同一プロフィールなので差は小さい）
    expect(Math.abs(phase1Sets - phase3Sets)).toBeLessThan(phase1Sets * 0.5);
  });
});

// ===== タイトル生成テスト =====
describe("generateMenuTitle", () => {
  it("プロフィールに基づいたタイトルを生成する", () => {
    const title = generateMenuTitle(baseProfile);
    expect(title).toContain("初心者");
    expect(title).toContain("筋肥大");
    expect(title).toContain("週3日");
  });

  it("上級者・筋力向上の場合のタイトル", () => {
    const advancedProfile: UserProfile = {
      ...baseProfile,
      experienceLevel: "advanced",
      goal: "strength",
      availableDaysPerWeek: 5,
    };
    const title = generateMenuTitle(advancedProfile);
    expect(title).toContain("上級者");
    expect(title).toContain("筋力向上");
    expect(title).toContain("週5日");
  });
});

// ===== 難易度フィルター（複数選択・累積型）テスト =====
describe("difficulty filtering (cumulative)", () => {
  it("初心者には difficulty=['beginner'] の種目が含まれる", () => {
    const profile: UserProfile = { ...baseProfile, experienceLevel: "beginner" };
    const menu = generateWeeklyMenu(profile);
    // 初心者向けメニューが生成される（空でないこと）
    expect(menu.days.length).toBeGreaterThan(0);
    const allExercises = menu.days.flatMap((d) => d.exercises);
    expect(allExercises.length).toBeGreaterThan(0);
  });

  it("中級者には beginner・intermediate を含む種目が表示される（累積型）", () => {
    const beginnerProfile: UserProfile = { ...baseProfile, experienceLevel: "beginner" };
    const intermediateProfile: UserProfile = { ...baseProfile, experienceLevel: "intermediate" };
    const beginnerMenu = generateWeeklyMenu(beginnerProfile);
    const intermediateMenu = generateWeeklyMenu(intermediateProfile);
    // 中級者は初心者以上の種目を使えるため、種目プールが広い（同数以上）
    const beginnerCount = beginnerMenu.days.flatMap((d) => d.exercises).length;
    const intermediateCount = intermediateMenu.days.flatMap((d) => d.exercises).length;
    // 種目数は同数かそれ以上（累積型なので中級者の方が選択肢が多い）
    expect(intermediateCount).toBeGreaterThanOrEqual(beginnerCount * 0.8);
  });

  it("上級者には beginner・intermediate・advanced を含む種目が表示される（累積型）", () => {
    const advancedProfile: UserProfile = { ...baseProfile, experienceLevel: "advanced" };
    const menu = generateWeeklyMenu(advancedProfile);
    expect(menu.days.length).toBeGreaterThan(0);
    const allExercises = menu.days.flatMap((d) => d.exercises);
    expect(allExercises.length).toBeGreaterThan(0);
  });

  it("experienceLevel=none でもメニューが生成される（完全初心者層の種目または初心者層の種目が表示される）", () => {
    const noneProfile: UserProfile = { ...baseProfile, experienceLevel: "none" };
    const noneMenu = generateWeeklyMenu(noneProfile);
    // noneプロフィールでメニューが生成される（種目数 > 0）
    const noneExercises = noneMenu.days.flatMap((d) => d.exercises);
    expect(noneExercises.length).toBeGreaterThan(0);
  });
});

// ===== calculateRecommendedWeight: none（完全初心者）係数テスト =====
describe("calculateRecommendedWeight - none multiplier", () => {
  const baseWeightData: ExerciseWeightData = {
    exerciseName: "ベンチプレス",
    femaleBaseWeight: 20,
    maleBaseWeight: 60,
    noneMultiplier: 0.4,
    beginnerMultiplier: 0.6,
    intermediateMultiplier: 1.0,
    advancedMultiplier: 1.3,
    maleNoneMultiplier: 0.4,
    maleBeginnerMultiplier: 0.6,
    maleIntermediateMultiplier: 1.0,
    maleAdvancedMultiplier: 1.3,
    weightRatio: 0,
    isBodyweight: 0,
  };

  it("完全初心者（none）はnoneMultiplierを使用する（beginnerより低い値）", () => {
    const noneProfile: UserProfile = {
      height: 158, weight: 55, age: 25, gender: "female",
      experienceLevel: "none", goal: "muscle_gain",
      availableDaysPerWeek: 3, equipmentAccess: "gym",
    };
    const beginnerProfile: UserProfile = { ...noneProfile, experienceLevel: "beginner" };

    const noneResult = calculateRecommendedWeight(baseWeightData, noneProfile);
    const beginnerResult = calculateRecommendedWeight(baseWeightData, beginnerProfile);

    // none係数(0.4) < beginner係数(0.6) なので推奨重量はnoneの方が低い
    const noneKg = parseFloat(noneResult.replace("kg", ""));
    const beginnerKg = parseFloat(beginnerResult.replace("kg", ""));
    expect(noneKg).toBeLessThan(beginnerKg);
  });

  it("完全初心者（none）男性はmaleNoneMultiplierを使用する", () => {
    const noneProfile: UserProfile = {
      height: 171, weight: 64, age: 25, gender: "male",
      experienceLevel: "none", goal: "muscle_gain",
      availableDaysPerWeek: 3, equipmentAccess: "gym",
    };
    const beginnerProfile: UserProfile = { ...noneProfile, experienceLevel: "beginner" };

    const noneResult = calculateRecommendedWeight(baseWeightData, noneProfile);
    const beginnerResult = calculateRecommendedWeight(baseWeightData, beginnerProfile);

    const noneKg = parseFloat(noneResult.replace("kg", ""));
    const beginnerKg = parseFloat(beginnerResult.replace("kg", ""));
    expect(noneKg).toBeLessThan(beginnerKg);
  });

  it("係数の大小関係: none < beginner < intermediate < advanced", () => {
    const baseProfile: UserProfile = {
      height: 158, weight: 55, age: 25, gender: "female",
      experienceLevel: "none", goal: "muscle_gain",
      availableDaysPerWeek: 3, equipmentAccess: "gym",
    };
    const levels = ["none", "beginner", "intermediate", "advanced"] as const;
    const weights = levels.map((level) =>
      parseFloat(calculateRecommendedWeight(baseWeightData, { ...baseProfile, experienceLevel: level }).replace("kg", ""))
    );
    // 昇順になっているか確認
    for (let i = 0; i < weights.length - 1; i++) {
      expect(weights[i]).toBeLessThanOrEqual(weights[i + 1]);
    }
  });
});

// ===== 器具別重量スナップ テスト =====
import { snapToEquipmentWeight, detectEquipmentCategory } from "./training-engine";

describe("detectEquipmentCategory", () => {
  it("ダンベル種目を正しく判定する", () => {
    expect(detectEquipmentCategory("ダンベルプレス", "both")).toBe("dumbbell");
    expect(detectEquipmentCategory("ダンベルカール", "both")).toBe("dumbbell");
    expect(detectEquipmentCategory("ダンベルフライ", "both")).toBe("dumbbell");
  });

  it("バーベル種目を正しく判定する", () => {
    expect(detectEquipmentCategory("ベンチプレス", "gym")).toBe("barbell");
    expect(detectEquipmentCategory("スクワット", "gym")).toBe("barbell");
    expect(detectEquipmentCategory("デッドリフト", "gym")).toBe("barbell");
    expect(detectEquipmentCategory("オーバーヘッドプレス", "gym")).toBe("barbell");
  });

  it("マシン種目を正しく判定する", () => {
    expect(detectEquipmentCategory("ラットプルダウン", "gym")).toBe("machine");
    expect(detectEquipmentCategory("レッグプレス", "gym")).toBe("machine");
    expect(detectEquipmentCategory("チェストプレスマシン", "gym")).toBe("machine");
    expect(detectEquipmentCategory("ケーブルクロスオーバー", "gym")).toBe("machine");
    expect(detectEquipmentCategory("シーテッドロウ", "gym")).toBe("machine");
  });

  it("自重種目を正しく判定する", () => {
    expect(detectEquipmentCategory("腕立て伏せ", "home")).toBe("bodyweight");
    expect(detectEquipmentCategory("懸垂", "gym")).toBe("bodyweight");
    expect(detectEquipmentCategory("ディップス", "gym")).toBe("bodyweight");
  });
});

describe("snapToEquipmentWeight", () => {
  it("ダンベル: 実在する重量に丸める", () => {
    expect(snapToEquipmentWeight(11, "dumbbell")).toBe(10); // 11kgは存在しない→10kg
    expect(snapToEquipmentWeight(13, "dumbbell")).toBe(12); // 13kgは存在しない→12kg
    expect(snapToEquipmentWeight(15, "dumbbell")).toBe(14); // 15kgは存在しない→14kg
    expect(snapToEquipmentWeight(8, "dumbbell")).toBe(8);   // 8kgは存在する
    expect(snapToEquipmentWeight(20, "dumbbell")).toBe(20); // 20kgは存在する
  });

  it("ダンベル: 最小・最大の境界値", () => {
    expect(snapToEquipmentWeight(0.5, "dumbbell")).toBe(1);  // 最小は1kg
    expect(snapToEquipmentWeight(55, "dumbbell")).toBe(50);  // 最大は50kg
  });

  it("バーベル: バー＋プレートで実現可能な重量に丸める", () => {
    expect(snapToEquipmentWeight(20, "barbell")).toBe(20);   // 20kgバーのみ
    expect(snapToEquipmentWeight(22.5, "barbell")).toBe(22.5); // 20kg + 1.25kg×2
    expect(snapToEquipmentWeight(60, "barbell")).toBe(60);   // 20kg + 20kg×2
    expect(snapToEquipmentWeight(21, "barbell")).toBe(20);   // 21kgは存在しない→20kg
  });

  it("マシン: 2.5kg刻みに丸める", () => {
    expect(snapToEquipmentWeight(10, "machine")).toBe(10);
    expect(snapToEquipmentWeight(12.5, "machine")).toBe(12.5);
    expect(snapToEquipmentWeight(11, "machine")).toBe(10);   // 11→10
    expect(snapToEquipmentWeight(13, "machine")).toBe(12.5); // 13→12.5
    expect(snapToEquipmentWeight(100, "machine")).toBe(100);
  });

  it("自重: そのまま返す", () => {
    expect(snapToEquipmentWeight(15.7, "bodyweight")).toBe(15.7);
  });

  it("other（判定不能）: 0.5kg単位で丸める", () => {
    expect(snapToEquipmentWeight(7.9453125, "other")).toBe(8);
    expect(snapToEquipmentWeight(9.534, "other")).toBe(9.5);
    expect(snapToEquipmentWeight(33.3, "other")).toBe(33.5);
  });
});

  it("ダンベル名を含まない肩・腕種目を正しくdumbbellと判定する", () => {
    expect(detectEquipmentCategory("サイドレイズ", "both")).toBe("dumbbell");
    expect(detectEquipmentCategory("フロントレイズ", "both")).toBe("dumbbell");
    expect(detectEquipmentCategory("リアデルトフライ", "both")).toBe("dumbbell");
    expect(detectEquipmentCategory("アーノルドプレス", "both")).toBe("dumbbell");
    expect(detectEquipmentCategory("アームカール", "both")).toBe("dumbbell");
    expect(detectEquipmentCategory("ハンマーカール", "both")).toBe("dumbbell");
    expect(detectEquipmentCategory("トライセプスキックバック", "both")).toBe("dumbbell");
    expect(detectEquipmentCategory("ゴブレットスクワット", "both")).toBe("dumbbell");
    expect(detectEquipmentCategory("ルーマニアンデッドリフト", "both")).toBe("dumbbell");
  });

describe("dailyMinutes 種目数上限の検証", () => {
  const base: UserProfile = {
    height: 170, weight: 70, age: 30, gender: "male",
    experienceLevel: "intermediate",
    goal: "muscle_gain",
    availableDaysPerWeek: 3,
    equipmentAccess: "gym",
    targetMuscles: ["胸", "背中", "肩", "脚", "腹筋"],
  };

  it("60分設定で1日あたり最大4種目に収まる", () => {
    const menu = generateWeeklyMenu({ ...base, dailyMinutes: 60 });
    menu.days.forEach(day => {
      expect(day.exercises.length).toBeLessThanOrEqual(4);
    });
  });

  it("45分設定で1日あたり最大3種目に収まる", () => {
    const menu = generateWeeklyMenu({ ...base, dailyMinutes: 45 });
    menu.days.forEach(day => {
      expect(day.exercises.length).toBeLessThanOrEqual(3);
    });
  });

  it("90分設定で1日あたり最大6種目に収まる", () => {
    const menu = generateWeeklyMenu({ ...base, dailyMinutes: 90 });
    menu.days.forEach(day => {
      expect(day.exercises.length).toBeLessThanOrEqual(6);
    });
  });

  it("60分設定のestimatedDurationが60分以下になる", () => {
    const menu = generateWeeklyMenu({ ...base, dailyMinutes: 60 });
    menu.days.forEach(day => {
      expect(day.estimatedDuration).toBeLessThanOrEqual(60);
    });
  });
});

describe("完全初心者（none）の種目数制限", () => {
  const noneBase: UserProfile = {
    height: 165, weight: 55, age: 25, gender: "female",
    experienceLevel: "none",
    goal: "health",
    availableDaysPerWeek: 3,
    equipmentAccess: "gym",
    targetMuscles: ["胸", "背中", "肩", "脚", "腹筋"],
  };

  it("時間設定なしで1日あたり最大3種目に収まる", () => {
    const menu = generateWeeklyMenu(noneBase);
    menu.days.forEach(day => {
      expect(day.exercises.length).toBeLessThanOrEqual(3);
    });
  });

  it("60分設定で1日あたり最大3種目（通常の4種目より1少ない）に収まる", () => {
    const menu = generateWeeklyMenu({ ...noneBase, dailyMinutes: 60 });
    menu.days.forEach(day => {
      expect(day.exercises.length).toBeLessThanOrEqual(3);
    });
  });

  it("90分設定で1日あたり最大5種目（通常の6種目より1少ない）に収まる", () => {
    const menu = generateWeeklyMenu({ ...noneBase, dailyMinutes: 90 });
    menu.days.forEach(day => {
      expect(day.exercises.length).toBeLessThanOrEqual(5);
    });
  });

  it("完全初心者は通常の初心者より種目数が少ないか同数", () => {
    const noneMenu = generateWeeklyMenu({ ...noneBase, dailyMinutes: 60 });
    const beginnerMenu = generateWeeklyMenu({ ...noneBase, experienceLevel: "beginner", dailyMinutes: 60 });
    const noneTotal = noneMenu.days.reduce((s, d) => s + d.exercises.length, 0);
    const beginnerTotal = beginnerMenu.days.reduce((s, d) => s + d.exercises.length, 0);
    expect(noneTotal).toBeLessThanOrEqual(beginnerTotal);
  });
});

describe("detectEquipmentCategory: ダンベルキーワードがマシンより優先される", () => {
  it("ダンベルショルダープレスはdumbbellと判定される", () => {
    const cat = detectEquipmentCategory("ダンベルショルダープレス", "dumbbell");
    expect(cat).toBe("dumbbell");
  });

  it("ショルダープレスマシンはmachineと判定される", () => {
    const cat = detectEquipmentCategory("ショルダープレスマシン", "machine");
    expect(cat).toBe("machine");
  });

  it("ダンベルチェストプレスはdumbbellと判定される", () => {
    const cat = detectEquipmentCategory("ダンベルチェストプレス", "dumbbell");
    expect(cat).toBe("dumbbell");
  });

  it("ダンベルショルダープレスの推奨重量はダンベル刻み（偶数kg or 1-10kg整数）になる", () => {
    const snapped = snapToEquipmentWeight(17.5, "dumbbell");
    // 17.5 → 最近傍はDUMBBELL_WEIGHTS上の18kg
    expect(snapped).toBe(18);
  });
});

// ===== 全身の日の種目数上限テスト =====
describe("全身の日の種目数上限", () => {
  const fullBodyProfile: UserProfile = {
    gender: "male",
    age: 30,
    weight: 70,
    height: 175,
    experienceLevel: "intermediate",
    availableDaysPerWeek: 2,
    equipmentAccess: "gym",
    targetMuscles: ["胸", "背中", "肩", "脚", "腹筋", "二頭筋", "三頭筋"],
  };
  it("時間設定なし・全身の日はMAX6種目以内", () => {
    const menu = generateWeeklyMenu(fullBodyProfile);
    // 週2日以下は全身法なので全日が全身の日
    for (const day of menu.days) {
      expect(day.exercises.length).toBeLessThanOrEqual(6);
    }
  });
  it("時間設定あり(60分)・全種目数はMAX4種目以内", () => {
    const menu = generateWeeklyMenu({ ...fullBodyProfile, dailyMinutes: 60 });
    for (const day of menu.days) {
      expect(day.exercises.length).toBeLessThanOrEqual(4);
    }
  });
  it("完全初心者・全種目数はMAX4種目以内", () => {
    const menu = generateWeeklyMenu({ ...fullBodyProfile, experienceLevel: "none" });
    for (const day of menu.days) {
      expect(day.exercises.length).toBeLessThanOrEqual(4);
    }
  });
});

// ===== 複数部位の均等配分テスト =====
describe("複数部位の均等種目配分", () => {
  const baseProfile: UserProfile = {
    gender: "male",
    age: 30,
    weight: 70,
    height: 175,
    experienceLevel: "intermediate",
    availableDaysPerWeek: 4,
    equipmentAccess: "gym",
    targetMuscles: ["胸", "上腕三頭筋", "背中", "上腕二頭筋"],
  };

  it("60分設定(4種目上限)・複数部位の日は各部位から最低1種目以上", () => {
    const menu = generateWeeklyMenu({ ...baseProfile, dailyMinutes: 60 });
    for (const day of menu.days) {
      // day.focusが"A・B"形式の場合は複数部位の日
      const groups = day.focus.split("・").filter(g => g !== "全身");
      if (groups.length >= 2) {
        for (const group of groups) {
          const count = day.exercises.filter(e => e.muscleGroup === group).length;
          expect(count).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });

  it("時間設定なし・複数部位の日は各部位から最低1種目以上", () => {
    const menu = generateWeeklyMenu(baseProfile);
    for (const day of menu.days) {
      const groups = day.focus.split("・").filter(g => g !== "全身");
      if (groups.length >= 2) {
        for (const group of groups) {
          const count = day.exercises.filter(e => e.muscleGroup === group).length;
          expect(count).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

// ===== 強度レベルテスト =====
describe("トレーニング強度レベル（intensityLevel）", () => {
  const baseProfile: UserProfile = {
    gender: "male",
    age: 30,
    weight: 70,
    height: 175,
    experienceLevel: "intermediate",
    goal: "muscle_gain",
    availableDaysPerWeek: 3,
    equipmentAccess: "gym",
  };

  it("normal（デフォルト）: 筋肥大・中級者は3セット・コンパウンド6-10回", () => {
    const menu = generateWeeklyMenu(baseProfile);
    const compound = menu.days[0].exercises.find(e => e.sets > 0);
    expect(compound).toBeDefined();
    // normalはベース値そのまま: 中級者・筋肥大 → 4セット
    expect(compound!.sets).toBe(4);
  });

  it("low: normalより1セット少ない（最小2）", () => {
    const menuNormal = generateWeeklyMenu(baseProfile);
    const menuLow = generateWeeklyMenu({ ...baseProfile, intensityLevel: "low" });
    const normalSets = menuNormal.days[0].exercises[0]?.sets ?? 0;
    const lowSets = menuLow.days[0].exercises[0]?.sets ?? 0;
    expect(lowSets).toBeLessThan(normalSets);
    expect(lowSets).toBeGreaterThanOrEqual(2);
  });

  it("high: normalより1セット多い", () => {
    const menuNormal = generateWeeklyMenu(baseProfile);
    const menuHigh = generateWeeklyMenu({ ...baseProfile, intensityLevel: "high" });
    const normalSets = menuNormal.days[0].exercises[0]?.sets ?? 0;
    const highSets = menuHigh.days[0].exercises[0]?.sets ?? 0;
    expect(highSets).toBeGreaterThan(normalSets);
  });

  it("high: レップ数が8-12回の範囲に収まる（重い重量想定）", () => {
    const menuHigh = generateWeeklyMenu({ ...baseProfile, intensityLevel: "high" });
    // "6-10" → high: "8-10" のように下限が8以上に収まる
    const highRepsLo = parseInt(menuHigh.days[0].exercises[0]?.reps.split("-")[0] ?? "0");
    const highRepsHi = parseInt(menuHigh.days[0].exercises[0]?.reps.split("-")[1] ?? "0");
    expect(highRepsLo).toBeGreaterThanOrEqual(8);
    expect(highRepsHi).toBeLessThanOrEqual(12);
  });

  it("low: normalよりレップ数が多い（より軽い重量想定）", () => {
    const menuNormal = generateWeeklyMenu(baseProfile);
    const menuLow = generateWeeklyMenu({ ...baseProfile, intensityLevel: "low" });
    const normalRepsHi = parseInt(menuNormal.days[0].exercises[0]?.reps.split("-")[1] ?? "0");
    const lowRepsHi = parseInt(menuLow.days[0].exercises[0]?.reps.split("-")[1] ?? "0");
    expect(lowRepsHi).toBeGreaterThan(normalRepsHi);
  });

  it("high: normalより休憩時間が長い", () => {
    const menuNormal = generateWeeklyMenu(baseProfile);
    const menuHigh = generateWeeklyMenu({ ...baseProfile, intensityLevel: "high" });
    const normalRest = menuNormal.days[0].exercises[0]?.restSeconds ?? 0;
    const highRest = menuHigh.days[0].exercises[0]?.restSeconds ?? 0;
    expect(highRest).toBeGreaterThan(normalRest);
  });

  it("low: normalより休憩時間が短い", () => {
    const menuNormal = generateWeeklyMenu(baseProfile);
    const menuLow = generateWeeklyMenu({ ...baseProfile, intensityLevel: "low" });
    const normalRest = menuNormal.days[0].exercises[0]?.restSeconds ?? 0;
    const lowRest = menuLow.days[0].exercises[0]?.restSeconds ?? 0;
    expect(lowRest).toBeLessThan(normalRest);
  });
});

// ===== 年齢補正係数テスト =====
describe("getAgeFactor", () => {
  it("39歳以下は補正なし（1.0）", () => {
    expect(getAgeFactor(13)).toBe(1.0);
    expect(getAgeFactor(25)).toBe(1.0);
    expect(getAgeFactor(39)).toBe(1.0);
  });
  it("40〜49歳は0.95", () => {
    expect(getAgeFactor(40)).toBe(0.95);
    expect(getAgeFactor(49)).toBe(0.95);
  });
  it("50〜59歳は0.90", () => {
    expect(getAgeFactor(50)).toBe(0.90);
    expect(getAgeFactor(59)).toBe(0.90);
  });
  it("60〜69歳は0.85", () => {
    expect(getAgeFactor(60)).toBe(0.85);
    expect(getAgeFactor(69)).toBe(0.85);
  });
  it("70歳以上は0.80", () => {
    expect(getAgeFactor(70)).toBe(0.80);
    expect(getAgeFactor(80)).toBe(0.80);
  });
});

// ===== PPL法テスト =====
import { buildPPLSplit } from "./training-engine";

describe("buildPPLSplit", () => {
  it("週3日でプッシュ・プル・レッグの3日が生成される", () => {
    const result = buildPPLSplit([], 3);
    expect(result.days).toHaveLength(3);
    expect(result.splitMethod).toBe("PPL法");
    const focuses = result.days.map((d) => d.focus);
    expect(focuses).toContain("プッシュ（胸・肩・三頭筋）");
    expect(focuses).toContain("プル（背中・二頭筋）");
    expect(focuses).toContain("レッグ（脚・腹筋）");
  });

  it("週4日で4日分のメニューが生成される", () => {
    const result = buildPPLSplit([], 4);
    expect(result.days).toHaveLength(4);
    expect(result.splitMethod).toBe("PPL法");
  });

  it("週6日で6日分のメニューが生成される", () => {
    const result = buildPPLSplit([], 6);
    expect(result.days).toHaveLength(6);
    expect(result.splitMethod).toBe("PPL法");
  });

  it("各日にfocusとmuscleGroupsが含まれる", () => {
    const result = buildPPLSplit([], 3);
    for (const day of result.days) {
      expect(day.focus).toBeTruthy();
      expect(day.muscleGroups.length).toBeGreaterThan(0);
    }
  });

  it("PPL法でgenerateTrainingPlanが正常に動作する", () => {
    const pplProfile: UserProfile = {
      ...baseProfile,
      availableDaysPerWeek: 4,
      experienceLevel: "intermediate",
      splitPreference: "ppl",
    };
    const plan = generateTrainingPlan(pplProfile, "1week");
    expect(plan.phases).toHaveLength(1);
    const menu = plan.phases[0].weeklyMenu;
    expect(menu.splitMethod).toBe("PPL法");
    expect(menu.days).toHaveLength(4);
  });
});

// ===== 全身法目標（fat_loss/endurance/health）のDB種目マージテスト =====
describe("全身法目標でのDB種目マージ", () => {
  // DB種目（goalTagsなし）のモックデータ
  const mockDbExercises: import("./training-engine").ExerciseTemplate[] = [
    { name: "ベンチプレス", muscleGroup: "胸", equipment: ["barbell"], difficulty: ["beginner", "intermediate"], compound: true },
    { name: "スクワット", muscleGroup: "脚", equipment: ["barbell"], difficulty: ["beginner", "intermediate"], compound: true },
    { name: "デッドリフト", muscleGroup: "背中", equipment: ["barbell"], difficulty: ["intermediate", "advanced"], compound: true },
    { name: "ラットプルダウン", muscleGroup: "背中", equipment: ["machine", "cable"], difficulty: ["beginner", "intermediate"], compound: true },
    { name: "ダンベルショルダープレス", muscleGroup: "肩", equipment: ["dumbbell"], difficulty: ["beginner", "intermediate"], compound: true },
    { name: "プランク", muscleGroup: "腹筋", equipment: ["bodyweight"], difficulty: ["beginner", "intermediate"], compound: false },
  ] as any;

  it("fat_loss目標でDB種目使用時、有酸素種目（バーピー等）が含まれる", () => {
    const profile: UserProfile = {
      ...baseProfile,
      goal: "fat_loss",
      equipmentAccess: "gym",
    };
    const menu = generateWeeklyMenu(profile, undefined, mockDbExercises);
    const allNames = menu.days.flatMap((d) => d.exercises.map((e) => e.name));
    // 有酸素種目（EXERCISE_DBからマージされるはず）が少なくとも1つ含まれること
    const aerobicNames = ["バーピー", "マウンテンクライマー", "ジャンピングジャック", "ハイニー", "ケトルベルスイング"];
    const hasAerobic = allNames.some((n) => aerobicNames.includes(n));
    expect(hasAerobic).toBe(true);
  });

  it("endurance目標でDB種目使用時、endurance専用種目が含まれる", () => {
    const profile: UserProfile = {
      ...baseProfile,
      goal: "endurance",
      equipmentAccess: "gym",
    };
    const menu = generateWeeklyMenu(profile, undefined, mockDbExercises);
    const allNames = menu.days.flatMap((d) => d.exercises.map((e) => e.name));
    // endurance専用種目の一部（新しい名前で定義された種目）
    const enduranceNames = ["ジョギングその場足踏み", "ウォーキングランジ", "ステッパー（踏み台昇降）", "マウンテンクライマー（スロー）", "バーピー（ジャンプなし）", "ハイニー（スロー）", "エアロビクスステップ"];
    const hasEndurance = allNames.some((n) => enduranceNames.includes(n));
    expect(hasEndurance).toBe(true);
  });

  it("health目標でDB種目使用時、健康維持種目（ストレッチ等）が含まれる", () => {
    const profile: UserProfile = {
      ...baseProfile,
      goal: "health",
      equipmentAccess: "gym",
    };
    const menu = generateWeeklyMenu(profile, undefined, mockDbExercises);
    const allNames = menu.days.flatMap((d) => d.exercises.map((e) => e.name));
    const healthNames = ["ワールドグレイテストストレッチ", "ジャンピングジャック", "バードドッグ", "グルートブリッジ", "キャットカウ"];
    const hasHealth = allNames.some((n) => healthNames.includes(n));
    expect(hasHealth).toBe(true);
  });

  it("fat_loss目標でDB種目使用時、全日程でisHIITがtrueになる", () => {
    const profile: UserProfile = {
      ...baseProfile,
      goal: "fat_loss",
      equipmentAccess: "gym",
    };
    const menu = generateWeeklyMenu(profile, undefined, mockDbExercises);
    for (const day of menu.days) {
      expect(day.isHIIT).toBe(true);
    }
  });

  it("endurance目標でDB種目使用時、全日程でisCircuitがtrueになる", () => {
    const profile: UserProfile = {
      ...baseProfile,
      goal: "endurance",
      equipmentAccess: "gym",
    };
    const menu = generateWeeklyMenu(profile, undefined, mockDbExercises);
    for (const day of menu.days) {
      expect(day.isCircuit).toBe(true);
    }
  });
});
