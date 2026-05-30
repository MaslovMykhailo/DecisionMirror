import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserId = vi.fn();
const getDecisionHistoryList = vi.fn();

vi.mock("@/lib/auth/server-session", () => ({ getAuthenticatedUserId }));
vi.mock("@/lib/decisions/history", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/decisions/history")>()),
  getDecisionHistoryList,
}));
vi.mock("@/components/decisions/decision-history-list", () => ({
  DecisionHistoryList: ({
    decisions,
    filters,
    sort,
  }: {
    decisions: unknown[];
    filters: { category: string | null; bias: string | null };
    sort: string;
  }) => (
    <div
      data-testid="history-list"
      data-category={filters.category ?? ""}
      data-bias={filters.bias ?? ""}
      data-sort={sort}
    >
      {decisions.length}
    </div>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("decision history page", () => {
  it("loads the history list with the authenticated user reader", async () => {
    getDecisionHistoryList.mockResolvedValue({
      status: "success",
      decisions: [{ id: "decision_1" }],
    });

    const { default: DecisionHistoryPage } = await import("@/app/[locale]/decisions/page");
    render(await DecisionHistoryPage());

    expect(getDecisionHistoryList).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
      filters: { category: null, bias: null },
      sort: "created_at",
    });
    expect(screen.getByTestId("history-list").textContent).toBe("1");
  });

  it("passes validated category and bias filters from search params", async () => {
    getDecisionHistoryList.mockResolvedValue({
      status: "success",
      decisions: [{ id: "decision_1" }],
    });

    const { default: DecisionHistoryPage } = await import("@/app/[locale]/decisions/page");
    render(
      await DecisionHistoryPage({
        searchParams: Promise.resolve({
          category: "career",
          bias: "confirmation_bias",
        }),
      }),
    );

    expect(getDecisionHistoryList).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
      filters: { category: "career", bias: "confirmation_bias" },
      sort: "created_at",
    });
    expect(screen.getByTestId("history-list").dataset.category).toBe("career");
    expect(screen.getByTestId("history-list").dataset.bias).toBe("confirmation_bias");
  });

  it("passes validated sort from search params", async () => {
    getDecisionHistoryList.mockResolvedValue({
      status: "success",
      decisions: [{ id: "decision_1" }],
    });

    const { default: DecisionHistoryPage } = await import("@/app/[locale]/decisions/page");
    render(
      await DecisionHistoryPage({
        searchParams: Promise.resolve({ sort: "complexity" }),
      }),
    );

    expect(getDecisionHistoryList).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
      filters: { category: null, bias: null },
      sort: "complexity",
    });
    expect(screen.getByTestId("history-list").dataset.sort).toBe("complexity");
  });

  it("ignores invalid filter search params", async () => {
    getDecisionHistoryList.mockResolvedValue({
      status: "success",
      decisions: [],
    });

    const { default: DecisionHistoryPage } = await import("@/app/[locale]/decisions/page");
    render(
      await DecisionHistoryPage({
        searchParams: Promise.resolve({
          category: "not_a_category",
          bias: "recency_bias",
        }),
      }),
    );

    expect(getDecisionHistoryList).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
      filters: { category: null, bias: null },
      sort: "created_at",
    });
  });

  it("falls back to creation-time sort for invalid sort params", async () => {
    getDecisionHistoryList.mockResolvedValue({
      status: "success",
      decisions: [],
    });

    const { default: DecisionHistoryPage } = await import("@/app/[locale]/decisions/page");
    render(
      await DecisionHistoryPage({
        searchParams: Promise.resolve({ sort: "unknown_sort" }),
      }),
    );

    expect(getDecisionHistoryList).toHaveBeenCalledWith({
      getUser: getAuthenticatedUserId,
      filters: { category: null, bias: null },
      sort: "created_at",
    });
  });
});
