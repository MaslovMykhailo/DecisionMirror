import { analysisOutputSchema, type AnalysisOutput } from "@/agent/schema";
import type { AuthenticatedUserIdResult } from "@/lib/auth/session";
import {
  analysisRetryability,
  type AnalysisRetryabilityOptions,
} from "@/lib/decisions/analysis-retryability";
import {
  biasSchema,
  categorySchema,
  type CognitiveBias,
  type DecisionCategory,
} from "@/lib/taxonomy";

export type AnalysisStatus = "processing" | "ready" | "failed";

type GetUser = () => Promise<AuthenticatedUserIdResult>;

type DecisionHistoryAnalysisRow = {
  id: string;
  version: number;
  status: string;
  category: string | null;
  biases: unknown;
  missedAlternatives: unknown;
  premortemRisks: unknown;
  keyAssumptions: unknown;
  warningSigns: unknown;
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

type DecisionHistoryDetailAnalysisRow = DecisionHistoryAnalysisRow;

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
  filters?: DecisionHistoryFilters;
  sort?: DecisionHistorySort;
};

type DecisionHistorySearchParams = Record<string, string | string[] | undefined>;

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

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseDecisionHistoryFilters(
  searchParams: DecisionHistorySearchParams = {},
): DecisionHistoryFilters {
  const category = categorySchema.safeParse(firstSearchParam(searchParams.category));
  const bias = biasSchema.safeParse(firstSearchParam(searchParams.bias));

  return {
    category: category.success ? category.data : null,
    bias: bias.success ? bias.data : null,
  };
}

export function parseDecisionHistorySort(
  searchParams: DecisionHistorySearchParams = {},
): DecisionHistorySort {
  return firstSearchParam(searchParams.sort) === "complexity" ? "complexity" : "created_at";
}

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

function readyAnalysisResult(row: DecisionHistoryAnalysisRow | undefined) {
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

  return result.data;
}

function newestReadyAnalysisResult(rows: DecisionHistoryAnalysisRow[]) {
  for (const row of rows) {
    const result = readyAnalysisResult(row);
    if (result) return result;
  }

  return null;
}

export function deriveDecisionComplexity(analysis: AnalysisOutput | null) {
  if (!analysis) return null;
  return (
    analysis.biases.length + analysis.premortemRisks.length + analysis.missedAlternatives.length
  );
}

function readyAnalysis(row: DecisionHistoryDetailAnalysisRow | undefined) {
  const result = readyAnalysisResult(row);
  if (!row || !result) return null;

  return {
    analysisId: row.id,
    version: row.version,
    updatedAt: row.updatedAt.toISOString(),
    result,
  } satisfies DecisionHistoryReadyAnalysis;
}

function readyAnalyses(rows: DecisionHistoryDetailAnalysisRow[]) {
  return rows
    .map((analysis) => readyAnalysis(analysis))
    .filter((analysis): analysis is DecisionHistoryReadyAnalysis => Boolean(analysis));
}

type DecisionHistoryItemWithSortData = {
  decision: DecisionHistoryItem;
  createdAt: Date;
  newestReadyResult: AnalysisOutput | null;
};

function compareCreatedAtDescending(
  left: DecisionHistoryItemWithSortData,
  right: DecisionHistoryItemWithSortData,
) {
  const createdAtDelta = right.createdAt.getTime() - left.createdAt.getTime();
  return createdAtDelta === 0 ? left.decision.id.localeCompare(right.decision.id) : createdAtDelta;
}

function compareComplexityDescending(
  left: DecisionHistoryItemWithSortData,
  right: DecisionHistoryItemWithSortData,
) {
  if (left.decision.complexity === null && right.decision.complexity === null) {
    return compareCreatedAtDescending(left, right);
  }

  if (left.decision.complexity === null) return 1;
  if (right.decision.complexity === null) return -1;

  const complexityDelta = right.decision.complexity - left.decision.complexity;
  return complexityDelta === 0 ? compareCreatedAtDescending(left, right) : complexityDelta;
}

export async function getDecisionHistoryList({
  getUser,
  db,
  filters,
  sort = "created_at",
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

  const appliedFilters = filters ?? { category: null, bias: null };
  const historyItems = decisions
    .map((decision) => {
      const newestReadyResult = newestReadyAnalysisResult(decision.analyses);

      return {
        decision: {
          id: decision.id,
          summary: summaryFromDecision(decision),
          createdAt: decision.createdAt.toISOString(),
          updatedAt: decision.updatedAt.toISOString(),
          newestAnalysis: analysisSummary(decision.analyses[0], { now, stalledTimeoutMs }),
          newestReadyCategory: newestReadyResult?.category ?? null,
          complexity: deriveDecisionComplexity(newestReadyResult),
        } satisfies DecisionHistoryItem,
        createdAt: decision.createdAt,
        newestReadyResult,
      };
    })
    .filter(({ newestReadyResult }) => {
      if (appliedFilters.category && newestReadyResult?.category !== appliedFilters.category) {
        return false;
      }

      if (
        appliedFilters.bias &&
        !newestReadyResult?.biases.some((bias) => bias.id === appliedFilters.bias)
      ) {
        return false;
      }

      return true;
    })
    .sort(sort === "complexity" ? compareComplexityDescending : compareCreatedAtDescending)
    .map(({ decision }) => decision);

  return {
    status: "success" as const,
    decisions: historyItems,
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
