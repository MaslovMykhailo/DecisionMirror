import { after } from "next/server";

import { runAgent } from "@/agent";
import { getAuthenticatedUserId } from "@/lib/auth/server-session";
import { createDecisionReanalysisPostHandler } from "@/lib/decisions/http";

export const POST = createDecisionReanalysisPostHandler({
  getUser: getAuthenticatedUserId,
  scheduleAfter: after,
  triggerAnalysis: runAgent,
});
