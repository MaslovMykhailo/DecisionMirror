import { analysisOutputSchema, type AnalysisOutput } from "@/agent/schema";
import type { AuthenticatedUserIdResult } from "@/lib/auth/session";
import {
  analysisRetryability,
  type AnalysisRetryabilityOptions,
} from "@/lib/decisions/analysis-retryability";
import { categorySchema, type DecisionCategory } from "@/lib/taxonomy";

export type AnalysisStatus = "processing" | "ready" | "failed";

type GetUser = () => Promise<AuthenticatedUserIdResult>;

type DecisionHistoryAnalysisRow = {
  id: string;
  version: number;
  status: string;
  category: string | null;
  failureReason: string | null;
  updatedAt: Date;
};

type DecisionHistoryRow = {
  id: string;
  situation: string;
  decision: string;
  reasoning: string | null;
  createdAt: Date;
  updatedAt: Date;
  analyses: DecisionHistoryAnalysisRow[];
};

type DecisionHistoryDetailAnalysisRow = DecisionHistoryAnalysisRow & {
  biases: unknown;
  missedAlternatives: unknown;
  premortemRisks: unknown;
  keyAssumptions: unknown;
  warningSigns: unknown;
};

type DecisionHistoryDetailRow = Omit<DecisionHistoryRow, "analyses"> & {
  analyses: DecisionHistoryDetailAnalysisRow[];
};

type DecisionHistoryDb = {
  decision?: {
    findMany?: (args: unknown) => Promise<DecisionHistoryRow[]>;
    findFirst?: (args: unknown) => Promise<DecisionHistoryDetailRow | null>;
  };
};

type ResolvedDecisionHistoryDb = {
  decision: {
    findMany: (args: unknown) => Promise<DecisionHistoryRow[]>;
    findFirst: (args: unknown) => Promise<DecisionHistoryDetailRow | null>;
  };
};

type DecisionHistoryDeps = AnalysisRetryabilityOptions & {
  getUser: GetUser;
  db?: DecisionHistoryDb;
};

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

async function defaultDb(): Promise<ResolvedDecisionHistoryDb> {
  const { prisma } = await import("@/lib/db/client");
  return prisma as unknown as ResolvedDecisionHistoryDb;
}

async function resolveDb(db?: DecisionHistoryDb): Promise<ResolvedDecisionHistoryDb> {
  return (db ?? (await defaultDb())) as unknown as ResolvedDecisionHistoryDb;
}

function isAnalysisStatus(value: string): value is AnalysisStatus {
  return value === "processing" || value === "ready" || value === "failed";
}

function summaryFromDecision(row: Pick<DecisionHistoryRow, "decision" | "situation">) {
  const source = row.decision.trim() || row.situation.trim();
  const singleLine = source.replace(/\s+/g, " ");
  return singleLine.length > 140 ? `${singleLine.slice(0, 137).trimEnd()}...` : singleLine;
}

function analysisSummary(
  row: DecisionHistoryAnalysisRow | undefined,
  options: AnalysisRetryabilityOptions,
) {
  if (!row || !isAnalysisStatus(row.status)) return null;

  return {
    analysisId: row.id,
    version: row.version,
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
    ...analysisRetryability(row, options),
    ...(row.status === "failed" && row.failureReason ? { failureReason: row.failureReason } : {}),
  };
}

function newestReadyCategory(rows: DecisionHistoryAnalysisRow[]) {
  const ready = rows.find((row) => row.status === "ready" && row.category);
  const parsed = categorySchema.safeParse(ready?.category);
  return parsed.success ? parsed.data : null;
}

function readyAnalysis(row: DecisionHistoryDetailAnalysisRow | undefined) {
  if (!row || row.status !== "ready") return null;

  const result = analysisOutputSchema.safeParse({
    category: row.category,
    biases: row.biases,
    missedAlternatives: row.missedAlternatives,
    premortemRisks: row.premortemRisks,
    keyAssumptions: row.keyAssumptions,
    warningSigns: row.warningSigns,
  });

  if (!result.success) return null;

  return {
    analysisId: row.id,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    result: result.data,
  } satisfies DecisionHistoryReadyAnalysis;
}

function readyAnalyses(rows: DecisionHistoryDetailAnalysisRow[]) {
  return rows
    .map((analysis) => readyAnalysis(analysis))
    .filter((analysis): analysis is DecisionHistoryReadyAnalysis => Boolean(analysis));
}

export async function getDecisionHistoryList({
  getUser,
  db,
  now,
  stalledTimeoutMs,
}: DecisionHistoryDeps) {
  const user = await getUser();
  if (!user.authenticated) return { status: "unauthenticated" as const };

  const resolvedDb = await resolveDb(db);
  const decisions = await resolvedDb.decision.findMany({
    where: { userId: user.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      situation: true,
      decision: true,
      reasoning: true,
      createdAt: true,
      updatedAt: true,
      analyses: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          status: true,
          category: true,
          failureReason: true,
          updatedAt: true,
        },
      },
    },
  });

  return {
    status: "success" as const,
    decisions: decisions.map<DecisionHistoryItem>((decision) => ({
      id: decision.id,
      summary: summaryFromDecision(decision),
      createdAt: decision.createdAt.toISOString(),
      updatedAt: decision.updatedAt.toISOString(),
      newestAnalysis: analysisSummary(decision.analyses[0], { now, stalledTimeoutMs }),
      newestReadyCategory: newestReadyCategory(decision.analyses),
    })),
  };
}

export async function getDecisionHistoryDetail(
  decisionId: string,
  { getUser, db, now, stalledTimeoutMs }: DecisionHistoryDeps,
): Promise<DecisionHistoryDetailResult> {
  const user = await getUser();
  if (!user.authenticated) return { status: "unauthenticated" as const };

  const resolvedDb = await resolveDb(db);
  const decision = await resolvedDb.decision.findFirst({
    where: { id: decisionId, userId: user.userId },
    select: {
      id: true,
      situation: true,
      decision: true,
      reasoning: true,
      createdAt: true,
      updatedAt: true,
      analyses: {
        orderBy: { version: "desc" },
        select: {
          id: true,
          version: true,
          status: true,
          category: true,
          biases: true,
          missedAlternatives: true,
          premortemRisks: true,
          keyAssumptions: true,
          warningSigns: true,
          failureReason: true,
          updatedAt: true,
        },
      },
    },
  });

  if (!decision) return { status: "not_found" as const };

  const completedAnalyses = readyAnalyses(decision.analyses);

  return {
    status: "success" as const,
    decision: {
      id: decision.id,
      situation: decision.situation,
      decision: decision.decision,
      reasoning: decision.reasoning,
      createdAt: decision.createdAt.toISOString(),
      updatedAt: decision.updatedAt.toISOString(),
    } satisfies DecisionHistoryDetail,
    newestAnalysis: analysisSummary(decision.analyses[0], { now, stalledTimeoutMs }),
    readyAnalysis: completedAnalyses[0] ?? null,
    readyAnalyses: completedAnalyses,
  };
}
