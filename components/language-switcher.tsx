"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";

import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { routing } from "@/lib/i18n/routing";
import type { Locale } from "@/lib/i18n/routing";
import { captureClientEvent } from "@/lib/observability/capture-client";
import { cn } from "@/lib/utils";

/**
 * Switches the active interface language. The navigation router updates the
 * locale segment and next-intl persists the choice in the locale cookie, so the
 * preference survives across sessions.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <select
      value={locale}
      disabled={isPending}
      aria-label={t("label")}
      className={cn("border-input bg-background h-9 rounded-md border px-2 text-sm", className)}
      onChange={(event) => {
        const nextLocale = event.target.value as Locale;
        captureClientEvent("locale_switched", { from: locale, to: nextLocale });
        startTransition(() => {
          router.replace(pathname, { locale: nextLocale });
        });
      }}
    >
      {routing.locales.map((option) => (
        <option key={option} value={option}>
          {t(option)}
        </option>
      ))}
    </select>
  );
}
