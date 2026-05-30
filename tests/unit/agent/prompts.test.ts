import { describe, expect, it } from "vitest";

import { buildAnalysisPrompt } from "@/agent/prompts/analysis";
import { COGNITIVE_BIASES, DECISION_CATEGORIES } from "@/lib/taxonomy";

describe("analysis prompts", () => {
  it("lists every canonical category and bias identifier in the static prefix", () => {
    const prompt = buildAnalysisPrompt({
      locale: "en",
      situation: "I might leave my job.",
      decision: "Accept a new role.",
    });

    for (const category of DECISION_CATEGORIES) {
      expect(prompt.staticPrefix).toContain(category);
    }
    for (const bias of COGNITIVE_BIASES) {
      expect(prompt.staticPrefix).toContain(bias);
    }
  });

  it("keeps taxonomy identifiers language-neutral while applying locale to prose", () => {
    const prompt = buildAnalysisPrompt({
      locale: "uk",
      situation: "I might leave my job.",
      decision: "Accept a new role.",
    });

    expect(prompt.dynamicContent).toContain("uk");
    expect(prompt.fullPrompt).toContain("category");
    expect(prompt.fullPrompt).toContain("confirmation_bias");
    expect(prompt.fullPrompt).not.toContain("Упередження підтвердження");
  });

  it("includes prior patterns when provided and remains valid without them", () => {
    const withPriorPatterns = buildAnalysisPrompt({
      locale: "en",
      situation: "I might hire too quickly.",
      decision: "Hire the first qualified candidate.",
      reasoning: "The team is overloaded.",
      priorPatterns: ["You often overweight speed when the team is under pressure."],
    });
    const withoutPriorPatterns = buildAnalysisPrompt({
      locale: "en",
      situation: "I might hire too quickly.",
      decision: "Hire the first qualified candidate.",
    });

    expect(withPriorPatterns.dynamicContent).toContain(
      "You often overweight speed when the team is under pressure.",
    );
    expect(withoutPriorPatterns.dynamicContent).toContain("Prior patterns: none");
  });
});
