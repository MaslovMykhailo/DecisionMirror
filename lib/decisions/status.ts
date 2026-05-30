import type { AuthenticatedUserIdResult } from "@/lib/auth/session";
import {
  analysisRetryability,
  type AnalysisRetryabilityOptions,
} from "@/lib/decisions/analysis-retryability";

type GetUser = () => Promise<AuthenticatedUserIdResult>;

type AnalysisStatusRow = {
  id: string;
  version: number;
  status: string;
  updatedAt: Date;
  failureReason: string | null;
};

type AnalysisStatusDb = {
  analysis?: {
    findFirst?: (args: unknown) => Promise<AnalysisStatusRow | null>;
  };
};

type ResolvedAnalysisStatusDb = {
  analysis: {
    findFirst: (args: unknown) => Promise<AnalysisStatusRow | null>;
  };
};

type StatusDeps = AnalysisRetryabilityOptions & {
  getUser: GetUser;
  db?: AnalysisStatusDb;
};

async function defaultDb(): Promise<ResolvedAnalysisStatusDb> {
  const { prisma } = await import("@/lib/db/client");
  return prisma as unknown as ResolvedAnalysisStatusDb;
}

async function resolveDb(db?: AnalysisStatusDb): Promise<ResolvedAnalysisStatusDb> {
  return (db ?? (await defaultDb())) as unknown as ResolvedAnalysisStatusDb;
}

export async function getDecisionAnalysisStatus(decisionId: string, deps: StatusDeps) {
  const user = await deps.getUser();
  if (!user.authenticated) return { status: "unauthenticated" as const };

  const db = await resolveDb(deps.db);
  const analysis = await db.analysis.findFirst({
    where: { decisionId, decision: { userId: user.userId } },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      status: true,
      updatedAt: true,
      failureReason: true,
    },
  });

  if (!analysis) return { status: "not_found" as const };

  return {
    status: "success" as const,
    analysis: {
      analysisId: analysis.id,
      version: analysis.version,
      status: analysis.status,
      updatedAt: analysis.updatedAt.toISOString(),
      ...analysisRetryability(analysis, deps),
      ...(analysis.status === "failed" && analysis.failureReason
        ? { failureReason: analysis.failureReason }
        : {}),
    },
  };
}
