import "server-only";

import { auth } from "@/auth";
import { readAuthenticatedUserId } from "@/lib/auth/session";

export function getAuthenticatedUserId() {
  return readAuthenticatedUserId(() => auth());
}
