import { describe, expect, it, vi } from "vitest";

import { deriveDecisionComplexity, getDecisionHistoryList } from "@/lib/decisions/history";
import { validAnalysisOutput } from "@/tests/support/fixtures/analysis-output";

const authenticated = { authenticated: true as const, userId: "user_session" };
const createdAt = new Date("2026-05-30T12:00:00.000Z");
const updatedAt = new Date("2026-05-30T12:05:00.000Z");

function readyAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    id: "analysis_ready",
    version: 1,
    status: "ready",
    category: validAnalysisOutput.category,
    biases: validAnalysisOutput.biases,
    missedAlternatives: validAnalysisOutput.missedAlternatives,
    premortemRisks: validAnalysisOutput.premortemRisks,
    keyAssumptions: validAnalysisOutput.keyAssumptions,
    warningSigns: validAnalysisOutput.warningSigns,
    failureReason: null,
    updatedAt: createdAt,
    ...overrides,
  };
}

function processingAnalysis(overrides: Record<string, unknown> = {}) {
  return {
    id: "analysis_processing",
    version: 1,
    status: "processing",
    category: null,
    biases: null,
    missedAlternatives: null,
    premortemRisks: null,
    keyAssumptions: null,
    warningSigns: null,
    failureReason: null,
    updatedAt,
    ...overrides,
  };
}

function historyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "decision_1",
    situation: "Choosing between a stable role and a startup",
    decision: "Accept the startup offer.",
    reasoning: null,
    createdAt,
    updatedAt,
    analyses: [readyAnalysis()],
    ...overrides,
  };
}

describe("decision history list read model", () => {
  it("derives complexity from the analysis output contract", () => {
    expect(
      deriveDecisionComplexity({
        ...validAnalysisOutput,
        biases: [
          ...validAnalysisOutput.biases,
          {
            id: "loss_aversion",
            explanation: "Potential losses are dominating the trade-off.",
          },
        ],
        premortemRisks: [
          "The new role may not provide the autonomy promised.",
          "The manager may leave before the transition is complete.",
          "The compensation package may be less flexible than expected.",
        ],
        missedAlternatives: ["Negotiate a trial consulting project before resigning."],
      }),
    ).toBe(7);
  });

  it("returns null complexity when there is no ready analysis result", () => {
    expect(deriveDecisionComplexity(null)).toBeNull();
  });

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
            biases: true,
            missedAlternatives: true,
            premortemRisks: true,
            keyAssumptions: true,
            warningSigns: true,
            failureReason: true,
            updatedAt: true,
          },
        },
      },
    });
  });

  it("keeps filtered reads scoped to the session user", async () => {
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    await getDecisionHistoryList({
      getUser: async () => authenticated,
      db,
      filters: { category: "career", bias: "confirmation_bias" },
    });

    expect(db.decision.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user_session" } }),
    );
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
                biases: null,
                missedAlternatives: null,
                premortemRisks: null,
                keyAssumptions: null,
                warningSigns: null,
                failureReason: null,
                updatedAt,
              },
              readyAnalysis({
                id: "analysis_1",
                version: 1,
              }),
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
          complexity: 4,
        },
      ],
    });
  });

  it("derives complexity from an older ready analysis while keeping the newer status", async () => {
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "decision_1",
            situation: "Choosing between a stable role and a startup",
            decision: "Accept the startup offer.",
            reasoning: null,
            createdAt,
            updatedAt,
            analyses: [
              {
                id: "analysis_processing",
                version: 2,
                status: "processing",
                category: null,
                biases: null,
                missedAlternatives: null,
                premortemRisks: null,
                keyAssumptions: null,
                warningSigns: null,
                failureReason: null,
                updatedAt,
              },
              readyAnalysis({
                id: "analysis_ready",
                version: 1,
                biases: [
                  {
                    id: "anchoring",
                    explanation: "The first salary range is carrying too much weight.",
                  },
                  {
                    id: "confirmation_bias",
                    explanation: "Evidence against the preferred role needs more attention.",
                  },
                ],
                missedAlternatives: ["Negotiate a trial consulting project before resigning."],
                premortemRisks: [
                  "The new role may not provide the autonomy promised.",
                  "The hiring manager may leave before the transition is complete.",
                  "The team budget may be cut after onboarding.",
                ],
              }),
            ],
          },
        ]),
      },
    };

    const result = await getDecisionHistoryList({
      getUser: async () => authenticated,
      db,
      now: () => updatedAt,
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.decisions[0]?.newestAnalysis?.status).toBe("processing");
    expect(result.decisions[0]?.complexity).toBe(6);
  });

  it("filters decisions by newest ready analysis category", async () => {
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([
          historyRow({ id: "decision_career" }),
          historyRow({
            id: "decision_finance",
            analyses: [
              readyAnalysis({
                id: "analysis_finance",
                category: "finance",
              }),
            ],
          }),
          historyRow({
            id: "decision_processing",
            analyses: [
              {
                id: "analysis_processing",
                version: 1,
                status: "processing",
                category: null,
                biases: null,
                missedAlternatives: null,
                premortemRisks: null,
                keyAssumptions: null,
                warningSigns: null,
                failureReason: null,
                updatedAt,
              },
            ],
          }),
        ]),
      },
    };

    const result = await getDecisionHistoryList({
      getUser: async () => authenticated,
      db,
      filters: { category: "career", bias: null },
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.decisions.map((decision) => decision.id)).toEqual(["decision_career"]);
  });

  it("filters decisions by bias presence in the newest ready analysis", async () => {
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([
          historyRow({ id: "decision_matching" }),
          historyRow({
            id: "decision_other_bias",
            analyses: [
              readyAnalysis({
                id: "analysis_other_bias",
                biases: [
                  {
                    id: "loss_aversion",
                    explanation: "Potential losses are dominating the trade-off.",
                  },
                ],
              }),
            ],
          }),
        ]),
      },
    };

    const result = await getDecisionHistoryList({
      getUser: async () => authenticated,
      db,
      filters: { category: null, bias: "confirmation_bias" },
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.decisions.map((decision) => decision.id)).toEqual(["decision_matching"]);
  });

  it("combines category and bias filters against the newest ready analysis", async () => {
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([
          historyRow({ id: "decision_matching" }),
          historyRow({
            id: "decision_wrong_category",
            analyses: [
              readyAnalysis({
                id: "analysis_wrong_category",
                category: "finance",
              }),
            ],
          }),
          historyRow({
            id: "decision_wrong_bias",
            analyses: [
              readyAnalysis({
                id: "analysis_wrong_bias",
                biases: [
                  {
                    id: "loss_aversion",
                    explanation: "Potential losses are dominating the trade-off.",
                  },
                ],
              }),
            ],
          }),
        ]),
      },
    };

    const result = await getDecisionHistoryList({
      getUser: async () => authenticated,
      db,
      filters: { category: "career", bias: "confirmation_bias" },
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.decisions.map((decision) => decision.id)).toEqual(["decision_matching"]);
  });

  it("sorts decisions by creation time with no-ready decisions included", async () => {
    const olderCreatedAt = new Date("2026-05-30T10:00:00.000Z");
    const newerCreatedAt = new Date("2026-05-30T13:00:00.000Z");
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([
          historyRow({ id: "decision_older", createdAt: olderCreatedAt }),
          historyRow({
            id: "decision_newer_processing",
            createdAt: newerCreatedAt,
            analyses: [processingAnalysis()],
          }),
        ]),
      },
    };

    const result = await getDecisionHistoryList({
      getUser: async () => authenticated,
      db,
      sort: "created_at",
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.decisions.map((decision) => decision.id)).toEqual([
      "decision_newer_processing",
      "decision_older",
    ]);
  });

  it("sorts ready decisions by complexity and places no-ready decisions last", async () => {
    const highOlderCreatedAt = new Date("2026-05-30T10:00:00.000Z");
    const highNewerCreatedAt = new Date("2026-05-30T11:00:00.000Z");
    const lowCreatedAt = new Date("2026-05-30T12:00:00.000Z");
    const noReadyCreatedAt = new Date("2026-05-30T13:00:00.000Z");
    const db = {
      decision: {
        findMany: vi.fn().mockResolvedValue([
          historyRow({
            id: "decision_no_ready",
            createdAt: noReadyCreatedAt,
            analyses: [processingAnalysis()],
          }),
          historyRow({
            id: "decision_low",
            createdAt: lowCreatedAt,
            analyses: [
              readyAnalysis({
                id: "analysis_low",
                biases: [
                  {
                    id: "anchoring",
                    explanation: "The first salary range is carrying too much weight.",
                  },
                ],
                missedAlternatives: ["Negotiate a trial consulting project before resigning."],
                premortemRisks: ["The new role may not provide the autonomy promised."],
              }),
            ],
          }),
          historyRow({
            id: "decision_high_older",
            createdAt: highOlderCreatedAt,
            analyses: [
              readyAnalysis({
                id: "analysis_high_older",
                biases: [
                  {
                    id: "anchoring",
                    explanation: "The first salary range is carrying too much weight.",
                  },
                  {
                    id: "confirmation_bias",
                    explanation: "Evidence against the preferred role needs more attention.",
                  },
                  {
                    id: "loss_aversion",
                    explanation: "Potential losses are dominating the trade-off.",
                  },
                ],
                missedAlternatives: ["Negotiate a trial consulting project before resigning."],
                premortemRisks: [
                  "The new role may not provide the autonomy promised.",
                  "The hiring manager may leave before the transition is complete.",
                ],
              }),
            ],
          }),
          historyRow({
            id: "decision_high_newer",
            createdAt: highNewerCreatedAt,
            analyses: [
              readyAnalysis({
                id: "analysis_high_newer",
                biases: [
                  {
                    id: "anchoring",
                    explanation: "The first salary range is carrying too much weight.",
                  },
                  {
                    id: "confirmation_bias",
                    explanation: "Evidence against the preferred role needs more attention.",
                  },
                  {
                    id: "loss_aversion",
                    explanation: "Potential losses are dominating the trade-off.",
                  },
                ],
                missedAlternatives: ["Negotiate a trial consulting project before resigning."],
                premortemRisks: [
                  "The new role may not provide the autonomy promised.",
                  "The hiring manager may leave before the transition is complete.",
                ],
              }),
            ],
          }),
        ]),
      },
    };

    const result = await getDecisionHistoryList({
      getUser: async () => authenticated,
      db,
      sort: "complexity",
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.decisions.map((decision) => decision.id)).toEqual([
      "decision_high_newer",
      "decision_high_older",
      "decision_low",
      "decision_no_ready",
    ]);
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
