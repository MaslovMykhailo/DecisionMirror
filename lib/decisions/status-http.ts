import type { AuthenticatedUserIdResult } from "@/lib/auth/session";
import { getDecisionAnalysisStatus } from "@/lib/decisions/status";

type StatusDeps = Parameters<typeof getDecisionAnalysisStatus>[1];

type DecisionStatusGetDeps = {
  getUser: () => Promise<AuthenticatedUserIdResult>;
  db?: StatusDeps["db"];
  now?: StatusDeps["now"];
  stalledTimeoutMs?: StatusDeps["stalledTimeoutMs"];
};

type DecisionStatusContext = {
  params: Promise<{ decisionId: string }>;
};

export function createDecisionStatusGetHandler(deps: DecisionStatusGetDeps) {
  return async function GET(
    _request: Request,
    { params }: DecisionStatusContext,
  ): Promise<Response> {
    const { decisionId } = await params;
    const result = await getDecisionAnalysisStatus(decisionId, {
      getUser: deps.getUser,
      db: deps.db,
      now: deps.now,
      stalledTimeoutMs: deps.stalledTimeoutMs,
    });

    if (result.status === "unauthenticated") {
      return Response.json(result, { status: 401 });
    }

    if (result.status === "not_found") {
      return Response.json(result, { status: 404 });
    }

    return Response.json(result.analysis, { status: 200 });
  };
}
