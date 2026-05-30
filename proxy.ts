import createMiddleware from "next-intl/middleware";

import { routing } from "@/lib/i18n/routing";

/**
 * Negotiates the active locale per request and persists the choice in a cookie,
 * so a returning user lands on their previously selected language. The matcher
 * skips API routes, Next internals, and static assets — only page requests are
 * locale-scoped.
 */
export default createMiddleware(routing);

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
