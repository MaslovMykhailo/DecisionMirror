import "server-only";

import { createAgentGraph, type AgentGraphDeps } from "@/agent/graph";
import { createPostgresCheckpointer } from "@/agent/checkpointer";
import { createAgentEmbeddings } from "@/agent/memory/embeddings";
import { createPgVectorMemoryRepository } from "@/agent/memory/repository";
import {
  failedAnalysisData,
  noopAnalytics,
  noopMemory,
  noopReporter,
  type AgentDb,
  type AgentFailureReporter,
  type AnalysisAnalytics,
  type AgentMemory,
} from "@/agent/nodes";
import { captureEvent } from "@/lib/observability/capture";
import { langChainOpenAIAnalysisProvider } from "@/agent/provider/openai";

type AgentRunnable = {
  invoke: (
    input: { decisionId: string },
    config?: { configurable: { thread_id: string } },
  ) => Promise<unknown>;
};

type RunAgentDeps = Partial<AgentGraphDeps> & {
  graphFactory?: (deps: AgentGraphDeps) => AgentRunnable;
};

async function defaultDb(): Promise<AgentDb> {
  const { prisma } = await import("@/lib/db/client");
  return prisma as unknown as AgentDb;
}

function failureReasonFromError(error: unknown) {
  if (error instanceof Error && error.message) {
    return `Analysis provider failed: ${error.message}. Please retry.`;
  }

  return "Analysis provider failed. Please retry.";
}

async function persistUnhandledFailure(decisionId: string, db: AgentDb, error: unknown) {
  const analysis = await db.analysis.findFirst({
    where: { decisionId, status: "processing" },
    orderBy: { version: "desc" },
    select: { id: true, version: true },
  });

  if (!analysis) return;

  await db.analysis.update({
    where: { id: analysis.id },
    data: failedAnalysisData(failureReasonFromError(error)),
    select: { id: true },
  });
}

async function analysisThreadId(decisionId: string, db: AgentDb) {
  const analysis = await db.analysis.findFirst({
    where: { decisionId, status: "processing" },
    orderBy: { version: "desc" },
    select: { id: true, version: true },
  });

  return analysis ? `analysis:${analysis.id}` : undefined;
}

function usesProductionDefaults(deps: RunAgentDeps) {
  return (
    !deps.db &&
    !deps.provider &&
    !deps.memory &&
    !deps.checkpointer &&
    !deps.graphFactory &&
    !deps.reporter &&
    !deps.analytics
  );
}

async function defaultReporter(): Promise<AgentFailureReporter> {
  const { sentryAgentReporter } = await import("@/lib/observability/sentry-report");
  return sentryAgentReporter;
}

// Maps the agent's analysis lifecycle to the PostHog taxonomy. Carries ids, counts,
// durations, and enums only — never decision/analysis prose.
const captureEventAnalytics: AnalysisAnalytics = {
  started: ({ distinctId, version }) =>
    captureEvent("analysis_started", { version }, { distinctId }),
  ready: ({ distinctId, duration_ms, bias_count, complexity }) =>
    captureEvent("analysis_ready", { duration_ms, bias_count, complexity }, { distinctId }),
  failed: ({ distinctId, reason_class }) =>
    captureEvent("analysis_failed", { reason_class }, { distinctId }),
};

async function decisionUserId(decisionId: string, db: AgentDb): Promise<string | undefined> {
  try {
    const decision = await db.decision.findUnique({
      where: { id: decisionId },
      select: { userId: true },
    });
    return decision?.userId;
  } catch {
    return undefined;
  }
}

function createProductionMemory(db: AgentDb): AgentMemory {
  return createPgVectorMemoryRepository({
    db: db as unknown as Parameters<typeof createPgVectorMemoryRepository>[0]["db"],
    embeddings: createAgentEmbeddings(),
  });
}

export async function runAgent(decisionId: string, deps: RunAgentDeps = {}) {
  const db = deps.db ?? (await defaultDb());
  const provider = deps.provider ?? langChainOpenAIAnalysisProvider;
  const useProduction = usesProductionDefaults(deps);
  const memory = deps.memory ?? (useProduction ? createProductionMemory(db) : noopMemory);
  const checkpointer =
    deps.checkpointer ?? (useProduction ? createPostgresCheckpointer() : undefined);
  const reporter = deps.reporter ?? (useProduction ? await defaultReporter() : noopReporter);
  const analytics = deps.analytics ?? (useProduction ? captureEventAnalytics : noopAnalytics);
  const now = deps.now;
  const threadId = await analysisThreadId(decisionId, db);
  const graphFactory = deps.graphFactory ?? createAgentGraph;
  const graph = graphFactory({
    db,
    provider,
    memory,
    reporter,
    analytics,
    checkpointer: threadId ? checkpointer : undefined,
    ...(now ? { now } : {}),
  });

  try {
    await graph.invoke(
      { decisionId },
      threadId ? { configurable: { thread_id: threadId } } : undefined,
    );
  } catch (error) {
    // Errors that escape the graph are provider/runtime failures (validation failures
    // are handled by the fail node). The node name is tagged onto the error by graph.ts.
    const node = (error as { nodeName?: string }).nodeName ?? "runAgent";
    reporter.captureAgentFailure({ decisionId, node, failureClass: "provider", error });
    await analytics.failed({
      distinctId: await decisionUserId(decisionId, db),
      reason_class: "provider",
    });
    await persistUnhandledFailure(decisionId, db, error);
  }
}
