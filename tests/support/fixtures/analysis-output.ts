import type { AnalysisOutput } from "@/agent/schema";

export const validAnalysisOutput = {
  category: "career",
  biases: [
    {
      id: "anchoring",
      explanation: "The first salary range is carrying too much weight.",
    },
    {
      id: "confirmation_bias",
      explanation: "Evidence against the preferred role needs more attention.",
    },
  ],
  missedAlternatives: ["Negotiate a trial consulting project before resigning."],
  premortemRisks: ["The new role may not provide the autonomy promised."],
  keyAssumptions: ["The company has budget approval for the team expansion."],
  warningSigns: ["The hiring manager avoids answering questions about turnover."],
} satisfies AnalysisOutput;

export const invalidAnalysisOutputs = {
  unknownCategory: { ...validAnalysisOutput, category: "not_a_category" },
  unknownBias: {
    ...validAnalysisOutput,
    biases: [{ id: "recency_bias", explanation: "Recent events dominate the analysis." }],
  },
  missingRequiredSection: (() => {
    const payload: Record<string, unknown> = { ...validAnalysisOutput };
    delete payload.warningSigns;
    return payload;
  })(),
  emptyBiasExplanation: {
    ...validAnalysisOutput,
    biases: [{ id: "anchoring", explanation: "   " }],
  },
  emptyProse: { ...validAnalysisOutput, missedAlternatives: ["  "] },
  extraField: { ...validAnalysisOutput, confidenceScore: 0.9 },
} satisfies Record<string, unknown>;
