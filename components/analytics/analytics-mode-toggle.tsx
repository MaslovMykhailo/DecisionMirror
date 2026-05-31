"use client";

import { useTranslations } from "next-intl";

import type { DashboardMode } from "@/lib/analytics/dashboard";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { captureClientEvent } from "@/lib/observability/capture-client";
import { cn } from "@/lib/utils";

const MODES: readonly DashboardMode[] = ["latest", "all"];

/**
 * Segmented toggle for the dashboard aggregation mode. Switching navigates to the same
 * route with the updated `?mode=` param (so the server component re-aggregates and a
 * refresh preserves the choice) and emits the privacy-safe `dashboard_mode_changed` event.
 */
export function AnalyticsModeToggle({ mode }: { mode: DashboardMode }) {
  const t = useTranslations("AnalyticsDashboard");
  const router = useRouter();
  const pathname = usePathname();

  const labelFor = (value: DashboardMode) => (value === "latest" ? t("modeLatest") : t("modeAll"));

  return (
    <div
      role="group"
      aria-label={t("modeLabel")}
      className="border-input bg-muted/40 inline-flex w-fit rounded-md border p-0.5"
    >
      {MODES.map((value) => {
        const active = value === mode;
        return (
          <button
            key={value}
            type="button"
            aria-pressed={active}
            data-mode={value}
            onClick={() => {
              if (active) return;
              captureClientEvent("dashboard_mode_changed", { mode: value });
              router.replace(`${pathname}?mode=${value}`);
            }}
            className={cn(
              "rounded-sm px-3 py-1 text-sm font-medium transition-colors",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {labelFor(value)}
          </button>
        );
      })}
    </div>
  );
}
