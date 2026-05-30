import { getAuthenticatedUserId } from "@/lib/auth/server-session";
import { createDecisionStatusGetHandler } from "@/lib/decisions/status-http";

export const GET = createDecisionStatusGetHandler({
  getUser: getAuthenticatedUserId,
});
