import { after } from "next/server";

import { runAgent } from "@/agent";
import { getAuthenticatedUserId } from "@/lib/auth/server-session";
import { createDecisionPostHandler } from "@/lib/decisions/http";

export const POST = createDecisionPostHandler({
  getUser: getAuthenticatedUserId,
  scheduleAfter: after,
  triggerAnalysis: runAgent,
});
