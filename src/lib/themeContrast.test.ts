import { describe, expect, it } from "vitest";

type Oklch = { l: number; c: number; h: number };

function parseOklch(value: string): Oklch {
  const match = value.match(/oklch\(([^ )]+)\s+([^ )]+)\s+([^ )]+)\)/);
  if (!match) {
    throw new Error(`Invalid oklch color: ${value}`);
  }

  return {
    l: Number(match[1]),
    c: Number(match[2]),
    h: Number(match[3]),
  };
}

function oklchToLinearSrgb(value: string): [number, number, number] {
  const { l, c, h } = parseOklch(value);
  const hueRadians = (h * Math.PI) / 180;
  const a = c * Math.cos(hueRadians);
  const b = c * Math.sin(hueRadians);

  const lPrime = l + 0.3963377774 * a + 0.2158037573 * b;
  const mPrime = l - 0.1055613458 * a - 0.0638541728 * b;
  const sPrime = l - 0.0894841775 * a - 1.291485548 * b;

  const lCube = lPrime ** 3;
  const mCube = mPrime ** 3;
  const sCube = sPrime ** 3;

  const red = 4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube;
  const green = -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube;
  const blue = -0.0041960863 * lCube - 0.7034186147 * mCube + 1.707614701 * sCube;

  const clamp = (component: number) => Math.max(0, Math.min(1, component));
  return [clamp(red), clamp(green), clamp(blue)];
}

function relativeLuminance(value: string): number {
  const [red, green, blue] = oklchToLinearSrgb(value);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(foreground: string, background: string): number {
  const fgLuminance = relativeLuminance(foreground);
  const bgLuminance = relativeLuminance(background);
  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("theme contrast", () => {
  it("meets WCAG AA contrast for key light and dark token pairs", () => {
    const pairs = [
      ["oklch(0.27 0.02 70)", "oklch(0.98 0.005 85)"],
      ["oklch(0.27 0.02 70)", "oklch(0.99 0.004 85)"],
      ["oklch(0.98 0.005 85)", "oklch(0.45 0.09 155)"],
      ["oklch(0.27 0.02 70)", "oklch(0.70 0.01 85)"],
      ["oklch(0.42 0.02 72)", "oklch(0.93 0.008 85)"],
      ["oklch(0.24 0.03 60)", "oklch(0.68 0.18 50)"],
      ["oklch(0.95 0.006 85)", "oklch(0.24 0.02 62)"],
      ["oklch(0.95 0.006 85)", "oklch(0.27 0.02 62)"],
      ["oklch(0.22 0.02 62)", "oklch(0.65 0.11 155)"],
      ["oklch(0.95 0.006 85)", "oklch(0.35 0.04 60)"],
      ["oklch(0.80 0.01 85)", "oklch(0.30 0.02 62)"],
      ["oklch(0.20 0.02 62)", "oklch(0.72 0.16 50)"],
    ] as const;

    for (const [foreground, background] of pairs) {
      expect(contrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});
