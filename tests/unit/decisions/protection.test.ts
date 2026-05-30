import { describe, expect, it, vi } from "vitest";

import {
  createDecision,
  getDashboardAggregation,
  getDecisionDetails,
  reanalyzeDecision,
  recallDecisionMemory,
  retryDecisionAnalysis,
} from "@/lib/decisions/service";

const authenticated = { authenticated: true as const, userId: "user_session" };
const unauthenticated = { authenticated: false as const, reason: "unauthenticated" as const };

describe("protected decision access", () => {
  it("denies unauthenticated decision creation before persistence", async () => {
    const db = {
      decision: { create: vi.fn() },
      analysis: { create: vi.fn() },
    };

    await expect(
      createDecision(
        { situation: "Situation", decision: "Decision" },
        { getUser: async () => unauthenticated, db },
      ),
    ).resolves.toEqual({ status: "unauthenticated" });

    expect(db.decision.create).not.toHaveBeenCalled();
    expect(db.analysis.create).not.toHaveBeenCalled();
  });

  it("creates decisions with the session user ID and ignores client-supplied owners", async () => {
    const db = {
      decision: { create: vi.fn().mockResolvedValue({ id: "decision_1" }) },
      analysis: { create: vi.fn().mockResolvedValue({ id: "analysis_1" }) },
    };

    await expect(
      createDecision(
        {
          situation: "Situation",
          decision: "Decision",
          reasoning: "Reasoning",
          userId: "attacker",
          ownerId: "attacker",
        },
        { getUser: async () => authenticated, db },
      ),
    ).resolves.toEqual({
      status: "success",
      decisionId: "decision_1",
      analysisId: "analysis_1",
    });

    expect(db.decision.create).toHaveBeenCalledWith({
      data: {
        userId: "user_session",
        situation: "Situation",
        decision: "Decision",
        reasoning: "Reasoning",
      },
      select: { id: true },
    });
    expect(db.analysis.create).toHaveBeenCalledWith({
      data: {
        decisionId: "decision_1",
        version: 1,
        status: "processing",
      },
      select: { id: true },
    });
  });

  it("scopes decision reads to the session user", async () => {
    const db = {
      decision: { findFirst: vi.fn().mockResolvedValue(null) },
    };

    await expect(
      getDecisionDetails("decision_other", { getUser: async () => authenticated, db }),
    ).resolves.toEqual({ status: "not_found" });

    expect(db.decision.findFirst).toHaveBeenCalledWith({
      where: { id: "decision_other", userId: "user_session" },
      include: { analyses: true },
    });
  });

  it("denies cross-user retry and re-analysis before mutating analyses", async () => {
    const db = {
      decision: { findFirst: vi.fn().mockResolvedValue(null) },
      analysis: {
        findFirst: vi.fn(),
        update: vi.fn(),
        aggregate: vi.fn(),
        create: vi.fn(),
      },
    };

    await expect(
      retryDecisionAnalysis("decision_other", { getUser: async () => authenticated, db }),
    ).resolves.toEqual({ status: "not_found" });
    await expect(
      reanalyzeDecision("decision_other", { getUser: async () => authenticated, db }),
    ).resolves.toEqual({ status: "not_found" });

    expect(db.decision.findFirst).toHaveBeenCalledWith({
      where: { id: "decision_other", userId: "user_session" },
      select: { id: true },
    });
    expect(db.analysis.update).not.toHaveBeenCalled();
    expect(db.analysis.create).not.toHaveBeenCalled();
  });

  it("scopes dashboard aggregation and memory recall to the session user", async () => {
    const db = {
      analysis: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const memoryStore = {
      recall: vi.fn().mockResolvedValue([]),
    };

    await getDashboardAggregation({ getUser: async () => authenticated, db });
    await recallDecisionMemory("decision_1", {
      getUser: async () => authenticated,
      memoryStore,
    });

    expect(db.analysis.findMany).toHaveBeenCalledWith({
      where: { decision: { userId: "user_session" }, status: "ready" },
      select: { category: true },
    });
    expect(memoryStore.recall).toHaveBeenCalledWith({
      decisionId: "decision_1",
      userId: "user_session",
    });
  });
});
