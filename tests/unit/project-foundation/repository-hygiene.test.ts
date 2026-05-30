import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

function trackedGitkeepFiles(): string[] {
  return execFileSync("git", ["ls-files", "*.gitkeep"], { encoding: "utf8" })
    .split("\n")
    .filter(Boolean)
    .filter((file) => existsSync(join(process.cwd(), file)))
    .sort();
}

describe("repository hygiene", () => {
  it("does not track project .gitkeep placeholders", () => {
    expect(trackedGitkeepFiles()).toEqual([]);
  });
});
