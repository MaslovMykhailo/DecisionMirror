import { describe, expect, it, vi } from "vitest";

import { getDecisionHistoryList } from "@/lib/decisions/history";

const authenticated = { authenticated: true as const, userId: "user_session" };
const createdAt = new Date("2026-05-30T12:00:00.000Z");
const updatedAt = new Date("2026-05-30T12:05:00.000Z");

describe("decision history list read model", () => {
  it("queries decisions scoped to the session user", async () => {
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    await getDecisionHistoryList({ getUser: async () => authenticated, db });

    expect(db.decision.findMany).toHaveBeenCalledWith({
      where: { userId: "user_session" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        situation: true,
        decision: true,
        reasoning: true,
        createdAt: true,
        updatedAt: true,
        analyses: {
          orderBy: { version: "desc" },
          select: {
            id: true,
            version: true,
            status: true,
            category: true,
            failureReason: true,
            updatedAt: true,
          },
        },
      },
    });
  });

  it("returns empty results for an authenticated user with no decisions", async () => {
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    await expect(
      getDecisionHistoryList({ getUser: async () => authenticated, db }),
    ).resolves.toEqual({
      status: "success",
      decisions: [],
    });
  });

  it("returns a trimmed summary, newest analysis status, and newest ready category", async () => {
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "decision_1",
            situation: "  Choosing between a stable role and a startup  ",
            decision: "  Accept the startup offer because the product mission fits.  ",
            reasoning: null,
            createdAt,
            updatedAt,
            analyses: [
              {
                id: "analysis_2",
                version: 2,
                status: "processing",
                category: null,
                failureReason: null,
                updatedAt,
              },
              {
                id: "analysis_1",
                version: 1,
                status: "ready",
                category: "career",
                failureReason: null,
                updatedAt: createdAt,
              },
            ],
          },
        ]),
      },
    };

    await expect(
      getDecisionHistoryList({
        getUser: async () => authenticated,
        db,
        now: () => updatedAt,
      }),
    ).resolves.toEqual({
      status: "success",
      decisions: [
        {
          id: "decision_1",
          summary: "Accept the startup offer because the product mission fits.",
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
          newestAnalysis: {
            analysisId: "analysis_2",
            version: 2,
            status: "processing",
            updatedAt: updatedAt.toISOString(),
            isStalled: false,
            retryable: false,
          },
          newestReadyCategory: "career",
        },
      ],
    });
  });

  it("marks stale processing list rows as stalled and retryable", async () => {
    const staleUpdatedAt = new Date("2026-05-30T11:49:59.000Z");
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "decision_1",
            situation: "  Choosing between a stable role and a startup  ",
            decision: "  Accept the startup offer.  ",
            reasoning: null,
            createdAt,
            updatedAt,
            analyses: [
              {
                id: "analysis_stalled",
                version: 2,
                status: "processing",
                category: null,
                failureReason: null,
                updatedAt: staleUpdatedAt,
              },
            ],
          },
        ]),
      },
    };

    const result = await getDecisionHistoryList({
      getUser: async () => authenticated,
      db,
      now: () => updatedAt,
      stalledTimeoutMs: 10 * 60 * 1000,
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.decisions[0]?.newestAnalysis).toEqual({
      analysisId: "analysis_stalled",
      version: 2,
      status: "processing",
      updatedAt: staleUpdatedAt.toISOString(),
      isStalled: true,
      retryable: true,
    });
  });
});
