import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserId = vi.fn();
const getDecisionHistoryList = vi.fn();

vi.mock("@/lib/auth/server-session", () => ({ getAuthenticatedUserId }));
vi.mock("@/lib/decisions/history", () => ({ getDecisionHistoryList }));
vi.mock("@/components/decisions/decision-history-list", () => ({
  DecisionHistoryList: ({ decisions }: { decisions: unknown[] }) => (
    <div data-testid="history-list">{decisions.length}</div>
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

    expect(getDecisionHistoryList).toHaveBeenCalledWith({ getUser: getAuthenticatedUserId });
    expect(screen.getByTestId("history-list").textContent).toBe("1");
  });
});
