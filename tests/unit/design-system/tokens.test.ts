import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

/** Extract the body of the first `selector { … }` block from the stylesheet. */
function block(selector: string): string {
  const start = css.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`No '${selector}' block found in globals.css`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

/** Map of `--token` → value for every custom property declared in a block. */
function tokens(selector: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of block(selector).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    map.set(match[1]!, match[2]!.trim());
  }
  return map;
}

/** The semantic tokens shadcn components bind to (surface + foreground pairs). */
const SEMANTIC_TOKENS = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
] as const;

describe("semantic color tokens", () => {
  const root = tokens(":root");
  const dark = tokens(".dark");

  it("defines every semantic token under :root", () => {
    for (const token of SEMANTIC_TOKENS) {
      expect(root.has(token), `:root is missing ${token}`).toBe(true);
    }
  });

  it("defines a dark equivalent for every :root semantic token", () => {
    for (const token of SEMANTIC_TOKENS) {
      expect(dark.has(token), `.dark is missing ${token}`).toBe(true);
    }
  });

  it("does not leave the primary at the shadcn neutral default", () => {
    // shadcn neutral primary is oklch(0.205 0 0); the Preply ink carries hue/chroma.
    expect(root.get("--primary")).not.toBe("oklch(0.205 0 0)");
  });
});
