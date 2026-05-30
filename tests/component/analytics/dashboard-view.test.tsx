import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AnalyticsDashboardView } from "@/components/analytics/dashboard-view";

vi.mock("@/components/analytics/dashboard-charts", () => ({
  AnalyticsDashboardCharts: ({
    categoryFrequency,
    biasFrequency,
  }: {
    categoryFrequency: unknown[];
    biasFrequency: unknown[];
  }) => (
    <div
      data-testid="analytics-dashboard-charts"
      data-category-count={categoryFrequency.length}
      data-bias-count={biasFrequency.length}
    />
  ),
}));

const messages = {
  AnalyticsDashboard: {
    title: "Decision dashboard",
    description: "Patterns across ready analyses.",
    emptyTitle: "No ready analyses yet",
    emptyDescription: "Completed analyses will appear here once decisions finish processing.",
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

describe("analytics dashboard view", () => {
  it("renders an explicit empty state when the read model has no ready-analysis data", () => {
    renderWithIntl(
      <AnalyticsDashboardView
        dashboard={{
          status: "success",
          categoryFrequency: [],
          biasFrequency: [],
          isEmpty: true,
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "Decision dashboard" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "No ready analyses yet" })).toBeDefined();
    expect(
      screen.getByText("Completed analyses will appear here once decisions finish processing."),
    ).toBeDefined();
    expect(screen.queryByTestId("analytics-dashboard-charts")).toBeNull();
  });

  it("renders charts when aggregation data is present", () => {
    renderWithIntl(
      <AnalyticsDashboardView
        dashboard={{
          status: "success",
          categoryFrequency: [{ category: "career", count: 2 }],
          biasFrequency: [{ bias: "anchoring", count: 1 }],
          isEmpty: false,
        }}
      />,
    );

    const charts = screen.getByTestId("analytics-dashboard-charts");
    expect(charts.dataset.categoryCount).toBe("1");
    expect(charts.dataset.biasCount).toBe("1");
    expect(screen.queryByRole("heading", { name: "No ready analyses yet" })).toBeNull();
  });
});
