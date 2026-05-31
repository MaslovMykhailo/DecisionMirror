"use client";

import { BarChart3, History, Home } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { LogoutButton } from "@/components/auth/logout-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { logoutAction } from "@/lib/auth/actions";
import { Link, usePathname } from "@/lib/i18n/navigation";

/**
 * Shared, responsive navigation bar mounted on every authenticated page. It
 * provides the way back to the home/capture page (the app name) plus the
 * dashboard and history destinations and the language, theme, and logout
 * controls. The active destination is reflected with `aria-current="page"`,
 * derived from the locale-aware pathname.
 */
export function AppNav() {
  const t = useTranslations("Common");
  const navT = useTranslations("Nav");
  const locale = useLocale();
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isHistory = pathname === "/decisions" || pathname.startsWith("/decisions/");
  const isDashboard = pathname === "/analytics" || pathname.startsWith("/analytics/");

  return (
    <nav
      aria-label={t("appName")}
      className="flex flex-wrap items-center justify-between gap-2 border-b pb-5"
    >
      <Link
        href="/"
        aria-label={navT("home")}
        aria-current={isHome ? "page" : undefined}
        className="font-heading focus-visible:ring-ring inline-flex items-center gap-2 rounded-md text-xl font-semibold outline-none focus-visible:ring-[3px] aria-[current=page]:underline"
      >
        <Home className="size-5" aria-hidden="true" />
        {t("appName")}
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant={isDashboard ? "default" : "outline"} size="sm">
          <Link href="/analytics" aria-current={isDashboard ? "page" : undefined}>
            <BarChart3 />
            <span className="sr-only sm:not-sr-only">{navT("dashboard")}</span>
          </Link>
        </Button>
        <Button asChild variant={isHistory ? "default" : "outline"} size="sm">
          <Link href="/decisions" aria-current={isHistory ? "page" : undefined}>
            <History />
            <span className="sr-only sm:not-sr-only">{navT("history")}</span>
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 self-end">
        <ThemeToggle />
        <LanguageSwitcher />
        <LogoutButton action={logoutAction} redirectTo={`/${locale}/login`} />
      </div>
    </nav>
  );
}
