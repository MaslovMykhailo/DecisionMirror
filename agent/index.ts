import "server-only";

import { createAgentGraph, type AgentGraphDeps } from "@/agent/graph";
import { failedAnalysisData, noopMemory, type AgentDb } from "@/agent/nodes";
import { langChainOpenAIAnalysisProvider } from "@/agent/provider/openai";

type RunAgentDeps = Partial<AgentGraphDeps>;

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

export async function runAgent(decisionId: string, deps: RunAgentDeps = {}) {
  const db = deps.db ?? (await defaultDb());
  const provider = deps.provider ?? langChainOpenAIAnalysisProvider;
  const memory = deps.memory ?? noopMemory;

  try {
    await createAgentGraph({ db, provider, memory }).invoke({ decisionId });
  } catch (error) {
    await persistUnhandledFailure(decisionId, db, error);
  }
}
