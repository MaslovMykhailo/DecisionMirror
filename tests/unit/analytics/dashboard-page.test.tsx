import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserId = vi.fn();
const getAnalyticsDashboard = vi.fn();

vi.mock("@/lib/auth/server-session", () => ({ getAuthenticatedUserId }));
vi.mock("@/lib/analytics/dashboard", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/analytics/dashboard")>()),
  getAnalyticsDashboard,
}));
vi.mock("@/components/app-nav", () => ({ AppNav: () => <nav data-testid="app-nav" /> }));
vi.mock("@/components/analytics/dashboard-view", () => ({
  AnalyticsDashboardView: ({
    dashboard,
  }: {
    dashboard: {
      categoryFrequency: unknown[];
      biasFrequency: unknown[];
      isEmpty: boolean;
    };
  }) => (
    <div
      data-testid="analytics-dashboard-view"
      data-category-count={dashboard.categoryFrequency.length}
      data-bias-count={dashboard.biasFrequency.length}
      data-empty={String(dashboard.isEmpty)}
    />
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("analytics dashboard page", () => {
  it("loads the dashboard with the authenticated user reader", async () => {
    getAnalyticsDashboard.mockResolvedValue({
      status: "success",
      categoryFrequency: [{ category: "career", count: 2 }],
      biasFrequency: [{ bias: "anchoring", count: 1 }],
      isEmpty: false,
    });

    const { default: AnalyticsDashboardPage } = await import("@/app/[locale]/analytics/page");
    render(await AnalyticsDashboardPage());

    expect(getAnalyticsDashboard).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
    });
    const view = screen.getByTestId("analytics-dashboard-view");
    expect(view.dataset.categoryCount).toBe("1");
    expect(view.dataset.biasCount).toBe("1");
    expect(view.dataset.empty).toBe("false");
  });

  it("renders the empty dashboard state if auth is unavailable during page render", async () => {
    getAnalyticsDashboard.mockResolvedValue({ status: "unauthenticated" });

    const { default: AnalyticsDashboardPage } = await import("@/app/[locale]/analytics/page");
    render(await AnalyticsDashboardPage());

    const view = screen.getByTestId("analytics-dashboard-view");
    expect(view.dataset.categoryCount).toBe("0");
    expect(view.dataset.biasCount).toBe("0");
    expect(view.dataset.empty).toBe("true");
  });
});
