import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getAuthenticatedUserId = vi.fn();
const getDecisionHistoryDetail = vi.fn();

vi.mock("@/lib/auth/server-session", () => ({ getAuthenticatedUserId }));
vi.mock("@/lib/decisions/history", () => ({ getDecisionHistoryDetail }));
vi.mock("@/components/decisions/decision-detail-view", () => ({
  DecisionDetailView: ({ result }: { result: { status: string } }) => (
    <div data-testid="detail-view">{result.status}</div>
  ),
}));

afterEach(() => {
  vi.clearAllMocks();
});

describe("decision detail page", () => {
  it("loads the detail with the route decision id and authenticated user reader", async () => {
    getDecisionHistoryDetail.mockResolvedValue({ status: "not_found" });

    const { default: DecisionDetailPage } =
      await import("@/app/[locale]/decisions/[decisionId]/page");
    render(await DecisionDetailPage({ params: Promise.resolve({ decisionId: "decision_1" }) }));

    expect(getDecisionHistoryDetail).toHaveBeenCalledWith("decision_1", {
      getUser: getAuthenticatedUserId,
    });
    expect(screen.getByTestId("detail-view").textContent).toBe("not_found");
  });
});
