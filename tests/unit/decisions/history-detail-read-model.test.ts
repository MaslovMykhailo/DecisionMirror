import { describe, expect, it, vi } from "vitest";

import { getDecisionHistoryDetail } from "@/lib/decisions/history";
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
    updatedAt,
    ...overrides,
  };
}

function decisionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "decision_1",
    situation: "Choosing between a stable role and a startup",
    decision: "Accept the startup offer",
    reasoning: "The product mission fits my long-term goals.",
    createdAt,
    updatedAt,
    analyses: [readyAnalysis()],
    ...overrides,
  };
}

describe("decision history detail read model", () => {
  it("queries a single decision scoped to the session user", async () => {
    const db = {
      decision: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    await getDecisionHistoryDetail("decision_other", { getUser: async () => authenticated, db });

    expect(db.decision.findFirst).toHaveBeenCalledWith({
      where: { id: "decision_other", userId: "user_session" },
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

  it("returns original input, newest status, and newest ready result", async () => {
    const db = {
      decision: {
        findFirst: vi.fn().mockResolvedValue(decisionRow()),
      },
    };

    await expect(
      getDecisionHistoryDetail("decision_1", { getUser: async () => authenticated, db }),
    ).resolves.toEqual({
      status: "success",
      decision: {
        id: "decision_1",
        situation: "Choosing between a stable role and a startup",
        decision: "Accept the startup offer",
        reasoning: "The product mission fits my long-term goals.",
        createdAt: createdAt.toISOString(),
        updatedAt: updatedAt.toISOString(),
      },
      newestAnalysis: {
        analysisId: "analysis_ready",
        version: 1,
        status: "ready",
        updatedAt: updatedAt.toISOString(),
      },
      readyAnalysis: {
        analysisId: "analysis_ready",
        version: 1,
        updatedAt: updatedAt.toISOString(),
        result: validAnalysisOutput,
      },
    });
  });

  it("returns failed reason from the newest failed analysis", async () => {
    const db = {
      decision: {
        findFirst: vi.fn().mockResolvedValue(
          decisionRow({
            analyses: [
              readyAnalysis({
                id: "analysis_failed",
                version: 2,
                status: "failed",
                category: null,
                biases: null,
                missedAlternatives: null,
                premortemRisks: null,
                keyAssumptions: null,
                warningSigns: null,
                failureReason: "The structured output did not match the contract.",
              }),
              readyAnalysis(),
            ],
          }),
        ),
      },
    };

    const result = await getDecisionHistoryDetail("decision_1", {
      getUser: async () => authenticated,
      db,
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.newestAnalysis).toEqual({
      analysisId: "analysis_failed",
      version: 2,
      status: "failed",
      updatedAt: updatedAt.toISOString(),
      failureReason: "The structured output did not match the contract.",
    });
    expect(result.readyAnalysis?.analysisId).toBe("analysis_ready");
  });

  it("represents processing without a ready result", async () => {
    const db = {
      decision: {
        findFirst: vi.fn().mockResolvedValue(
          decisionRow({
            analyses: [
              readyAnalysis({
                id: "analysis_processing",
                version: 1,
                status: "processing",
                category: null,
                biases: null,
                missedAlternatives: null,
                premortemRisks: null,
                keyAssumptions: null,
                warningSigns: null,
              }),
            ],
          }),
        ),
      },
    };

    const result = await getDecisionHistoryDetail("decision_1", {
      getUser: async () => authenticated,
      db,
    });

    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.newestAnalysis?.status).toBe("processing");
    expect(result.readyAnalysis).toBeNull();
  });

  it("denies cross-user detail reads as not found", async () => {
    const db = {
      decision: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      getDecisionHistoryDetail("decision_other", { getUser: async () => authenticated, db }),
    ).resolves.toEqual({ status: "not_found" });
  });
});
