import type { AuthenticatedUserIdResult } from "@/lib/auth/session";
import {
  analysisRetryability,
  type AnalysisRetryabilityOptions,
} from "@/lib/decisions/analysis-retryability";
import { createDecisionInputSchema } from "@/lib/decisions/validation";
import { routing, type Locale } from "@/lib/i18n/routing";
import { captureEvent } from "@/lib/observability/capture";

type GetUser = () => Promise<AuthenticatedUserIdResult>;
type CaptureFn = typeof captureEvent;

type AnalysisMutationRow = {
  id: string;
  version: number;
  status: string;
  updatedAt: Date;
};

type DecisionDb = {
  decision?: {
    create?: (args: unknown) => Promise<{ id: string }>;
    findFirst?: (args: unknown) => Promise<unknown>;
  };
  analysis?: {
    create?: (args: unknown) => Promise<{ id: string }>;
    findFirst?: (args: unknown) => Promise<AnalysisMutationRow | null>;
    update?: (args: unknown) => Promise<AnalysisMutationRow>;
    aggregate?: (args: unknown) => Promise<{ _max: { version: number | null } }>;
    findMany?: (args: unknown) => Promise<Array<{ category: string | null }>>;
  };
  $transaction?: <T>(fn: (tx: ResolvedDecisionDb) => Promise<T>) => Promise<T>;
};

type ResolvedDecisionDb = {
  decision: {
    create: (args: unknown) => Promise<{ id: string }>;
    findFirst: (args: unknown) => Promise<unknown>;
  };
  analysis: {
    create: (args: unknown) => Promise<AnalysisMutationRow>;
    findFirst: (args: unknown) => Promise<AnalysisMutationRow | null>;
    update: (args: unknown) => Promise<AnalysisMutationRow>;
    aggregate: (args: unknown) => Promise<{ _max: { version: number | null } }>;
    findMany: (args: unknown) => Promise<Array<{ category: string | null }>>;
  };
  $transaction?: <T>(fn: (tx: ResolvedDecisionDb) => Promise<T>) => Promise<T>;
};

type MemoryStore = {
  recall: (args: { userId: string; decisionId: string }) => Promise<unknown[]>;
};

type BaseDeps = {
  getUser: GetUser;
  db?: DecisionDb;
  capture?: CaptureFn;
};

type AnalysisMutationDeps = BaseDeps &
  AnalysisRetryabilityOptions & {
    triggerAnalysis?: (decisionId: string) => void | Promise<void>;
    locale?: Locale;
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

async function withTransaction<T>(
  db: ResolvedDecisionDb,
  fn: (tx: ResolvedDecisionDb) => Promise<T>,
) {
  return db.$transaction ? db.$transaction((tx) => fn(tx)) : fn(db);
}

function unauthenticatedResult() {
  return { status: "unauthenticated" as const };
}

function operationNow(deps: AnalysisRetryabilityOptions) {
  return deps.now?.() ?? new Date();
}

function mutationAnalysisPayload(
  analysis: AnalysisMutationRow,
  options: AnalysisRetryabilityOptions,
) {
  return {
    analysisId: analysis.id,
    version: analysis.version,
    status: analysis.status,
    updatedAt: analysis.updatedAt.toISOString(),
    ...analysisRetryability(analysis, options),
  };
}

function isUniqueConstraintError(error: unknown) {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002",
  );
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
      locale: parsed.data.locale,
    },
    select: { id: true },
  });

  // Emit once on successful capture. Reasoning is reduced to a boolean — no prose.
  await (deps.capture ?? captureEvent)(
    "decision_created",
    { has_reasoning: Boolean(parsed.data.reasoning) },
    { distinctId: user.userId },
  );

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

  const latestAnalysis = await db.analysis.findFirst({
    where: { decisionId },
    orderBy: { version: "desc" },
    select: { id: true, version: true, status: true, updatedAt: true },
  });

  if (!latestAnalysis) return { status: "not_found" as const };

  const retryability = analysisRetryability(latestAnalysis, deps);
  if (latestAnalysis.status === "processing" && !retryability.isStalled) {
    return { status: "already_processing" as const };
  }

  if (!retryability.retryable) {
    return { status: "not_retryable" as const };
  }

  const updatedAt = operationNow(deps);
  const analysis = await db.analysis.update({
    where: { id: latestAnalysis.id },
    data: { status: "processing", failureReason: null, updatedAt },
    select: { id: true, version: true, status: true, updatedAt: true },
  });

  // A stalled processing analysis being retried is a distinct trigger from a user
  // manually retrying a failed one.
  const trigger =
    latestAnalysis.status === "processing" && retryability.isStalled ? "stalled" : "manual";
  await (deps.capture ?? captureEvent)(
    "analysis_retried",
    { trigger },
    { distinctId: user.userId },
  );

  await deps.triggerAnalysis?.(decisionId);

  return {
    status: "success" as const,
    analysis: mutationAnalysisPayload(analysis, {
      now: () => updatedAt,
      stalledTimeoutMs: deps.stalledTimeoutMs,
    }),
  };
}

export async function reanalyzeDecision(decisionId: string, deps: AnalysisMutationDeps) {
  const { user, decision, db } = await requireDecisionOwner(decisionId, deps);
  if (!user.authenticated) return unauthenticatedResult();
  if (!decision) return { status: "not_found" as const };

  try {
    const result = await withTransaction(db, async (tx) => {
      const latestAnalysis = await tx.analysis.findFirst({
        where: { decisionId },
        orderBy: { version: "desc" },
        select: { id: true, version: true, status: true, updatedAt: true },
      });

      if (
        latestAnalysis?.status === "processing" &&
        !analysisRetryability(latestAnalysis, deps).isStalled
      ) {
        return { status: "already_processing" as const };
      }

      const versionAggregate = await tx.analysis.aggregate({
        where: { decisionId },
        _max: { version: true },
      });
      const nextVersion = (versionAggregate._max.version ?? 0) + 1;
      const updatedAt = operationNow(deps);
      const analysis = await tx.analysis.create({
        data: {
          decisionId,
          version: nextVersion,
          status: "processing",
          locale: deps.locale ?? routing.defaultLocale,
          updatedAt,
        },
        select: { id: true, version: true, status: true, updatedAt: true },
      });

      return {
        status: "success" as const,
        analysis: mutationAnalysisPayload(analysis, {
          now: () => updatedAt,
          stalledTimeoutMs: deps.stalledTimeoutMs,
        }),
      };
    });

    if (result.status === "success") {
      await deps.triggerAnalysis?.(decisionId);
      // nextVersion was (prior max) + 1, so the prior version is one below the new one.
      await (deps.capture ?? captureEvent)(
        "reanalysis_run",
        { prior_version: result.analysis.version - 1 },
        { distinctId: user.userId },
      );
    }

    return result;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { status: "already_processing" as const };
    }
    throw error;
  }
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
