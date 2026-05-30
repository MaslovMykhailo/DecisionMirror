import { after } from "next/server";

import { getAuthenticatedUserId } from "@/lib/auth/server-session";
import { createDecisionPostHandler } from "@/lib/decisions/http";

export const POST = createDecisionPostHandler({
  getUser: getAuthenticatedUserId,
  scheduleAfter: after,
});
