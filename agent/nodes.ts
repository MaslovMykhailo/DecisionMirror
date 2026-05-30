import { analysisOutputSchema, type AnalysisOutput } from "@/agent/schema";
import type { AnalysisProvider } from "@/agent/provider/types";
import { routing, type Locale } from "@/lib/i18n/routing";

type DecisionRecord = {
  id: string;
  userId: string;
  situation: string;
  decision: string;
  reasoning: string | null;
};

type ProcessingAnalysisRecord = {
  id: string;
  version: number;
};

export type AgentDb = {
  decision: {
    findUnique: (args: unknown) => Promise<DecisionRecord | null>;
  };
  analysis: {
    findFirst: (args: unknown) => Promise<ProcessingAnalysisRecord | null>;
    update: (args: unknown) => Promise<{ id: string }>;
  };
};

export type AgentMemory = {
  recall: (args: { userId: string; decisionId: string }) => Promise<string[]>;
  remember: (args: {
    userId: string;
    decisionId: string;
    analysis: AnalysisOutput;
  }) => Promise<void>;
};

export type AgentState = {
  decisionId: string;
  analysisId?: string;
  analysisVersion?: number;
  userId?: string;
  locale?: Locale;
  decisionInput?: {
    situation: string;
    decision: string;
    reasoning?: string | null;
  };
  priorPatterns?: string[];
  rawOutput?: unknown;
  validatedOutput?: AnalysisOutput;
  failureReason?: string;
  canAnalyze?: boolean;
};

type NodeResult = Partial<AgentState>;

export const noopMemory: AgentMemory = {
  recall: async () => [],
  remember: async () => undefined,
};

export function createLoadMemoryNode({
  db,
  memory = noopMemory,
}: {
  db: AgentDb;
  memory?: AgentMemory;
}) {
  return async function loadMemoryNode(state: AgentState): Promise<NodeResult> {
    const decision = await db.decision.findUnique({
      where: { id: state.decisionId },
      select: {
        id: true,
        userId: true,
        situation: true,
        decision: true,
        reasoning: true,
      },
    });

    if (!decision) {
      return {
        canAnalyze: false,
        failureReason: "No decision was found for analysis.",
      };
    }

    const analysis = await db.analysis.findFirst({
      where: { decisionId: state.decisionId, status: "processing" },
      orderBy: { version: "desc" },
      select: { id: true, version: true },
    });

    if (!analysis) {
      return {
        canAnalyze: false,
        userId: decision.userId,
        failureReason: "No processing analysis is available for this decision.",
      };
    }

    const priorPatterns = await memory.recall({
      decisionId: state.decisionId,
      userId: decision.userId,
    });

    return {
      canAnalyze: true,
      analysisId: analysis.id,
      analysisVersion: analysis.version,
      userId: decision.userId,
      locale: routing.defaultLocale,
      decisionInput: {
        situation: decision.situation,
        decision: decision.decision,
        reasoning: decision.reasoning,
      },
      priorPatterns,
    };
  };
}

export function createAnalyzeNode({ provider }: { provider: AnalysisProvider }) {
  return async function analyzeNode(state: AgentState): Promise<NodeResult> {
    if (!state.canAnalyze || !state.decisionInput) return {};

    return {
      rawOutput: await provider.analyzeDecision({
        locale: state.locale ?? routing.defaultLocale,
        situation: state.decisionInput.situation,
        decision: state.decisionInput.decision,
        reasoning: state.decisionInput.reasoning,
        priorPatterns: state.priorPatterns ?? [],
      }),
    };
  };
}

export async function validateNode(state: AgentState): Promise<NodeResult> {
  const result = analysisOutputSchema.safeParse(state.rawOutput);
  if (result.success) {
    return {
      validatedOutput: result.data,
      failureReason: undefined,
    };
  }

  const issuePaths = result.error.issues
    .map((issue) => (issue.path.length > 0 ? issue.path.join(".") : "root"))
    .slice(0, 3)
    .join(", ");

  return {
    validatedOutput: undefined,
    failureReason: `The structured analysis output did not match the contract${
      issuePaths ? ` (${issuePaths})` : ""
    }. Please retry.`,
  };
}

export function readyAnalysisData(output: AnalysisOutput) {
  return {
    status: "ready",
    category: output.category,
    biases: output.biases,
    missedAlternatives: output.missedAlternatives,
    premortemRisks: output.premortemRisks,
    keyAssumptions: output.keyAssumptions,
    warningSigns: output.warningSigns,
    failureReason: null,
  };
}

export function failedAnalysisData(failureReason: string) {
  return {
    status: "failed",
    category: null,
    biases: null,
    missedAlternatives: null,
    premortemRisks: null,
    keyAssumptions: null,
    warningSigns: null,
    failureReason,
  };
}

export function createPersistRememberNode({
  db,
  memory = noopMemory,
}: {
  db: AgentDb;
  memory?: AgentMemory;
}) {
  return async function persistRememberNode(state: AgentState): Promise<NodeResult> {
    if (!state.analysisId || !state.validatedOutput || !state.userId) return {};

    await db.analysis.update({
      where: { id: state.analysisId },
      data: readyAnalysisData(state.validatedOutput),
      select: { id: true },
    });
    await memory.remember({
      decisionId: state.decisionId,
      userId: state.userId,
      analysis: state.validatedOutput,
    });

    return {};
  };
}

export function createFailNode({ db }: { db: AgentDb }) {
  return async function failNode(state: AgentState): Promise<NodeResult> {
    if (!state.analysisId) return {};

    await db.analysis.update({
      where: { id: state.analysisId },
      data: failedAnalysisData(state.failureReason ?? "Analysis failed. Please retry."),
      select: { id: true },
    });

    return {};
  };
}
