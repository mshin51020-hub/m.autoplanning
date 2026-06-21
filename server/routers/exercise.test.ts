import { describe, it, expect, vi, beforeEach } from "vitest";
import { jpToEnExercise } from "../../shared/exerciseMap";

// ── exerciseMap のユニットテスト ─────────────────────────────────────

describe("jpToEnExercise", () => {
  it("完全一致でベンチプレスを変換できる", () => {
    expect(jpToEnExercise("ベンチプレス")).toBe("Bench Press");
  });

  it("完全一致でスクワットを変換できる", () => {
    expect(jpToEnExercise("スクワット")).toBe("Barbell Full Squat");
  });

  it("完全一致でデッドリフトを変換できる", () => {
    expect(jpToEnExercise("デッドリフト")).toBe("Deadlifts");
  });

  it("完全一致でバーベルベンチプレスを変換できる", () => {
    expect(jpToEnExercise("バーベルベンチプレス")).toBe("Bench Press");
  });

  it("完全一致でダンベルカールを変換できる", () => {
    expect(jpToEnExercise("ダンベルカール")).toBe("Dumbbell Biceps Curl");
  });

  it("部分一致でベンチプレス系を変換できる", () => {
    const result = jpToEnExercise("インクラインベンチプレス（バーベル）");
    expect(result).not.toBeNull();
  });

  it("未登録の種目名はnullを返す", () => {
    expect(jpToEnExercise("存在しない種目XYZ")).toBeNull();
  });

  it("括弧を含む種目名を正規化して変換できる", () => {
    // 括弧除去後に一致するケース
    const result = jpToEnExercise("（バーベル）ベンチプレス");
    // 部分一致で "ベンチプレス" を含むため変換できるはず
    expect(result).not.toBeNull();
  });
});
