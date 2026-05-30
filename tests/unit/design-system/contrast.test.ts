import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

/** Tokens declared in a `selector { … }` block, as `--name` → value. */
function tokens(selector: string): Map<string, string> {
  const start = css.indexOf(`${selector} {`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  const body = css.slice(open + 1, close);
  const map = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(m[1]!, m[2]!.trim());
  }
  return map;
}

/** Parse `oklch(L C H)` (opaque) into [L, C, H]. */
function parseOklch(value: string): [number, number, number] {
  const m = value.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\)/);
  if (!m) throw new Error(`Not an opaque oklch() value: ${value}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** OKLCH → WCAG relative luminance (via OKLab → linear sRGB). */
function luminance(value: string): number {
  const [L, C, hDeg] = parseOklch(value);
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;

  const lc = l_ ** 3;
  const mc = m_ ** 3;
  const sc = s_ ** 3;

  // Linear sRGB (already gamma-expanded), clamped to the display gamut.
  const r = Math.min(Math.max(4.0767416621 * lc - 3.3077115913 * mc + 0.2309699292 * sc, 0), 1);
  const g = Math.min(Math.max(-1.2684380046 * lc + 2.6097574011 * mc - 0.3413193965 * sc, 0), 1);
  const bl = Math.min(Math.max(-0.0041960863 * lc - 0.7034186147 * mc + 1.707614701 * sc, 0), 1);

  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

/** WCAG 2.x contrast ratio between two OKLCH colors. */
function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Body-text pairs that MUST clear the WCAG AA 4.5:1 threshold. */
const PAIRS: ReadonlyArray<[string, string]> = [
  ["--foreground", "--background"],
  ["--primary-foreground", "--primary"],
  ["--muted-foreground", "--muted"],
  ["--accent-foreground", "--accent"],
];

describe.each([
  ["light (:root)", ":root"],
  ["dark (.dark)", ".dark"],
])("contrast — %s", (_label, selector) => {
  const t = tokens(selector);
  const get = (name: string) => t.get(name) ?? tokens(":root").get(name)!;

  it.each(PAIRS)("%s on %s is ≥ 4.5:1", (fg, bg) => {
    const ratio = contrast(get(fg), get(bg));
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
