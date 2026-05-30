import { describe, expect, it, vi } from "vitest";

import { getAnalyticsDashboard } from "@/lib/analytics/dashboard";

const authenticated = { authenticated: true as const, userId: "user_session" };

function sqlFromCall(call: unknown[]) {
  return (call[0] as string[]).join("?");
}

describe("analytics dashboard read model", () => {
  it("runs server-side aggregation queries scoped to the authenticated user", async () => {
    const db = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([
          { category: "career", count: 2n },
          { category: "finance", count: 1n },
        ])
        .mockResolvedValueOnce([
          { bias: "anchoring", count: 2n },
          { bias: "confirmation_bias", count: 1n },
        ]),
    };

    await expect(
      getAnalyticsDashboard({ getUser: async () => authenticated, db }),
    ).resolves.toEqual({
      status: "success",
      categoryFrequency: [
        { category: "career", count: 2 },
        { category: "finance", count: 1 },
      ],
      biasFrequency: [
        { bias: "anchoring", count: 2 },
        { bias: "confirmation_bias", count: 1 },
      ],
      isEmpty: false,
    });

    expect(db.$queryRaw).toHaveBeenCalledTimes(2);
    expect(db.$queryRaw.mock.calls[0]?.slice(1)).toEqual(["user_session"]);
    expect(db.$queryRaw.mock.calls[1]?.slice(1)).toEqual(["user_session"]);

    const categorySql = sqlFromCall(db.$queryRaw.mock.calls[0] ?? []);
    expect(categorySql).toContain('FROM "Analysis"');
    expect(categorySql).toContain('INNER JOIN "Decision"');
    expect(categorySql).toContain('d."userId" = ?');
    expect(categorySql).toContain(`a."status" = 'ready'::"AnalysisStatus"`);
    expect(categorySql).toContain('a."category" IS NOT NULL');
    expect(categorySql).not.toContain('"situation"');
    expect(categorySql).not.toContain('"decision"');

    const biasSql = sqlFromCall(db.$queryRaw.mock.calls[1] ?? []);
    expect(biasSql).toContain('FROM "Analysis"');
    expect(biasSql).toContain('INNER JOIN "Decision"');
    expect(biasSql).toContain("jsonb_array_elements");
    expect(biasSql).toContain('d."userId" = ?');
    expect(biasSql).toContain(`a."status" = 'ready'::"AnalysisStatus"`);
    expect(biasSql).not.toContain('"situation"');
    expect(biasSql).not.toContain('"decision"');
  });

  it("sorts frequencies deterministically after dropping non-canonical rows", async () => {
    const db = {
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([
          { category: "recency", count: 10 },
          { category: "finance", count: "2" },
          { category: "career", count: 2n },
        ])
        .mockResolvedValueOnce([
          { bias: "not_a_bias", count: 20 },
          { bias: "confirmation_bias", count: 3n },
          { bias: "anchoring", count: 3n },
        ]),
    };

    await expect(
      getAnalyticsDashboard({ getUser: async () => authenticated, db }),
    ).resolves.toEqual({
      status: "success",
      categoryFrequency: [
        { category: "career", count: 2 },
        { category: "finance", count: 2 },
      ],
      biasFrequency: [
        { bias: "anchoring", count: 3 },
        { bias: "confirmation_bias", count: 3 },
      ],
      isEmpty: false,
    });
  });

  it("returns an empty success state when no ready analyses contribute to the dashboard", async () => {
    const db = {
      $queryRaw: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
    };

    await expect(
      getAnalyticsDashboard({ getUser: async () => authenticated, db }),
    ).resolves.toEqual({
      status: "success",
      categoryFrequency: [],
      biasFrequency: [],
      isEmpty: true,
    });
  });

  it("does not expose aggregation data when the user is unauthenticated", async () => {
    const db = {
      $queryRaw: vi.fn(),
    };

    await expect(
      getAnalyticsDashboard({
        getUser: async () => ({ authenticated: false, reason: "unauthenticated" }),
        db,
      }),
    ).resolves.toEqual({ status: "unauthenticated" });

    expect(db.$queryRaw).not.toHaveBeenCalled();
  });
});
