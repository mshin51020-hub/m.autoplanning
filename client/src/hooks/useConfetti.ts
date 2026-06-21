import confetti from "canvas-confetti";

const BRAND_COLORS = ["#f97316", "#fb923c", "#fbbf24", "#ffffff", "#22c55e", "#38bdf8"];

export function useConfetti() {
  const fire = (strength: "light" | "normal" | "heavy" = "normal") => {
    const configs: Record<typeof strength, confetti.Options> = {
      light: { particleCount: 40, spread: 55, origin: { y: 0.65 } },
      normal: { particleCount: 80, spread: 70, origin: { y: 0.6 } },
      heavy: { particleCount: 150, spread: 90, origin: { y: 0.55 } },
    };
    confetti({ ...configs[strength], colors: BRAND_COLORS, disableForReducedMotion: true });
  };

  const fireSides = () => {
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0 }, colors: BRAND_COLORS });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1 }, colors: BRAND_COLORS });
  };

  return { fire, fireSides };
}
