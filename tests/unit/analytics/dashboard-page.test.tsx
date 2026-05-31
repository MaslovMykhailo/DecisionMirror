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
    mode,
  }: {
    dashboard: {
      categoryFrequency: unknown[];
      biasFrequency: unknown[];
      isEmpty: boolean;
    };
    mode: string;
  }) => (
    <div
      data-testid="analytics-dashboard-view"
      data-category-count={dashboard.categoryFrequency.length}
      data-bias-count={dashboard.biasFrequency.length}
      data-empty={String(dashboard.isEmpty)}
      data-mode={mode}
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
      mode: "latest",
    });
    const view = screen.getByTestId("analytics-dashboard-view");
    expect(view.dataset.categoryCount).toBe("1");
    expect(view.dataset.biasCount).toBe("1");
    expect(view.dataset.empty).toBe("false");
    expect(view.dataset.mode).toBe("latest");
  });

  it("reads the mode from searchParams and passes it to the read model and view", async () => {
    getAnalyticsDashboard.mockResolvedValue({
      status: "success",
      categoryFrequency: [],
      biasFrequency: [],
      isEmpty: true,
    });

    const { default: AnalyticsDashboardPage } = await import("@/app/[locale]/analytics/page");
    render(await AnalyticsDashboardPage({ searchParams: Promise.resolve({ mode: "all" }) }));

    expect(getAnalyticsDashboard).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
      mode: "all",
    });
    expect(screen.getByTestId("analytics-dashboard-view").dataset.mode).toBe("all");
  });

  it("falls back to latest mode when searchParams carries an unrecognized mode", async () => {
    getAnalyticsDashboard.mockResolvedValue({
      status: "success",
      categoryFrequency: [],
      biasFrequency: [],
      isEmpty: true,
    });

    const { default: AnalyticsDashboardPage } = await import("@/app/[locale]/analytics/page");
    render(await AnalyticsDashboardPage({ searchParams: Promise.resolve({ mode: "bogus" }) }));

    expect(getAnalyticsDashboard).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
      mode: "latest",
    });
    expect(screen.getByTestId("analytics-dashboard-view").dataset.mode).toBe("latest");
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
