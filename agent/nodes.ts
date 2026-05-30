import type { RunnableConfig } from "@langchain/core/runnables";

import { analysisOutputSchema, type AnalysisOutput } from "@/agent/schema";
import type { AnalysisProvider } from "@/agent/provider/types";
import { deriveDecisionComplexity } from "@/lib/decisions/history";
import { routing, type Locale } from "@/lib/i18n/routing";
import { attachRunMetadata } from "@/lib/observability/langsmith";

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
  locale?: string | null;
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

export type RecalledMemories = {
  /** Human-readable prior patterns fed to the analysis prompt. */
  patterns: string[];
  /** Identifiers of the recalled memory rows, for trace metadata (by reference). */
  recalledIds: string[];
};

export type AgentMemory = {
  recall: (args: {
    userId: string;
    decisionId: string;
    decisionInput: NonNullable<AgentState["decisionInput"]>;
  }) => Promise<RecalledMemories>;
  remember: (args: {
    userId: string;
    decisionId: string;
    analysisId: string;
    decisionInput: NonNullable<AgentState["decisionInput"]>;
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
  startedAtMs?: number;
};

type NodeResult = Partial<AgentState>;

function supportedLocale(locale: string | null | undefined): Locale {
  return routing.locales.includes(locale as Locale) ? (locale as Locale) : routing.defaultLocale;
}

export type AgentFailureClass = "validation" | "provider";

export type AgentFailureReporter = {
  captureAgentFailure: (args: {
    decisionId: string;
    node: string;
    failureClass: AgentFailureClass;
    error?: unknown;
  }) => void;
  captureStalledAnalysis: (args: {
    decisionId: string;
    analysisId: string;
    version: number;
  }) => void;
};

export const noopReporter: AgentFailureReporter = {
  captureAgentFailure: () => undefined,
  captureStalledAnalysis: () => undefined,
};

export type AnalysisAnalytics = {
  started: (args: { distinctId?: string; version: number }) => void | Promise<void>;
  ready: (args: {
    distinctId?: string;
    duration_ms: number;
    bias_count: number;
    complexity: number;
  }) => void | Promise<void>;
  failed: (args: { distinctId?: string; reason_class: AgentFailureClass }) => void | Promise<void>;
};

export const noopAnalytics: AnalysisAnalytics = {
  started: () => undefined,
  ready: () => undefined,
  failed: () => undefined,
};

type Clock = () => Date;
const defaultClock: Clock = () => new Date();

export const noopMemory: AgentMemory = {
  recall: async () => ({ patterns: [], recalledIds: [] }),
  remember: async () => undefined,
};

export function createLoadMemoryNode({
  db,
  memory = noopMemory,
  analytics = noopAnalytics,
  now = defaultClock,
}: {
  db: AgentDb;
  memory?: AgentMemory;
  analytics?: AnalysisAnalytics;
  now?: Clock;
}) {
  return async function loadMemoryNode(
    state: AgentState,
    config?: RunnableConfig,
  ): Promise<NodeResult> {
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
      select: { id: true, version: true, locale: true },
    });

    if (!analysis) {
      return {
        canAnalyze: false,
        userId: decision.userId,
        failureReason: "No processing analysis is available for this decision.",
      };
    }

    const decisionInput = {
      situation: decision.situation,
      decision: decision.decision,
      reasoning: decision.reasoning,
    };
    // Mark the start of this analysis run and announce it. duration_ms at ready is
    // measured against this timestamp (time-to-ready), so it is taken once here.
    const startedAtMs = now().getTime();
    await analytics.started({ distinctId: decision.userId, version: analysis.version });

    const recalled = await memory.recall({
      decisionId: state.decisionId,
      decisionInput,
      userId: decision.userId,
    });

    // Record which memories were surfaced, by id reference (never raw content), so a
    // traced run can be inspected for irrelevant recall.
    attachRunMetadata(config, {
      decisionId: state.decisionId,
      version: analysis.version,
      recalledMemoryIds: recalled.recalledIds,
    });

    return {
      canAnalyze: true,
      analysisId: analysis.id,
      analysisVersion: analysis.version,
      userId: decision.userId,
      locale: supportedLocale(analysis.locale),
      decisionInput,
      priorPatterns: recalled.patterns,
      startedAtMs,
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
    failureReason,
  };
}

export function createPersistRememberNode({
  db,
  memory = noopMemory,
  analytics = noopAnalytics,
  now = defaultClock,
}: {
  db: AgentDb;
  memory?: AgentMemory;
  analytics?: AnalysisAnalytics;
  now?: Clock;
}) {
  return async function persistRememberNode(state: AgentState): Promise<NodeResult> {
    if (!state.analysisId || !state.validatedOutput || !state.userId || !state.decisionInput) {
      return {};
    }

    await db.analysis.update({
      where: { id: state.analysisId },
      data: readyAnalysisData(state.validatedOutput),
      select: { id: true },
    });
    await memory.remember({
      analysisId: state.analysisId,
      decisionId: state.decisionId,
      decisionInput: state.decisionInput,
      userId: state.userId,
      analysis: state.validatedOutput,
    });

    // Counts/enums are derived from the validated output; duration from the run's start.
    await analytics.ready({
      distinctId: state.userId,
      duration_ms: now().getTime() - (state.startedAtMs ?? now().getTime()),
      bias_count: state.validatedOutput.biases.length,
      complexity: deriveDecisionComplexity(state.validatedOutput) ?? 0,
    });

    return {};
  };
}

export function createFailNode({
  db,
  reporter = noopReporter,
  analytics = noopAnalytics,
}: {
  db: AgentDb;
  reporter?: AgentFailureReporter;
  analytics?: AnalysisAnalytics;
}) {
  return async function failNode(state: AgentState): Promise<NodeResult> {
    if (!state.analysisId) return {};

    // Reaching the fail node means the structured output did not satisfy the contract:
    // a validation failure, distinct from the provider/runtime errors caught in runAgent.
    reporter.captureAgentFailure({
      decisionId: state.decisionId,
      node: "validate",
      failureClass: "validation",
    });
    await analytics.failed({ distinctId: state.userId, reason_class: "validation" });

    await db.analysis.update({
      where: { id: state.analysisId },
      data: failedAnalysisData(state.failureReason ?? "Analysis failed. Please retry."),
      select: { id: true },
    });

    return {};
  };
}
