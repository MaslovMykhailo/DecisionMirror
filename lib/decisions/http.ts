import type { AuthenticatedUserIdResult } from "@/lib/auth/session";
import { createDecision, reanalyzeDecision, retryDecisionAnalysis } from "@/lib/decisions/service";
import { reanalyzeDecisionInputSchema } from "@/lib/decisions/validation";

type CreateDecisionDeps = Parameters<typeof createDecision>[1];
type RetryDecisionDeps = Parameters<typeof retryDecisionAnalysis>[1];
type ReanalyzeDecisionDeps = Parameters<typeof reanalyzeDecision>[1];
type BackgroundTrigger = (decisionId: string) => void | Promise<void>;
type ScheduleAfter = (callback: () => void | Promise<void>) => void;

type DecisionPostDeps = {
  getUser: () => Promise<AuthenticatedUserIdResult>;
  db?: CreateDecisionDeps["db"];
  triggerAnalysis?: BackgroundTrigger;
  scheduleAfter?: ScheduleAfter;
};

type AnalysisMutationPostDeps = {
  getUser: () => Promise<AuthenticatedUserIdResult>;
  db?: RetryDecisionDeps["db"];
  triggerAnalysis?: BackgroundTrigger;
  scheduleAfter?: ScheduleAfter;
  now?: RetryDecisionDeps["now"];
  stalledTimeoutMs?: RetryDecisionDeps["stalledTimeoutMs"];
};

type DecisionAnalysisContext = {
  params: Promise<{ decisionId: string }>;
};

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export function createDecisionPostHandler(deps: DecisionPostDeps) {
  return async function POST(request: Request): Promise<Response> {
    const result = await createDecision(await readJson(request), {
      getUser: deps.getUser,
      db: deps.db,
    });

    if (result.status === "unauthenticated") {
      return Response.json(result, { status: 401 });
    }

    if (result.status === "validation_error") {
      return Response.json(result, { status: 400 });
    }

    deps.scheduleAfter?.(() => deps.triggerAnalysis?.(result.decisionId));

    return Response.json(result, { status: 201 });
  };
}

function scheduleAnalysis(deps: AnalysisMutationPostDeps, decisionId: string) {
  deps.scheduleAfter?.(() => deps.triggerAnalysis?.(decisionId));
}

function mutationResponse(result: Awaited<ReturnType<typeof retryDecisionAnalysis>>) {
  if (result.status === "unauthenticated") {
    return Response.json(result, { status: 401 });
  }

  if (result.status === "not_found") {
    return Response.json(result, { status: 404 });
  }

  if (result.status === "success") {
    return Response.json(result, { status: 202 });
  }

  return Response.json(result, { status: 409 });
}

export function createDecisionAnalysisRetryPostHandler(deps: AnalysisMutationPostDeps) {
  return async function POST(
    _request: Request,
    { params }: DecisionAnalysisContext,
  ): Promise<Response> {
    const { decisionId } = await params;
    const result = await retryDecisionAnalysis(decisionId, {
      getUser: deps.getUser,
      db: deps.db,
      now: deps.now,
      stalledTimeoutMs: deps.stalledTimeoutMs,
      triggerAnalysis: (triggerDecisionId) => scheduleAnalysis(deps, triggerDecisionId),
    });

    return mutationResponse(result);
  };
}

export function createDecisionReanalysisPostHandler(deps: AnalysisMutationPostDeps) {
  return async function POST(
    request: Request,
    { params }: DecisionAnalysisContext,
  ): Promise<Response> {
    const parsed = reanalyzeDecisionInputSchema.safeParse(await readJson(request));
    if (!parsed.success) {
      return Response.json(
        {
          status: "validation_error",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const { decisionId } = await params;
    const result = await reanalyzeDecision(decisionId, {
      getUser: deps.getUser,
      db: deps.db as ReanalyzeDecisionDeps["db"],
      now: deps.now,
      stalledTimeoutMs: deps.stalledTimeoutMs,
      locale: parsed.data.locale,
      triggerAnalysis: (triggerDecisionId) => scheduleAnalysis(deps, triggerDecisionId),
    });

    return mutationResponse(result);
  };
}
