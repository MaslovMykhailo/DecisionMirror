import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const schema = readFileSync(join(process.cwd(), "prisma/schema.prisma"), "utf8");
const analysisModel = schema.match(/model Analysis \{[\s\S]*?\n\}/)?.[0] ?? "";

describe("Analysis Prisma model", () => {
  it("can store every structured section for ready analysis results", () => {
    expect(analysisModel).toContain("category      DecisionCategory?");
    expect(analysisModel).toContain("biases        Json?");
    expect(analysisModel).toContain("missedAlternatives Json?");
    expect(analysisModel).toContain("premortemRisks Json?");
    expect(analysisModel).toContain("keyAssumptions Json?");
    expect(analysisModel).toContain("warningSigns  Json?");
  });

  it("can store a failed analysis reason without requiring structured result fields", () => {
    expect(analysisModel).toContain("failureReason String?");
    for (const field of [
      "biases",
      "missedAlternatives",
      "premortemRisks",
      "keyAssumptions",
      "warningSigns",
    ]) {
      expect(analysisModel).toMatch(new RegExp(`\\b${field}\\s+Json\\?`));
    }
  });
});
