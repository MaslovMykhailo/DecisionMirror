import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

/** Tokens declared in the `@theme inline { … }` block, as `--name` → value. */
function themeTokens(): Map<string, string> {
  const start = css.indexOf("@theme inline {");
  const open = css.indexOf("{", start);
  // Balance braces so nested values aren't truncated.
  let depth = 0;
  let end = open;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) {
      end = i;
      break;
    }
  }
  const body = css.slice(open + 1, end);
  const map = new Map<string, string>();
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(m[1]!, m[2]!.trim());
  }
  return map;
}

const theme = themeTokens();
const isColor = (v: string | undefined) => !!v && (v.startsWith("oklch(") || v.startsWith("var("));

describe("brand accent palette", () => {
  it.each(["sky", "mint", "pink", "yellow"])(
    "exposes --color-brand-%s as a defined color (bg-/text- utilities resolve)",
    (name) => {
      expect(isColor(theme.get(`--color-brand-${name}`))).toBe(true);
    },
  );

  it("maps the chart series onto the brand accents + primary", () => {
    expect(theme.get("--color-chart-1")).toBe("var(--color-brand-sky)");
    expect(theme.get("--color-chart-2")).toBe("var(--color-brand-mint)");
    expect(theme.get("--color-chart-3")).toBe("var(--color-brand-pink)");
    expect(theme.get("--color-chart-4")).toBe("var(--color-brand-yellow)");
    expect(theme.get("--color-chart-5")).toBe("var(--primary)");
  });
});
