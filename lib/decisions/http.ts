import type { AuthenticatedUserIdResult } from "@/lib/auth/session";
import { createDecision } from "@/lib/decisions/service";

type CreateDecisionDeps = Parameters<typeof createDecision>[1];
type BackgroundTrigger = (decisionId: string) => void | Promise<void>;
type ScheduleAfter = (callback: () => void | Promise<void>) => void;

type DecisionPostDeps = {
  getUser: () => Promise<AuthenticatedUserIdResult>;
  db?: CreateDecisionDeps["db"];
  triggerAnalysis?: BackgroundTrigger;
  scheduleAfter?: ScheduleAfter;
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
