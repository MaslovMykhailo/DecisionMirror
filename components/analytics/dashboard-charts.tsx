"use client";

import type { CSSProperties } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTranslations } from "next-intl";

import type { DashboardBiasFrequency, DashboardCategoryFrequency } from "@/lib/analytics/dashboard";
import { useTaxonomyLabels } from "@/lib/i18n/taxonomy-labels";

type AnalyticsDashboardChartsProps = {
  categoryFrequency: DashboardCategoryFrequency[];
  biasFrequency: DashboardBiasFrequency[];
};

type ChartRow = {
  id: string;
  label: string;
  count: number;
  fill: string;
};

const chartFills = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
] as const;

const axisTick = {
  fill: "var(--color-muted-foreground)",
  fontSize: 12,
} satisfies CSSProperties;

const tooltipSurface = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--popover-foreground)",
} satisfies CSSProperties;

const tooltipText = {
  color: "var(--popover-foreground)",
} satisfies CSSProperties;

function fillForIndex(index: number) {
  return chartFills[index % chartFills.length] ?? "var(--color-chart-1)";
}

function FrequencyChart({
  title,
  description,
  rows,
  summaryTestId,
}: {
  title: string;
  description: string;
  rows: ChartRow[];
  summaryTestId: string;
}) {
  const t = useTranslations("AnalyticsDashboard");
  const chartHeight = Math.max(220, rows.length * 48 + 72);

  return (
    <article className="border-border bg-background grid gap-4 rounded-md border p-4">
      <header className="grid gap-1">
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <p className="text-muted-foreground text-sm">{description}</p>
      </header>

      <div role="img" aria-label={title} className="h-full min-h-56 w-full">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 8, right: 16, bottom: 8, left: 8 }}
            barCategoryGap={12}
          >
            <CartesianGrid stroke="var(--color-border)" horizontal={false} />
            <XAxis
              type="number"
              stroke="var(--color-border)"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <YAxis
              type="category"
              dataKey="label"
              stroke="var(--color-border)"
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              width={132}
            />
            <Tooltip
              cursor={{ fill: "var(--color-muted)" }}
              contentStyle={tooltipSurface}
              itemStyle={tooltipText}
              labelStyle={tooltipText}
            />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={28}>
              {rows.map((row) => (
                <Cell key={row.id} fill={row.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul data-testid={summaryTestId} className="grid gap-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-foreground min-w-0 truncate">{row.label}</span>
            <span className="text-muted-foreground shrink-0">
              {t("countLabel", { count: row.count })}
            </span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export function AnalyticsDashboardCharts({
  categoryFrequency,
  biasFrequency,
}: AnalyticsDashboardChartsProps) {
  const t = useTranslations("AnalyticsDashboard");
  const labels = useTaxonomyLabels();
  const categoryRows = categoryFrequency.map((row, index) => ({
    id: row.category,
    label: labels.category(row.category),
    count: row.count,
    fill: fillForIndex(index),
  }));
  const biasRows = biasFrequency.map((row, index) => ({
    id: row.bias,
    label: labels.bias(row.bias),
    count: row.count,
    fill: fillForIndex(index),
  }));

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <FrequencyChart
        title={t("categoryChartTitle")}
        description={t("categoryChartDescription")}
        rows={categoryRows}
        summaryTestId="category-frequency-summary"
      />
      <FrequencyChart
        title={t("biasChartTitle")}
        description={t("biasChartDescription")}
        rows={biasRows}
        summaryTestId="bias-frequency-summary"
      />
    </section>
  );
}
