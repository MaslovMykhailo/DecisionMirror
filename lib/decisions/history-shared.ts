import type { AnalysisOutput } from "@/agent/schema";
import type { CognitiveBias, DecisionCategory } from "@/lib/taxonomy";

// Client-safe history models and helpers. This module must NOT import the
// database client (directly or transitively) so it can be bundled into client
// components. Server-side query logic lives in `history.ts`, which re-exports
// everything here.

export type AnalysisStatus = "processing" | "ready" | "failed";

export type DecisionHistoryFilters = {
  category: DecisionCategory | null;
  bias: CognitiveBias | null;
};

export type DecisionHistorySort = "created_at" | "complexity";

export type DecisionHistoryAnalysisSummary = {
  analysisId: string;
  version: number;
  status: AnalysisStatus;
  updatedAt: string;
  isStalled: boolean;
  retryable: boolean;
  failureReason?: string;
};

export type DecisionHistoryItem = {
  id: string;
  summary: string;
  createdAt: string;
  updatedAt: string;
  newestAnalysis: DecisionHistoryAnalysisSummary | null;
  newestReadyCategory: DecisionCategory | null;
  complexity: number | null;
};

export type DecisionHistoryReadyAnalysis = {
  analysisId: string;
  version: number;
  updatedAt: string;
  result: AnalysisOutput;
};

export type DecisionHistoryDetail = {
  id: string;
  situation: string;
  decision: string;
  reasoning: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DecisionHistoryDetailResult =
  | { status: "unauthenticated" }
  | { status: "not_found" }
  | {
      status: "success";
      decision: DecisionHistoryDetail;
      newestAnalysis: DecisionHistoryAnalysisSummary | null;
      readyAnalysis: DecisionHistoryReadyAnalysis | null;
      readyAnalyses: DecisionHistoryReadyAnalysis[];
    };

export function deriveDecisionComplexity(analysis: AnalysisOutput | null) {
  if (!analysis) return null;
  return (
    analysis.biases.length + analysis.premortemRisks.length + analysis.missedAlternatives.length
  );
}
