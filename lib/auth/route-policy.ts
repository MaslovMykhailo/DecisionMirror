import { routing } from "@/lib/i18n/routing";

const publicAuthSegments = new Set(["login", "signup"]);

function pathSegments(pathname: string): string[] {
  return pathname.split("/").filter(Boolean);
}

function localeFromPath(pathname: string): string | null {
  const [maybeLocale] = pathSegments(pathname);
  return routing.locales.includes(maybeLocale as (typeof routing.locales)[number])
    ? (maybeLocale ?? null)
    : null;
}

export function isPublicAuthPath(pathname: string): boolean {
  const [, segment] = pathSegments(pathname);
  return publicAuthSegments.has(segment ?? "");
}

export function getAuthRedirectPath({
  pathname,
  authenticated,
}: {
  pathname: string;
  authenticated: boolean;
}): string | null {
  if (authenticated) return null;
  if (pathname.startsWith("/api/auth")) return null;
  if (isPublicAuthPath(pathname)) return null;

  const locale = localeFromPath(pathname);
  if (!locale) return null;

  return `/${locale}/login`;
}
