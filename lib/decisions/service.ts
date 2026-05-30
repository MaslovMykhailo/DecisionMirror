import type { AuthenticatedUserIdResult } from "@/lib/auth/session";
import { createDecisionInputSchema } from "@/lib/decisions/validation";

type GetUser = () => Promise<AuthenticatedUserIdResult>;

type DecisionDb = {
  decision?: {
    create?: (args: unknown) => Promise<{ id: string }>;
    findFirst?: (args: unknown) => Promise<unknown>;
  };
  analysis?: {
    create?: (args: unknown) => Promise<{ id: string }>;
    findFirst?: (args: unknown) => Promise<{ id: string } | null>;
    update?: (args: unknown) => Promise<{ id: string }>;
    aggregate?: (args: unknown) => Promise<{ _max: { version: number | null } }>;
    findMany?: (args: unknown) => Promise<Array<{ category: string | null }>>;
  };
};

type ResolvedDecisionDb = {
  decision: {
    create: (args: unknown) => Promise<{ id: string }>;
    findFirst: (args: unknown) => Promise<unknown>;
  };
  analysis: {
    create: (args: unknown) => Promise<{ id: string }>;
    findFirst: (args: unknown) => Promise<{ id: string } | null>;
    update: (args: unknown) => Promise<{ id: string }>;
    aggregate: (args: unknown) => Promise<{ _max: { version: number | null } }>;
    findMany: (args: unknown) => Promise<Array<{ category: string | null }>>;
  };
};

type MemoryStore = {
  recall: (args: { userId: string; decisionId: string }) => Promise<unknown[]>;
};

type BaseDeps = {
  getUser: GetUser;
  db?: DecisionDb;
};

type AnalysisMutationDeps = BaseDeps & {
  triggerAnalysis?: (decisionId: string) => void | Promise<void>;
};

type MemoryDeps = {
  getUser: GetUser;
  memoryStore?: MemoryStore;
};

async function defaultDb(): Promise<ResolvedDecisionDb> {
  const { prisma } = await import("@/lib/db/client");
  return prisma as unknown as ResolvedDecisionDb;
}

async function resolveDb(db?: DecisionDb): Promise<ResolvedDecisionDb> {
  return (db ?? (await defaultDb())) as unknown as ResolvedDecisionDb;
}

function unauthenticatedResult() {
  return { status: "unauthenticated" as const };
}

async function requireDecisionOwner(decisionId: string, { getUser, db }: BaseDeps) {
  const user = await getUser();
  if (!user.authenticated) return { user, decision: null, db: await resolveDb(db) };

  const resolvedDb = await resolveDb(db);
  const decision = await resolvedDb.decision.findFirst({
    where: { id: decisionId, userId: user.userId },
    select: { id: true },
  });

  return { user, decision, db: resolvedDb };
}

export async function createDecision(input: unknown, deps: BaseDeps) {
  const user = await deps.getUser();
  if (!user.authenticated) return unauthenticatedResult();

  const parsed = createDecisionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      status: "validation_error" as const,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const db = await resolveDb(deps.db);
  const decision = await db.decision.create({
    data: {
      userId: user.userId,
      situation: parsed.data.situation,
      decision: parsed.data.decision,
      reasoning: parsed.data.reasoning,
    },
    select: { id: true },
  });
  const analysis = await db.analysis.create({
    data: {
      decisionId: decision.id,
      version: 1,
      status: "processing",
    },
    select: { id: true },
  });

  return {
    status: "success" as const,
    decisionId: decision.id,
    analysisId: analysis.id,
  };
}

export async function getDecisionDetails(decisionId: string, deps: BaseDeps) {
  const user = await deps.getUser();
  if (!user.authenticated) return unauthenticatedResult();

  const db = await resolveDb(deps.db);
  const decision = await db.decision.findFirst({
    where: { id: decisionId, userId: user.userId },
    include: { analyses: true },
  });

  if (!decision) return { status: "not_found" as const };
  return { status: "success" as const, decision };
}

export async function retryDecisionAnalysis(decisionId: string, deps: AnalysisMutationDeps) {
  const { user, decision, db } = await requireDecisionOwner(decisionId, deps);
  if (!user.authenticated) return unauthenticatedResult();
  if (!decision) return { status: "not_found" as const };

  const latestRetryable = await db.analysis.findFirst({
    where: { decisionId, status: { in: ["failed", "processing"] } },
    orderBy: { version: "desc" },
    select: { id: true },
  });

  if (!latestRetryable) return { status: "not_found" as const };

  const analysis = await db.analysis.update({
    where: { id: latestRetryable.id },
    data: { status: "processing", failureReason: null },
    select: { id: true },
  });

  await deps.triggerAnalysis?.(decisionId);

  return { status: "success" as const, analysisId: analysis.id };
}

export async function reanalyzeDecision(decisionId: string, deps: AnalysisMutationDeps) {
  const { user, decision, db } = await requireDecisionOwner(decisionId, deps);
  if (!user.authenticated) return unauthenticatedResult();
  if (!decision) return { status: "not_found" as const };

  const versionAggregate = await db.analysis.aggregate({
    where: { decisionId },
    _max: { version: true },
  });
  const nextVersion = (versionAggregate._max.version ?? 0) + 1;
  const analysis = await db.analysis.create({
    data: { decisionId, version: nextVersion, status: "processing" },
    select: { id: true },
  });

  await deps.triggerAnalysis?.(decisionId);

  return { status: "success" as const, analysisId: analysis.id, version: nextVersion };
}

export async function getDashboardAggregation({ getUser, db }: BaseDeps) {
  const user = await getUser();
  if (!user.authenticated) return unauthenticatedResult();

  const resolvedDb = await resolveDb(db);
  const rows = await resolvedDb.analysis.findMany({
    where: { decision: { userId: user.userId }, status: "ready" },
    select: { category: true },
  });

  return {
    status: "success" as const,
    categories: rows.reduce<Record<string, number>>((counts, row) => {
      if (row.category) counts[row.category] = (counts[row.category] ?? 0) + 1;
      return counts;
    }, {}),
  };
}

export async function recallDecisionMemory(decisionId: string, deps: MemoryDeps) {
  const user = await deps.getUser();
  if (!user.authenticated) return unauthenticatedResult();

  const memoryStore = deps.memoryStore ?? {
    recall: async () => [],
  };

  return {
    status: "success" as const,
    memories: await memoryStore.recall({ userId: user.userId, decisionId }),
  };
}
