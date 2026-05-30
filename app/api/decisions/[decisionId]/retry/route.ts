import { after } from "next/server";

import { runAgent } from "@/agent";
import { getAuthenticatedUserId } from "@/lib/auth/server-session";
import { createDecisionAnalysisRetryPostHandler } from "@/lib/decisions/http";

export const POST = createDecisionAnalysisRetryPostHandler({
  getUser: getAuthenticatedUserId,
  scheduleAfter: after,
  triggerAnalysis: runAgent,
});
