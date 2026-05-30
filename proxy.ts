import createMiddleware from "next-intl/middleware";
import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import authConfig from "@/auth.config";
import { getAuthRedirectPath } from "@/lib/auth/route-policy";
import { routing } from "@/lib/i18n/routing";

/**
 * Negotiates the active locale per request and persists the choice in a cookie,
 * so a returning user lands on their previously selected language. The matcher
 * skips API routes, Next internals, and static assets — only page requests are
 * locale-scoped.
 */
const intlMiddleware = createMiddleware(routing);
const { auth } = NextAuth(authConfig);

export default auth((request) => {
  const redirectPath = getAuthRedirectPath({
    pathname: request.nextUrl.pathname,
    authenticated: Boolean(request.auth?.user),
  });

  if (redirectPath) {
    return NextResponse.redirect(new URL(redirectPath, request.nextUrl));
  }

  return intlMiddleware(request);
});

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
