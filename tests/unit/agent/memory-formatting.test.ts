import { describe, expect, it } from "vitest";

import {
  buildDecisionMemoryDocument,
  formatPriorPatterns,
  MAX_MEMORY_DOCUMENT_CHARS,
  MAX_PRIOR_PATTERN_CHARS,
} from "@/agent/memory/document";
import { validAnalysisOutput } from "@/tests/support/fixtures/analysis-output";

describe("agent memory formatting", () => {
  it("builds a deterministic bounded memory document from decision input and analysis output", () => {
    const document = buildDecisionMemoryDocument({
      decisionInput: {
        situation: "Should I accept the new role?",
        decision: "Accept the offer.",
        reasoning: "It has more scope.",
      },
      analysis: validAnalysisOutput,
    });

    expect(document).toContain("Situation: Should I accept the new role?");
    expect(document).toContain("Decision: Accept the offer.");
    expect(document).toContain("Category: career");
    expect(document).toContain("Biases: anchoring");
    expect(document.length).toBeLessThanOrEqual(MAX_MEMORY_DOCUMENT_CHARS);
    expect(document).toBe(
      buildDecisionMemoryDocument({
        decisionInput: {
          situation: "Should I accept the new role?",
          decision: "Accept the offer.",
          reasoning: "It has more scope.",
        },
        analysis: validAnalysisOutput,
      }),
    );
  });

  it("formats bounded prior patterns and excludes the current decision when asked", () => {
    const patterns = formatPriorPatterns(
      [
        {
          decisionId: "current_decision",
          content: "This current decision should not echo back into the prompt.",
          distance: 0,
        },
        {
          decisionId: "prior_decision",
          content: `Prior hiring decision. ${"x".repeat(1000)}`,
          distance: 0.12,
        },
      ],
      { currentDecisionId: "current_decision", maxPatterns: 3 },
    );

    expect(patterns).toHaveLength(1);
    const pattern = patterns[0];
    expect(pattern).toBeDefined();
    expect(pattern).toContain("Prior hiring decision.");
    expect(pattern).toContain("similarity 0.880");
    expect(pattern).not.toContain("current decision");
    expect(pattern!.length).toBeLessThanOrEqual(MAX_PRIOR_PATTERN_CHARS);
  });
});
