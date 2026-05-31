import { useTranslations } from "next-intl";

import { AnalyticsModeToggle } from "@/components/analytics/analytics-mode-toggle";
import { AnalyticsDashboardCharts } from "@/components/analytics/dashboard-charts";
import type { AnalyticsDashboardResult, DashboardMode } from "@/lib/analytics/dashboard";

type SuccessfulAnalyticsDashboard = Extract<AnalyticsDashboardResult, { status: "success" }>;

type AnalyticsDashboardViewProps = {
  dashboard: SuccessfulAnalyticsDashboard;
  mode: DashboardMode;
};

export function AnalyticsDashboardView({ dashboard, mode }: AnalyticsDashboardViewProps) {
  const t = useTranslations("AnalyticsDashboard");

  return (
    <section className="grid gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground max-w-2xl text-sm">{t("description")}</p>
        <AnalyticsModeToggle mode={mode} />
      </header>

      {dashboard.isEmpty ? (
        <div className="border-border bg-muted/20 grid gap-2 rounded-md border px-4 py-6">
          <h2 className="font-heading text-lg font-semibold">{t("emptyTitle")}</h2>
          <p className="text-muted-foreground text-sm">{t("emptyDescription")}</p>
        </div>
      ) : (
        <AnalyticsDashboardCharts
          categoryFrequency={dashboard.categoryFrequency}
          biasFrequency={dashboard.biasFrequency}
        />
      )}
    </section>
  );
}
