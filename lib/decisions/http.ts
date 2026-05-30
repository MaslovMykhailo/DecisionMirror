import type { AuthenticatedUserIdResult } from "@/lib/auth/session";
import { createDecision } from "@/lib/decisions/service";

type CreateDecisionDeps = Parameters<typeof createDecision>[1];

type DecisionPostDeps = {
  getUser: () => Promise<AuthenticatedUserIdResult>;
  db?: CreateDecisionDeps["db"];
  triggerAnalysis?: CreateDecisionDeps["triggerAnalysis"];
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
    const result = await createDecision(await readJson(request), deps);

    if (result.status === "unauthenticated") {
      return Response.json(result, { status: 401 });
    }

    if (result.status === "validation_error") {
      return Response.json(result, { status: 400 });
    }

    return Response.json(result, { status: 201 });
  };
}
