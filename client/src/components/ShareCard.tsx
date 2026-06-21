import { forwardRef } from "react";

// ── カラー定数（html2canvas はCSS変数・8桁HEX・oklch を解釈できないため全て直値）
const C = {
  bg: "#0b0e1a",
  bgCard: "#111827",
  orange: "#f97316",
  text: "#f1f5f9",
  muted: "#94a3b8",
  border: "#1e293b",
  orangeDim: "#7c3a0a",
  orangeGlow:  "rgba(249,115,22,0.53)",
  orangeGlow2: "rgba(249,115,22,0.40)",
  orangeGlow3: "rgba(249,115,22,0.80)",
  orangeLine:  "rgba(249,115,22,0.38)",
  orangeBg:    "rgba(249,115,22,0.08)",
  orangeBgDim: "rgba(249,115,22,0.06)",
  bgTransp: "rgba(11,14,26,0)",
} as const;

const s = {
  card: {
    width: 405,
    height: 720,
    background: C.bg,
    fontFamily: '"Orbitron", "Inter", system-ui, sans-serif',
    color: C.text,
    display: "flex" as const,
    flexDirection: "column" as const,
    overflow: "hidden",
    position: "relative" as const,
  },
  header: {
    padding: "20px 24px 16px",
    borderBottom: `1px solid ${C.border}`,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  logoMark: {
    display: "flex" as const,
    alignItems: "baseline" as const,
  },
  logoDot: {
    fontSize: 22,
    fontWeight: 900,
    color: C.orange,
    letterSpacing: "-0.02em",
    lineHeight: 1,
    textShadow: "0 0 16px rgba(249,115,22,0.53)",
  },
  logoSub: {
    fontSize: 9,
    fontWeight: 600,
    color: C.muted,
    letterSpacing: "0.25em",
    textTransform: "uppercase" as const,
    marginLeft: 6,
  },
  footer: {
    marginTop: "auto" as const,
    padding: "14px 24px",
    borderTop: `1px solid ${C.border}`,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  footerUrl: {
    fontSize: 9,
    color: C.muted,
    letterSpacing: "0.1em",
  },
  footerHash: {
    fontSize: 9,
    color: C.orange,
    opacity: 0.7,
    letterSpacing: "0.05em",
  },
} as const;

function ScanlineOverlay() {
  return (
    <div style={{
      position: "absolute",
      top: 0, right: 0, bottom: 0, left: 0,
      pointerEvents: "none",
      background: "repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(255,255,255,0.018) 3px, rgba(255,255,255,0.018) 4px)",
    }} />
  );
}

function CardLogo() {
  return (
    <div style={s.logoMark}>
      <span style={s.logoDot}>M.</span>
      <span style={s.logoSub}>AutoPlanning</span>
    </div>
  );
}

function CardFooter({ hashtags = "#筋トレ #MAutoPlanning" }: { hashtags?: string }) {
  return (
    <div style={s.footer}>
      <span style={s.footerUrl}>m-autoplanning.com</span>
      <span style={s.footerHash}>{hashtags}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// 今日のワークアウトカード（インパクト重視リデザイン）
// ────────────────────────────────────────────────────────────────
export type TodayCardProps = {
  date: string;
  streak: number;
  menuTitle: string;
  exercises: Array<{
    name: string;
    sets: Array<{ weight?: number | null; reps?: number | null }>;
  }>;
  completedSets: number;
  totalSets: number;
};

export const TodayShareCard = forwardRef<HTMLDivElement, TodayCardProps>(
  ({ date, streak, menuTitle, exercises, completedSets, totalSets }, ref) => {
    const pct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
    const displayExercises = exercises.slice(0, 4);
    const hasMore = exercises.length > 4;

    return (
      <div ref={ref} style={s.card}>
        <ScanlineOverlay />

        {/* ヘッダー */}
        <div style={s.header}>
          <CardLogo />
          <span style={{ fontSize: 9, color: C.muted, letterSpacing: "0.12em", fontFamily: "monospace" }}>
            {date}
          </span>
        </div>

        {/* メインビジュアル: 完了率 大表示 */}
        <div style={{
          margin: "28px 24px 0",
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          position: "relative",
        }}>
          {/* 背景グロー */}
          <div style={{
            position: "absolute",
            width: 180, height: 100,
            borderRadius: "50%",
            background: `radial-gradient(ellipse at center, rgba(249,115,22,0.18) 0%, rgba(249,115,22,0) 70%)`,
            left: "50%",
            transform: "translateX(-50%)",
            top: 0,
          }} />
          <div style={{ textAlign: "center" as const }}>
            <div style={{ fontSize: 9, color: C.orange, letterSpacing: "0.3em", marginBottom: 6 }}>
              WORKOUT COMPLETE
            </div>
            <div style={{
              fontSize: 88,
              fontWeight: 900,
              color: C.orange,
              lineHeight: 1,
              fontFamily: "monospace",
              textShadow: `0 0 30px rgba(249,115,22,0.70), 0 0 60px rgba(249,115,22,0.30)`,
            }}>
              {pct}
            </div>
            <div style={{ fontSize: 20, color: C.orange, fontWeight: 700, opacity: 0.85, marginTop: 2 }}>
              %
            </div>
            <div style={{ fontSize: 10, color: C.muted, letterSpacing: "0.15em", marginTop: 4 }}>
              {completedSets} / {totalSets} SETS
            </div>
          </div>
        </div>

        {/* 区切り線 */}
        <div style={{ margin: "20px 24px 0", height: 1, background: `linear-gradient(to right, ${C.bgTransp}, ${C.orangeLine}, ${C.bgTransp})` }} />

        {/* ストリーク + メニュータイトル */}
        <div style={{ padding: "14px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 10, color: C.muted, fontFamily: '"Noto Sans JP", sans-serif' }}>{menuTitle}</div>
          {streak > 0 && (
            <div style={{
              display: "flex",
              alignItems: "center",
              background: C.orangeBg,
              border: `1px solid ${C.orangeDim}`,
              padding: "3px 8px",
            }}>
              <span style={{ fontSize: 12, marginRight: 4 }}>🔥</span>
              <span style={{ fontSize: 10, color: C.orange, fontWeight: 700, fontFamily: "monospace" }}>
                {streak}日
              </span>
            </div>
          )}
        </div>

        {/* 種目リスト */}
        <div style={{ padding: "10px 24px", flex: 1 }}>
          {displayExercises.map((ex, i) => (
            <div key={i} style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: i < displayExercises.length - 1 ? `1px solid ${C.border}` : "none",
            }}>
              <span style={{ fontSize: 11, color: C.text, fontFamily: '"Noto Sans JP", sans-serif' }}>
                {ex.name}
              </span>
              <div style={{ display: "flex", gap: 4 }}>
                {ex.sets.slice(0, 3).map((set, si) => (
                  <span key={si} style={{
                    fontSize: 9,
                    fontFamily: "monospace",
                    color: C.orange,
                    background: C.orangeBg,
                    border: `1px solid ${C.orangeDim}`,
                    padding: "2px 5px",
                  }}>
                    {set.weight ? `${set.weight}kg` : ""}
                    {set.weight && set.reps ? "×" : ""}
                    {set.reps ? `${set.reps}` : "—"}
                  </span>
                ))}
                {ex.sets.length > 3 && (
                  <span style={{ fontSize: 9, color: C.muted, fontFamily: "monospace" }}>+{ex.sets.length - 3}</span>
                )}
              </div>
            </div>
          ))}
          {hasMore && (
            <div style={{ fontSize: 9, color: C.muted, marginTop: 6 }}>
              他 {exercises.length - 4} 種目
            </div>
          )}
        </div>

        <CardFooter />
      </div>
    );
  }
);
TodayShareCard.displayName = "TodayShareCard";

// ────────────────────────────────────────────────────────────────
// マイ統計カード（グロー強化）
// ────────────────────────────────────────────────────────────────
export type StatsCardProps = {
  streak: number;
  monthlySessions: number;
  monthlyVolume: number;
  personalRecords: Array<{ exerciseName: string; maxWeight: number }>;
};

export const StatsShareCard = forwardRef<HTMLDivElement, StatsCardProps>(
  ({ streak, monthlySessions, monthlyVolume, personalRecords }, ref) => {
    const month = new Date().toLocaleDateString("ja-JP", { month: "long" });

    return (
      <div ref={ref} style={s.card}>
        <ScanlineOverlay />

        {/* ヘッダー */}
        <div style={s.header}>
          <CardLogo />
          <span style={{ fontSize: 8, color: C.muted, letterSpacing: "0.2em" }}>MY STATS</span>
        </div>

        {/* ストリーク大表示 */}
        <div style={{
          margin: "24px 24px 0",
          padding: "20px",
          background: C.orangeBgDim,
          border: `1px solid ${C.orangeDim}`,
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          position: "relative",
        }}>
          {/* 背景グロー */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse at center, rgba(249,115,22,0.10) 0%, rgba(249,115,22,0) 70%)`,
            pointerEvents: "none",
          }} />
          <span style={{ fontSize: 13 }}>🔥</span>
          <span style={{
            fontSize: 68,
            fontWeight: 900,
            color: C.orange,
            lineHeight: 1,
            marginTop: 6,
            textShadow: "0 0 32px rgba(249,115,22,0.70), 0 0 64px rgba(249,115,22,0.30)",
          }}>
            {streak}
          </span>
          <span style={{ fontSize: 9, color: C.muted, letterSpacing: "0.25em", marginTop: 4 }}>DAY STREAK</span>
        </div>

        {/* 今月の数値 */}
        <div style={{ display: "flex", margin: "14px 24px 0" }}>
          {[
            { label: `${month}のトレーニング`, value: `${monthlySessions}`, unit: "日" },
            { label: "今月の総ボリューム", value: monthlyVolume > 0 ? monthlyVolume.toLocaleString() : "—", unit: monthlyVolume > 0 ? "kg" : "" },
          ].map((item, i) => (
            <div key={i} style={{
              flex: 1,
              padding: "12px 10px",
              border: `1px solid ${C.border}`,
              background: C.bgCard,
              textAlign: "center" as const,
              marginLeft: i > 0 ? 10 : 0,
            }}>
              <div style={{ fontSize: 7, color: C.muted, marginBottom: 6, letterSpacing: "0.05em" }}>{item.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
                <div style={{ fontSize: 26, fontWeight: 900, color: C.orange, fontFamily: "monospace", textShadow: "0 0 12px rgba(249,115,22,0.40)" }}>{item.value}</div>
                {item.unit && <div style={{ fontSize: 12, color: C.orange, fontWeight: 700, opacity: 0.8 }}>{item.unit}</div>}
              </div>
            </div>
          ))}
        </div>

        {/* 自己記録 */}
        {personalRecords.length > 0 && (
          <div style={{ margin: "14px 24px 0", flex: 1 }}>
            <div style={{ fontSize: 8, color: C.orange, letterSpacing: "0.2em", marginBottom: 8 }}>
              PERSONAL RECORDS
            </div>
            <div style={{ height: 1, background: `linear-gradient(to right, ${C.orangeLine}, ${C.bgTransp})`, marginBottom: 10 }} />
            {personalRecords.slice(0, 5).map((pr, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: "space-between" as const,
                alignItems: "center" as const,
                padding: "7px 0",
                borderBottom: i < Math.min(personalRecords.length, 5) - 1 ? `1px solid ${C.border}` : "none",
              }}>
                <span style={{ fontSize: 11, color: C.text, fontFamily: '"Noto Sans JP", sans-serif' }}>
                  {pr.exerciseName}
                </span>
                <span style={{ fontSize: 15, fontWeight: 900, color: C.orange, fontFamily: "monospace", textShadow: "0 0 8px rgba(249,115,22,0.40)" }}>
                  {pr.maxWeight}kg
                </span>
              </div>
            ))}
          </div>
        )}

        <CardFooter />
      </div>
    );
  }
);
StatsShareCard.displayName = "StatsShareCard";

// ────────────────────────────────────────────────────────────────
// PR達成カード（インパクト特化）
// ────────────────────────────────────────────────────────────────
export type PRCardProps = {
  exerciseName: string;
  weight: number;
  date: string;
};

export const PRShareCard = forwardRef<HTMLDivElement, PRCardProps>(
  ({ exerciseName, weight, date }, ref) => {
    return (
      <div ref={ref} style={s.card}>
        <ScanlineOverlay />

        {/* ヘッダー */}
        <div style={s.header}>
          <CardLogo />
          <span style={{ fontSize: 9, color: C.muted, letterSpacing: "0.12em", fontFamily: "monospace" }}>
            {date}
          </span>
        </div>

        {/* メインビジュアル */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column" as const,
          alignItems: "center",
          justifyContent: "center",
          padding: "0 24px",
          position: "relative",
        }}>
          {/* 背景グロー */}
          <div style={{
            position: "absolute",
            width: 280, height: 200,
            borderRadius: "50%",
            background: "radial-gradient(ellipse at center, rgba(249,115,22,0.20) 0%, rgba(249,115,22,0) 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
          }} />

          {/* NEW PR ラベル */}
          <div style={{
            fontSize: 10,
            color: C.orange,
            letterSpacing: "0.35em",
            fontWeight: 700,
            marginBottom: 28,
            border: `1px solid ${C.orangeDim}`,
            padding: "4px 16px",
            background: C.orangeBg,
          }}>
            NEW PERSONAL RECORD
          </div>

          {/* 種目名 */}
          <div style={{
            fontSize: 20,
            fontWeight: 700,
            color: C.text,
            marginBottom: 20,
            textAlign: "center" as const,
            fontFamily: '"Noto Sans JP", sans-serif',
            letterSpacing: "0.05em",
          }}>
            {exerciseName}
          </div>

          {/* 重量 大表示 */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <div style={{
              fontSize: 100,
              fontWeight: 900,
              color: C.orange,
              lineHeight: 1,
              fontFamily: "monospace",
              textShadow: "0 0 40px rgba(249,115,22,0.90), 0 0 80px rgba(249,115,22,0.50), 0 0 120px rgba(249,115,22,0.20)",
            }}>
              {weight}
            </div>
            <div style={{ fontSize: 28, color: C.orange, fontWeight: 700, marginBottom: 8, marginLeft: 6, opacity: 0.85 }}>
              kg
            </div>
          </div>

          {/* 区切り装飾 */}
          <div style={{
            width: 100, height: 2,
            background: `linear-gradient(to right, ${C.bgTransp}, ${C.orange}, ${C.bgTransp})`,
            marginTop: 32,
            boxShadow: "0 0 8px rgba(249,115,22,0.50)",
          }} />
        </div>

        <CardFooter hashtags="#PR達成 #筋トレ #MAutoPlanning" />
      </div>
    );
  }
);
PRShareCard.displayName = "PRShareCard";
