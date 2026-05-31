import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";

const { capture } = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock("posthog-js", () => ({ default: { capture, __loaded: true } }));

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));
vi.mock("@/lib/i18n/navigation", () => ({
  usePathname: () => "/analytics",
  useRouter: () => ({ replace }),
}));

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
    modeLabel: "Aggregation",
    modeLatest: "Latest",
    modeAll: "All versions",
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
        mode="latest"
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
        mode="latest"
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

  it("renders the mode toggle, marks the active mode, and navigates on switch", async () => {
    renderWithIntl(
      <AnalyticsDashboardView
        mode="latest"
        dashboard={{
          status: "success",
          categoryFrequency: [{ category: "career", count: 2 }],
          biasFrequency: [{ bias: "anchoring", count: 1 }],
          isEmpty: false,
        }}
      />,
    );

    const latest = screen.getByRole("button", { name: "Latest" });
    const all = screen.getByRole("button", { name: "All versions" });
    expect(latest.getAttribute("aria-pressed")).toBe("true");
    expect(all.getAttribute("aria-pressed")).toBe("false");

    await userEvent.click(all);

    expect(replace).toHaveBeenCalledWith("/analytics?mode=all");
  });
});
