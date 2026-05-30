import type { AnalysisPromptInput } from "@/agent/prompts/analysis";

export type AnalyzeDecisionInput = AnalysisPromptInput;

export type AnalysisProvider = {
  analyzeDecision: (input: AnalyzeDecisionInput) => Promise<unknown>;
};
