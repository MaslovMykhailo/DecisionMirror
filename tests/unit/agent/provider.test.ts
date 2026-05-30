import { describe, expect, it, vi } from "vitest";

import { analysisOutputSchema } from "@/agent/schema";
import { validAnalysisOutput } from "@/tests/support/fixtures/analysis-output";

vi.mock("server-only", () => ({}));

describe("LangChain OpenAI analysis provider", () => {
  it("invokes a strict structured-output chat model with cacheable prompt ordering", async () => {
    const invoke = vi.fn().mockResolvedValue(validAnalysisOutput);
    const withStructuredOutput = vi.fn().mockReturnValue({ invoke });
    const { createLangChainOpenAIAnalysisProvider } = await import("@/agent/provider/openai");
    const provider = createLangChainOpenAIAnalysisProvider({
      chatModel: { withStructuredOutput },
      model: "gpt-test",
      environment: "test",
    });

    await expect(
      provider.analyzeDecision({
        locale: "uk",
        situation: "Private situation text",
        decision: "Private decision text",
        reasoning: "Private reasoning text",
        priorPatterns: ["Prior private pattern"],
      }),
    ).resolves.toEqual(validAnalysisOutput);

    expect(withStructuredOutput).toHaveBeenCalledWith(analysisOutputSchema, {
      name: "decision_analysis",
      method: "jsonSchema",
      strict: true,
    });

    const messages = invoke.mock.calls[0]?.[0] as Array<{ role?: string; content?: string }>;
    const config = invoke.mock.calls[0]?.[1] as {
      runName?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    };

    expect(messages).toHaveLength(2);
    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[1]).toMatchObject({ role: "user" });
    expect(messages[0]?.content).toContain("canonical category identifiers");
    expect(messages[0]?.content).not.toContain("Private situation text");
    expect(messages[0]?.content).not.toContain("Private decision text");
    expect(messages[0]?.content).not.toContain("Private reasoning text");
    expect(messages[1]?.content).toContain("Locale for all free-form prose: uk");
    expect(messages[1]?.content).toContain("Private situation text");
    expect(messages[1]?.content).toContain("Private decision text");
    expect(messages[1]?.content).toContain("Prior private pattern");
    expect(config).toMatchObject({
      runName: "decision-analysis",
      tags: ["agentic-analysis"],
      metadata: {
        model: "gpt-test",
        locale: "uk",
        environment: "test",
        priorPatternCount: 1,
      },
    });
  });
});
