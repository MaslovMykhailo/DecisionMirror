import { cleanup, render, screen, within } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyticsDashboardCharts } from "@/components/analytics/dashboard-charts";

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  BarChart: ({
    children,
    data,
    layout,
  }: {
    children: React.ReactNode;
    data: unknown[];
    layout?: string;
  }) => (
    <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)} data-layout={layout}>
      {children}
    </div>
  ),
  CartesianGrid: ({ stroke }: { stroke?: string }) => (
    <div data-testid="cartesian-grid" data-stroke={stroke} />
  ),
  XAxis: ({ stroke, tick, type }: { stroke?: string; tick?: { fill?: string }; type?: string }) => (
    <div data-testid="x-axis" data-stroke={stroke} data-tick-fill={tick?.fill} data-type={type} />
  ),
  YAxis: ({ stroke, tick, type }: { stroke?: string; tick?: { fill?: string }; type?: string }) => (
    <div data-testid="y-axis" data-stroke={stroke} data-tick-fill={tick?.fill} data-type={type} />
  ),
  Tooltip: ({
    contentStyle,
    itemStyle,
    labelStyle,
  }: {
    contentStyle?: React.CSSProperties;
    itemStyle?: React.CSSProperties;
    labelStyle?: React.CSSProperties;
  }) => (
    <div
      data-testid="tooltip"
      data-background={String(contentStyle?.backgroundColor)}
      data-border={String(contentStyle?.border)}
      data-color={String(itemStyle?.color)}
      data-label-color={String(labelStyle?.color)}
    />
  ),
  Bar: ({ children, dataKey }: { children: React.ReactNode; dataKey?: string }) => (
    <div data-testid="bar" data-data-key={dataKey}>
      {children}
    </div>
  ),
  Cell: ({ fill }: { fill?: string }) => <span data-testid="cell" data-fill={fill} />,
}));

const messages = {
  AnalyticsDashboard: {
    title: "Decision dashboard",
    description: "Patterns across ready analyses.",
    categoryChartTitle: "Category frequency",
    categoryChartDescription: "Ready analyses grouped by decision category.",
    biasChartTitle: "Cognitive-bias frequency",
    biasChartDescription: "Biases found across ready analyses.",
    countLabel: "{count, plural, one {# analysis} other {# analyses}}",
  },
  Taxonomy: {
    category: {
      career: "Career",
      finance: "Finance",
      relationships: "Relationships",
      health: "Health",
      education: "Education",
      business: "Business",
      lifestyle: "Lifestyle",
      other: "Other",
    },
    bias: {
      anchoring: "Anchoring",
      confirmation_bias: "Confirmation bias",
      sunk_cost_fallacy: "Sunk cost fallacy",
      overconfidence: "Overconfidence",
      availability_heuristic: "Availability heuristic",
      loss_aversion: "Loss aversion",
      status_quo_bias: "Status quo bias",
      optimism_bias: "Optimism bias",
    },
  },
};

function renderWithIntl(component: React.ReactNode) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {component}
    </NextIntlClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("analytics dashboard charts", () => {
  it("renders localized category and bias labels for chart rows", () => {
    renderWithIntl(
      <AnalyticsDashboardCharts
        categoryFrequency={[
          { category: "career", count: 2 },
          { category: "finance", count: 1 },
        ]}
        biasFrequency={[
          { bias: "anchoring", count: 3 },
          { bias: "confirmation_bias", count: 1 },
        ]}
      />,
    );

    expect(screen.getByRole("heading", { name: "Category frequency" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Cognitive-bias frequency" })).toBeDefined();

    const categorySummary = screen.getByTestId("category-frequency-summary");
    expect(within(categorySummary).getByText("Career")).toBeDefined();
    expect(within(categorySummary).getByText("Finance")).toBeDefined();
    expect(within(categorySummary).getByText("2 analyses")).toBeDefined();
    expect(within(categorySummary).getByText("1 analysis")).toBeDefined();

    const biasSummary = screen.getByTestId("bias-frequency-summary");
    expect(within(biasSummary).getByText("Anchoring")).toBeDefined();
    expect(within(biasSummary).getByText("Confirmation bias")).toBeDefined();
    expect(within(biasSummary).getByText("3 analyses")).toBeDefined();
  });

  it("uses Recharts primitives with semantic and chart color tokens", () => {
    renderWithIntl(
      <AnalyticsDashboardCharts
        categoryFrequency={[
          { category: "career", count: 2 },
          { category: "finance", count: 1 },
        ]}
        biasFrequency={[{ bias: "anchoring", count: 3 }]}
      />,
    );

    expect(screen.getAllByTestId("responsive-container")).toHaveLength(2);
    expect(screen.getAllByTestId("bar-chart").map((chart) => chart.dataset.layout)).toEqual([
      "vertical",
      "vertical",
    ]);
    expect(screen.getAllByTestId("bar").map((bar) => bar.dataset.dataKey)).toEqual([
      "count",
      "count",
    ]);
    expect(screen.getAllByTestId("cartesian-grid")[0]?.dataset.stroke).toBe("var(--color-border)");
    expect(screen.getAllByTestId("x-axis")[0]?.dataset.tickFill).toBe(
      "var(--color-muted-foreground)",
    );
    expect(screen.getAllByTestId("y-axis")[0]?.dataset.tickFill).toBe(
      "var(--color-muted-foreground)",
    );
    expect(screen.getAllByTestId("tooltip")[0]?.dataset.background).toBe("var(--popover)");
    expect(screen.getAllByTestId("tooltip")[0]?.dataset.color).toBe("var(--popover-foreground)");
    expect(screen.getAllByTestId("cell").map((cell) => cell.dataset.fill)).toEqual([
      "var(--color-chart-1)",
      "var(--color-chart-2)",
      "var(--color-chart-1)",
    ]);
  });
});
