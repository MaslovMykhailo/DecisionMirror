import "server-only";

import { createAgentGraph, type AgentGraphDeps } from "@/agent/graph";
import { createPostgresCheckpointer } from "@/agent/checkpointer";
import { createAgentEmbeddings } from "@/agent/memory/embeddings";
import { createPgVectorMemoryRepository } from "@/agent/memory/repository";
import { failedAnalysisData, noopMemory, type AgentDb, type AgentMemory } from "@/agent/nodes";
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
  return !deps.db && !deps.provider && !deps.memory && !deps.checkpointer && !deps.graphFactory;
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
  const threadId = await analysisThreadId(decisionId, db);
  const graphFactory = deps.graphFactory ?? createAgentGraph;
  const graph = graphFactory({
    db,
    provider,
    memory,
    checkpointer: threadId ? checkpointer : undefined,
  });

  try {
    await graph.invoke(
      { decisionId },
      threadId ? { configurable: { thread_id: threadId } } : undefined,
    );
  } catch (error) {
    await persistUnhandledFailure(decisionId, db, error);
  }
}
